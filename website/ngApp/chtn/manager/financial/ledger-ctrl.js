var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    var LedgerController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function LedgerController($http, siteInfo, appCacheService, uiGridConstants, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.uiGridConstants = uiGridConstants;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.isLoadingEntries = false;
            this.ledgerAccounts = [];
            this.categoryOptions = [];
            this.shouldShowAddTransaction = false;
            this.editAccount = null;
            this.editingTransaction = null;
            this.createAccountInfo = null;
            this.HistoryPageSize = 50;
            this.plaidHandler = null;
            this.newPlaidAccounts = [];
            this.hasPlaidAccounts = false;
            this.filter = new FilterCriteria();
            this.isPremiumPlanActive = false;
            this.ManageCategoriesDropId = -15;
            this.shouldShowCategoryEditModal = false;
            this.spendingChartData = null;
            this.spendingChartLabels = null;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        LedgerController.prototype.$onInit = function () {
            var _this = this;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.ledgerGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false },
                        { field: 'accountName', filter: {
                                type: this.uiGridConstants.filter.SELECT,
                                selectOptions: []
                            }, displayName: 'Account', enableCellEdit: false, width: 140, enableFiltering: true
                        },
                        { field: 'description', displayName: 'Description', enableCellEditOnFocus: true, enableFiltering: true, filter: { placeholder: "search" } },
                        { field: 'categoryDisplayName', editModelField: "financialCategoryId", displayName: 'Category', width: 170, editableCellTemplate: "ui-grid/dropdownEditor", editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'amount', displayName: 'Amount', width: 95, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: this.uiGridConstants.aggregationTypes.sum },
                        { field: 'id', displayName: 'Actions', enableSorting: false, enableCellEdit: false, enableFiltering: false, width: 90, cellTemplate: '<div class="ui-grid-cell-contents text-center"><img style="cursor: pointer;" data-ng-click="grid.appScope.$ctrl.editEntry( row.entity )" src="/assets/images/pencil-active.png" /><span class="close-x mt-0 mb-0 ml-3" style="color: red;">&times;</span></div>' }
                    ],
                    enableFiltering: true,
                    enableSorting: true,
                    showColumnFooter: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: true,
                    paginationPageSize: this.HistoryPageSize,
                    paginationPageSizes: [this.HistoryPageSize],
                    enableRowHeaderSelection: false,
                    onRegisterApi: function (gridApi) {
                        _this.ledgerGridApi = gridApi;
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                        gridApi.edit.on.afterCellEdit(_this.$rootScope, function (rowEntity, colDef, newValue, oldValue) {
                            console.log('edited row id:' + rowEntity.amount + ' Column:' + colDef + ' newValue:' + newValue + ' oldValue:' + oldValue);
                            // Ignore no changes
                            if (oldValue === newValue)
                                return;
                            if (colDef.field === "categoryDisplayName" && rowEntity.financialCategoryId === _this.ManageCategoriesDropId) {
                                rowEntity.financialCategoryId = oldValue;
                                _this.shouldShowCategoryEditModal = true;
                                return;
                            }
                            var catEntry = _this.flatCategoryList.filter(function (c) { return c.financialCategoryId === rowEntity.financialCategoryId; });
                            if (catEntry && catEntry.length > 0)
                                rowEntity.categoryDisplayName = catEntry[0].displayName;
                            _this.$http.put("/api/Ledger/UpdateEntry", rowEntity).then(function () { return _this.regenerateDateDonutChart(); });
                            //vm.msg.lastCellEdited = 'edited row id:' + rowEntity.id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue;
                            //$scope.$apply();
                        });
                    }
                };
            var preselectStartMillis = parseInt(this.appCacheService.getAndClear("ledger_preselect_start"));
            if (!isNaN(preselectStartMillis)) {
                this.filter.startDate = new Date(preselectStartMillis);
                var preselectEndMillis = parseInt(this.appCacheService.getAndClear("ledger_preselect_end"));
                this.filter.endDate = new Date(preselectEndMillis);
                this.preselectCategoryId = parseInt(this.appCacheService.getAndClear("ledger_preselect_categoryId"));
                if (isNaN(this.preselectCategoryId))
                    this.preselectCategoryId = undefined;
            }
            else {
                this.filter.startDate = moment().startOf('month').toDate();
                this.filter.endDate = moment().endOf('month').toDate();
            }
            // Populate the page
            this.fullRefresh();
        };
        /**
         * Load all of the data on the page
         */
        LedgerController.prototype.fullRefresh = function () {
            var _this = this;
            this.isLoading = true;
            var getUri = "/api/Ledger/PageInfo?startDate=" + encodeURIComponent(this.filter.startDate.toISOString()) + "&endDate=" + encodeURIComponent(this.filter.endDate.toISOString());
            if (this.filter.description.length > 3)
                getUri += "&descriptionSearch=" + encodeURIComponent(this.filter.description);
            this.$http.get(getUri).then(function (httpResponse) {
                _this.isLoading = false;
                var pageInfo = httpResponse.data;
                _this.ledgerAccounts = pageInfo.accounts;
                _.forEach(_this.ledgerAccounts, function (a) { return a.shouldShowInGrid = true; });
                var accountColumn = _this.ledgerGridOptions.columnDefs.filter(function (c) { return c.field === "accountName"; })[0];
                accountColumn.filter.selectOptions = _this.ledgerAccounts.map(function (a) { return { value: a.accountName, label: a.accountName }; });
                _this.hasPlaidAccounts = _.any(_this.ledgerAccounts, function (a) { return a.syncType === 'plaid'; });
                _this.allEntries = pageInfo.entries;
                _this.flatCategoryList = [];
                var visitNode = function (curNode, depth) {
                    if (curNode.displayName) {
                        var labelPrefix = "";
                        if (depth > 1)
                            labelPrefix = Array((depth - 2) * 4).join(String.fromCharCode(160)) + "|--";
                        curNode.dropDownLabel = labelPrefix + curNode.displayName;
                        _this.flatCategoryList.push(curNode);
                    }
                    if (curNode.childCategories == null || curNode.childCategories.length == 0)
                        return;
                    for (var i = 0; i < curNode.childCategories.length; ++i) {
                        visitNode(curNode.childCategories[i], depth + 1);
                    }
                };
                visitNode(pageInfo.rootFinancialCategory, 0);
                _this.updateLocalFilter();
                var uiGridCategoryDropDown = [];
                for (var i = 0; i < _this.flatCategoryList.length; ++i) {
                    uiGridCategoryDropDown.push({ id: _this.flatCategoryList[i].financialCategoryId, value: _this.flatCategoryList[i].dropDownLabel });
                }
                uiGridCategoryDropDown.push({ id: _this.ManageCategoriesDropId, value: "Manage Categories..." });
                var categoryColumn = _this.ledgerGridOptions.columnDefs.filter(function (c) { return c.field === "categoryDisplayName"; })[0];
                categoryColumn.editDropdownOptionsArray = uiGridCategoryDropDown;
                if (_this.preselectCategoryId) {
                    window.setTimeout(function () {
                        var selectedCatEntry = _this.flatCategoryList.filter(function (c) { return c.financialCategoryId === _this.preselectCategoryId; })[0];
                        _this.preselectCategoryId = undefined;
                        var categoryColumn = _this.ledgerGridApi.grid.columns.filter(function (c) { return c.displayName === "Category"; })[0];
                        categoryColumn.filters[0] = {
                            term: selectedCatEntry.displayName
                        };
                    }, 100);
                }
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.prototype.refreshEntries = function () {
            var _this = this;
            this.isLoadingEntries = true;
            var getUri = "/api/Ledger/PageInfo?startDate=" + encodeURIComponent(this.filter.startDate.toISOString()) + "&endDate=" + encodeURIComponent(this.filter.endDate.toISOString());
            if (this.filter.description.length > 3)
                getUri += "&descriptionSearch=" + encodeURIComponent(this.filter.description);
            this.$http.get(getUri).then(function (httpResponse) {
                _this.isLoadingEntries = false;
                _this.allEntries = httpResponse.data.entries;
                _this.updateLocalFilter();
            });
        };
        LedgerController.prototype.updateLocalFilter = function () {
            var enabledAccountIds = this.ledgerAccounts.filter(function (a) { return a.shouldShowInGrid; }).map(function (a) { return a.ledgerAccountId; });
            var filteredList = this.allEntries.filter(function (e) { return enabledAccountIds.indexOf(e.ledgerAccountId) > -1; });
            this.ledgerGridOptions.data = filteredList;
            this.ledgerGridOptions.enablePaginationControls = filteredList.length > this.HistoryPageSize;
            this.ledgerGridOptions.minRowsToShow = Math.min(filteredList.length, this.HistoryPageSize);
            this.ledgerGridOptions.virtualizationThreshold = this.ledgerGridOptions.minRowsToShow;
            this.regenerateDateDonutChart();
        };
        /**
         * Rebuild the data needed to populate the donut chart
         */
        LedgerController.prototype.regenerateDateDonutChart = function () {
            var _this = this;
            this.spendingChartData = null;
            if (this.allEntries.length === 0)
                return;
            var getParentCategoryId = function (financialCategoryId) {
                var cat = _this.flatCategoryList.filter(function (c) { return c.financialCategoryId === financialCategoryId; });
                if (cat && cat.length > 0) {
                    if (!cat[0].parentFinancialCategoryId)
                        return cat[0].financialCategoryId;
                    return getParentCategoryId(cat[0].parentFinancialCategoryId);
                }
                return 0;
            };
            var entriesByParentCat = _.groupBy(this.allEntries, function (e) { return getParentCategoryId(e.financialCategoryId); });
            var spendingChartEntries = [];
            var parentCatIds = _.keys(entriesByParentCat);
            var _loop_1 = function (i) {
                var parentCategoryId = +parentCatIds[i];
                var entries = entriesByParentCat[parentCategoryId];
                var cats = this_1.flatCategoryList.filter(function (c) { return c.financialCategoryId === +parentCategoryId; });
                var parentCategory = null;
                if (cats && cats.length > 0)
                    parentCategory = cats[0];
                var sumTotal = 0;
                for (var entryIndex = 0; entryIndex < entries.length; ++entryIndex)
                    sumTotal += entries[entryIndex].amount;
                var newEntry = {
                    parentCategoryId: parentCategoryId,
                    parentCategoryDisplayName: parentCategory ? parentCategory.displayName : "Uncategorized",
                    sumTotal: Math.abs(sumTotal),
                    numLedgerEntries: entries.length
                };
                spendingChartEntries.push(newEntry);
            };
            var this_1 = this;
            for (var i = 0; i < parentCatIds.length; ++i) {
                _loop_1(i);
            }
            spendingChartEntries = _.sortBy(spendingChartEntries, function (e) { return e.sumTotal; }).reverse();
            this.spendingChartData = [];
            this.spendingChartLabels = [];
            for (var i = 0; i < spendingChartEntries.length; ++i) {
                this.spendingChartData.push(spendingChartEntries[i].sumTotal);
                this.spendingChartLabels.push(spendingChartEntries[i].parentCategoryDisplayName);
            }
        };
        /**
         * Occurs when the user clicks the button to add a new transaction
         */
        LedgerController.prototype.onAddTransaction = function () {
            if (this.ledgerAccounts.length === 0) {
                alert("Please add at least one account first");
                return;
            }
            this.editingTransaction = new LedgerEntry();
            this.editingTransaction.ledgerAccountId = this.ledgerAccounts[0].ledgerAccountId;
            this.editingTransaction.transactionDate = new Date();
        };
        LedgerController.prototype.completePlaidSync = function (accessToken) {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/Plaid/ProcessAccessToken", { accessToken: accessToken }).then(function (httpResponse) {
                _this.isLoading = false;
                _this.newPlaidAccounts = httpResponse.data;
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to link: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.prototype.showAddAccount = function () {
            var _this = this;
            this.createAccountInfo = new CreateAccountInfo();
            this.createAccountInfo.type = null; // Explicitly set to simplify UI logic
            if (!this.isPremiumPlanActive)
                return;
            this.isLoading = true;
            this.$http.get("/api/Plaid/LinkToken").then(function (httpResponse) {
                _this.isLoading = false;
                if (!httpResponse.data)
                    return;
                _this.plaidHandler = Plaid.create({
                    token: httpResponse.data,
                    onSuccess: function (public_token, metadata) {
                        console.log("Plaid onSuccess");
                        _this.completePlaidSync(public_token);
                    },
                    onLoad: function () { },
                    onExit: function (err, metadata) { console.log("onExit.err", err, metadata); },
                    onEvent: function (eventName, metadata) { console.log("onEvent.eventName", eventName, metadata); },
                    receivedRedirectUri: null,
                });
            }, function (httpResponse) {
                _this.isLoading = false;
            });
        };
        /**
         * Occurs when the user wants to edit a transaction
         */
        LedgerController.prototype.editEntry = function (entry) {
            this.editingTransaction = _.clone(entry);
        };
        /**
         * Occurs when the user clicks the button to save transaction details
         */
        LedgerController.prototype.onSaveEntry = function () {
            var _this = this;
            this.isLoading = true;
            var onSave = function (httpResponse) {
                _this.isLoading = false;
                _this.editingTransaction = null;
                _this.refreshEntries();
            };
            var onError = function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            };
            if (this.editingTransaction.ledgerEntryId)
                this.$http.put("/api/Ledger/UpdateEntry", this.editingTransaction).then(onSave, onError);
            else
                this.$http.post("/api/Ledger/NewManualEntry", this.editingTransaction).then(onSave, onError);
        };
        /**
         * Occurs when the user clicks the button to add a new account
         */
        LedgerController.prototype.onSaveNewAccount = function () {
            var _this = this;
            this.isLoading = true;
            var onSave = function (httpResponse) {
                _this.isLoading = false;
                _this.createAccountInfo = null;
                _this.fullRefresh();
            };
            var onError = function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            };
            this.$http.post("/api/Ledger/NewBankAccount", this.createAccountInfo).then(onSave, onError);
        };
        LedgerController.prototype.startPlaidFlow = function () {
            this.createAccountInfo.type = 'plaid';
            this.plaidHandler.open();
            //this.isLoading = true;
            //this.$http.get( "/api/Plaid/LinkToken" ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<string> ) =>
            //{
            //    this.isLoading = false;
            //    const handler = Plaid.create( {
            //        token: httpResponse.data,
            //        onSuccess: ( public_token: string, metadata: any ) =>
            //        {
            //            console.log( "onSuccess" );
            //        },
            //        onLoad: () => { },
            //        onExit: ( err: any, metadata: any ) => { console.log( "onExit.err", err, metadata ); },
            //        onEvent: ( eventName: string, metadata: any ) => { console.log( "onEvent.eventName", eventName, metadata ); },
            //        receivedRedirectUri: null,
            //    } );
            //    handler.open();
            //} );
        };
        LedgerController.prototype.openEditAccountModal = function (account) {
            this.editAccount = _.clone(account);
        };
        LedgerController.prototype.closeAccountAndReload = function () {
            this.createAccountInfo = null;
            this.fullRefresh();
        };
        LedgerController.prototype.onEditAccount = function () {
            var _this = this;
            var putUri = "/api/Ledger/UpdateAccount/" + this.editAccount.ledgerAccountId + "?newName=" + encodeURIComponent(this.editAccount.accountName) + "&newType=" + encodeURIComponent(this.editAccount.accountType);
            this.isLoading = true;
            this.$http.put(putUri, null).then(function (httpResponse) {
                _this.isLoading = false;
                _this.editAccount = null;
                _this.fullRefresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to update: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.prototype.syncPlaidAccounts = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Plaid/SyncRecentTransactions").then(function (httpResponse) {
                _this.isLoading = false;
                _this.refreshEntries();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to sync: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.prototype.onFilterDescriptionChange = function () {
            if (this.filter.description.length > 2 || this.filter.description.length == 0)
                this.refreshEntries();
        };
        LedgerController.prototype.onEditTransactionCategoryChange = function () {
        };
        LedgerController.prototype.onCategoryManagerClosed = function (didMakeChanges) {
            this.shouldShowCategoryEditModal = false;
            if (didMakeChanges)
                this.fullRefresh();
        };
        LedgerController.$inject = ["$http", "SiteInfo", "appCacheService", "uiGridConstants", "$rootScope"];
        return LedgerController;
    }());
    Ally.LedgerController = LedgerController;
    var CategoryOption = /** @class */ (function () {
        function CategoryOption() {
        }
        return CategoryOption;
    }());
    var CreateAccountInfo = /** @class */ (function () {
        function CreateAccountInfo() {
        }
        return CreateAccountInfo;
    }());
    var SpendingChartEntry = /** @class */ (function () {
        function SpendingChartEntry() {
        }
        return SpendingChartEntry;
    }());
    var LedgerAccount = /** @class */ (function () {
        function LedgerAccount() {
        }
        return LedgerAccount;
    }());
    var LedgerEntry = /** @class */ (function () {
        function LedgerEntry() {
        }
        return LedgerEntry;
    }());
    var LedgerListEntry = /** @class */ (function (_super) {
        __extends(LedgerListEntry, _super);
        function LedgerListEntry() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return LedgerListEntry;
    }(LedgerEntry));
    var LedgerPageInfo = /** @class */ (function () {
        function LedgerPageInfo() {
        }
        return LedgerPageInfo;
    }());
    var FilterCriteria = /** @class */ (function () {
        function FilterCriteria() {
            this.description = "";
            this.startDate = new Date();
            this.endDate = new Date();
            this.category = "";
        }
        return FilterCriteria;
    }());
    var FinancialCategory = /** @class */ (function () {
        function FinancialCategory() {
        }
        return FinancialCategory;
    }());
    Ally.FinancialCategory = FinancialCategory;
})(Ally || (Ally = {}));
CA.angularApp.component("ledger", {
    templateUrl: "/ngApp/chtn/manager/financial/ledger.html",
    controller: Ally.LedgerController
});

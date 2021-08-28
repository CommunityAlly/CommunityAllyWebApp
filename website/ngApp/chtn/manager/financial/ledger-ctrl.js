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
        function LedgerController($http, siteInfo, appCacheService, uiGridConstants, $rootScope, $timeout) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.uiGridConstants = uiGridConstants;
            this.$rootScope = $rootScope;
            this.$timeout = $timeout;
            this.isLoading = false;
            this.isLoadingEntries = false;
            this.shouldExpandPending = false;
            this.ledgerAccounts = [];
            this.accountsNeedingLogin = [];
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
            this.showDonut = true;
            this.isSuperAdmin = false;
            this.shouldShowImportModal = false;
            this.shouldShowOwnerFinanceTxn = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        LedgerController.prototype.$onInit = function () {
            var _this = this;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;
            this.homeName = AppConfig.homeName || "Unit";
            this.shouldShowOwnerFinanceTxn = this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn;
            this.ledgerGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false },
                        {
                            field: 'accountName', filter: {
                                type: this.uiGridConstants.filter.SELECT,
                                selectOptions: []
                            }, displayName: 'Account', enableCellEdit: false, width: 140, enableFiltering: true
                        },
                        { field: 'description', displayName: 'Description', enableCellEditOnFocus: true, enableFiltering: true, filter: { placeholder: "search" } },
                        { field: 'categoryDisplayName', editModelField: "financialCategoryId", displayName: 'Category', width: 170, editableCellTemplate: "ui-grid/dropdownEditor", editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'unitGridLabel', editModelField: "associatedUnitId", displayName: this.homeName, width: 120, editableCellTemplate: "ui-grid/dropdownEditor", editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'amount', displayName: 'Amount', width: 140, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: this.uiGridConstants.aggregationTypes.sum, footerCellTemplate: '<div class="ui-grid-cell-contents" >Total: {{col.getAggregationValue() | currency }}</div>' },
                        { field: 'id', displayName: 'Actions', enableSorting: false, enableCellEdit: false, enableFiltering: false, width: 90, cellTemplate: '<div class="ui-grid-cell-contents text-center"><img style="cursor: pointer;" data-ng-click="grid.appScope.$ctrl.editEntry( row.entity )" src="/assets/images/pencil-active.png" /><span class="close-x mt-0 mb-0 ml-3" data-ng-click="grid.appScope.$ctrl.deleteEntry( row.entity )" style="color: red;">&times;</span></div>' }
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
                            console.log('edited row amount:' + rowEntity.amount + ' Column', colDef, ' newValue:' + newValue + ' oldValue:' + oldValue);
                            // Ignore no changes
                            if (oldValue === newValue)
                                return;
                            if (colDef.field === "categoryDisplayName" && rowEntity.financialCategoryId === _this.ManageCategoriesDropId) {
                                rowEntity.financialCategoryId = oldValue;
                                _this.shouldShowCategoryEditModal = true;
                                return;
                            }
                            var catEntry = _this.flatCategoryList.find(function (c) { return c.financialCategoryId === rowEntity.financialCategoryId; });
                            rowEntity.categoryDisplayName = catEntry ? catEntry.displayName : null;
                            var unitEntry = _this.allUnits.find(function (c) { return c.unitId === rowEntity.associatedUnitId; });
                            rowEntity.unitGridLabel = unitEntry ? unitEntry.name : null;
                            _this.$http.put("/api/Ledger/UpdateEntry", rowEntity).then(function () { return _this.regenerateDateDonutChart(); });
                            //vm.msg.lastCellEdited = 'edited row id:' + rowEntity.id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue;
                            //$scope.$apply();
                        });
                    }
                };
            this.pendingGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false },
                        {
                            field: 'accountName', filter: {
                                type: this.uiGridConstants.filter.SELECT,
                                selectOptions: []
                            }, displayName: 'Account', enableCellEdit: false, width: 140, enableFiltering: true
                        },
                        { field: 'description', displayName: 'Description', enableCellEditOnFocus: true, enableFiltering: true, filter: { placeholder: "search" } },
                        { field: 'amount', displayName: 'Amount', width: 140, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: this.uiGridConstants.aggregationTypes.sum, footerCellTemplate: '<div class="ui-grid-cell-contents" >Total: {{col.getAggregationValue() | currency }}</div>' }
                    ],
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: false,
                    enableRowHeaderSelection: false
                };
            this.previewImportGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false },
                        { field: 'description', displayName: 'Description', enableCellEditOnFocus: true, enableFiltering: true, filter: { placeholder: "search" } },
                        { field: 'categoryDisplayName', editModelField: "financialCategoryId", displayName: 'Category', width: 170, editableCellTemplate: "ui-grid/dropdownEditor", editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'unitGridLabel', editModelField: "associatedUnitId", displayName: this.homeName, width: 120, editableCellTemplate: "ui-grid/dropdownEditor", editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'amount', displayName: 'Amount', width: 140, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: this.uiGridConstants.aggregationTypes.sum, footerCellTemplate: '<div class="ui-grid-cell-contents" >Total: {{col.getAggregationValue() | currency }}</div>' },
                        { field: 'id', displayName: '', enableSorting: false, enableCellEdit: false, enableFiltering: false, width: 40, cellTemplate: '<div class="ui-grid-cell-contents text-center"><span class="close-x mt-0 mb-0 ml-3" data-ng-click="grid.appScope.$ctrl.removeImportRow( row.entity )" style="color: red;">&times;</span></div>' }
                    ],
                    enableSorting: true,
                    showColumnFooter: false,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false
                };
            var preselectStartMillis = parseInt(this.appCacheService.getAndClear("ledger_preselect_start"));
            if (!isNaN(preselectStartMillis)) {
                // Let the page finish loading then update the filter or else the date filter will overwrite our date
                window.setTimeout(function () {
                    _this.filter.startDate = new Date(preselectStartMillis);
                    var preselectEndMillis = parseInt(_this.appCacheService.getAndClear("ledger_preselect_end"));
                    _this.filter.endDate = new Date(preselectEndMillis);
                    _this.preselectCategoryId = parseInt(_this.appCacheService.getAndClear("ledger_preselect_categoryId"));
                    if (isNaN(_this.preselectCategoryId))
                        _this.preselectCategoryId = undefined;
                    _this.fullRefresh();
                }, 100);
            }
            else {
                this.filter.startDate = moment().subtract(30, 'days').toDate();
                this.filter.endDate = moment().toDate();
                this.fullRefresh();
                this.loadUnits();
            }
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
                // Hide the account column if there's only one account
                var accountColumn = _this.ledgerGridOptions.columnDefs.find(function (c) { return c.field === "accountName"; });
                if (accountColumn)
                    accountColumn.visible = _this.ledgerAccounts.length > 1;
                // Add only the first account needing login for a Plaid item
                var accountsNeedingLogin = _this.ledgerAccounts.filter(function (a) { return a.plaidNeedsRelogin; });
                _this.accountsNeedingLogin = [];
                var _loop_1 = function (i) {
                    if (!_this.accountsNeedingLogin.find(function (a) { return a.plaidItemId === accountsNeedingLogin[i].plaidItemId; }))
                        _this.accountsNeedingLogin.push(accountsNeedingLogin[i]);
                };
                for (var i = 0; i < accountsNeedingLogin.length; ++i) {
                    _loop_1(i);
                }
                accountColumn.filter.selectOptions = _this.ledgerAccounts.map(function (a) { return { value: a.accountName, label: a.accountName }; });
                _this.hasPlaidAccounts = _.any(_this.ledgerAccounts, function (a) { return a.syncType === 'plaid'; });
                _this.allEntries = pageInfo.entries;
                _this.pendingGridOptions.data = pageInfo.pendingEntries;
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
                _this.updateLocalData();
                var uiGridCategoryDropDown = [];
                uiGridCategoryDropDown.push({ id: null, value: "" });
                for (var i = 0; i < _this.flatCategoryList.length; ++i) {
                    uiGridCategoryDropDown.push({ id: _this.flatCategoryList[i].financialCategoryId, value: _this.flatCategoryList[i].dropDownLabel });
                }
                uiGridCategoryDropDown.push({ id: _this.ManageCategoriesDropId, value: "Manage Categories..." });
                var categoryColumn = _this.ledgerGridOptions.columnDefs.find(function (c) { return c.field === "categoryDisplayName"; });
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
                _this.unitListEntries = pageInfo.unitListEntries;
                if (_this.allUnits)
                    _this.populateGridUnitLabels();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Populate the text that is shown for the unit column and split for category
         */
        LedgerController.prototype.populateGridUnitLabels = function () {
            var _this = this;
            // Populate the unit names for the grid
            _.each(this.allEntries, function (entry) {
                if (entry.isSplit)
                    entry.categoryDisplayName = "(split)";
                if (!entry.associatedUnitId)
                    return;
                var unit = _this.allUnits.find(function (u) { return u.unitId === entry.associatedUnitId; });
                var unitListEntry = _this.unitListEntries.find(function (u) { return u.unitId === entry.associatedUnitId; });
                entry.unitGridLabel = unit.name + " (" + unitListEntry.ownerLast + ")";
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
                _this.updateLocalData();
                _this.populateGridUnitLabels();
            });
        };
        LedgerController.prototype.updateLocalData = function () {
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
            var flattenedTransactions = [];
            for (var i = 0; i < this.allEntries.length; ++i) {
                if (this.allEntries[i].isSplit) {
                    for (var _i = 0, _a = this.allEntries[i].splitEntries; _i < _a.length; _i++) {
                        var e = _a[_i];
                        flattenedTransactions.push(e);
                    }
                }
                else
                    flattenedTransactions.push(this.allEntries[i]);
            }
            var entriesByParentCat = _.groupBy(flattenedTransactions, function (e) { return getParentCategoryId(e.financialCategoryId); });
            var spendingChartEntries = [];
            // Go through all the parent categories and sum the transactions under them
            var parentCatIds = _.keys(entriesByParentCat);
            var _loop_2 = function (i) {
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
                _loop_2(i);
            }
            spendingChartEntries = _.sortBy(spendingChartEntries, function (e) { return e.sumTotal; }).reverse();
            this.spendingChartData = [];
            this.spendingChartLabels = [];
            for (var i = 0; i < spendingChartEntries.length; ++i) {
                this.spendingChartData.push(spendingChartEntries[i].sumTotal);
                this.spendingChartLabels.push(spendingChartEntries[i].parentCategoryDisplayName);
            }
            // Force redraw
            this.showDonut = false;
            this.$timeout(function () { return _this.showDonut = true; }, 100);
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
            window.setTimeout(function () { return document.getElementById("transaction-amount-input").focus(); }, 50);
        };
        LedgerController.prototype.completePlaidSync = function (accessToken, updatePlaidItemId, selectedAccountIds) {
            var _this = this;
            this.isLoading = true;
            this.plaidSuccessProgressMsg = "Contacting Plaid server for selected account information";
            var postData = {
                accessToken: accessToken,
                updatePlaidItemId: updatePlaidItemId,
                selectedAccountIds: selectedAccountIds
            };
            var postUri = updatePlaidItemId ? "/api/Plaid/UpdateAccessToken" : "/api/Plaid/ProcessNewAccessToken";
            this.$http.post(postUri, postData).then(function (httpResponse) {
                _this.isLoading = false;
                _this.plaidSuccessProgressMsg = "Account information successfully retrieved";
                _this.newPlaidAccounts = httpResponse.data;
                if (updatePlaidItemId)
                    window.location.reload();
            }, function (httpResponse) {
                _this.isLoading = false;
                _this.plaidSuccessProgressMsg = "Failed to retrieve account information from Plaid: " + httpResponse.data.exceptionMessage;
                alert("Failed to link: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.prototype.showAddAccount = function () {
            this.createAccountInfo = new CreateAccountInfo();
            this.createAccountInfo.type = null; // Explicitly set to simplify UI logic
        };
        LedgerController.prototype.updateAccountLink = function (ledgerAccount) {
            //this.createAccountInfo = new CreateAccountInfo();
            //this.createAccountInfo.type = null; // Explicitly set to simplify UI logic
            var _this = this;
            if (!this.isPremiumPlanActive)
                return;
            this.isLoading = true;
            this.$http.get("/api/Plaid/UpdateLinkToken/" + ledgerAccount.plaidItemId).then(function (httpResponse) {
                _this.isLoading = false;
                var newLinkToken = httpResponse.data;
                if (!newLinkToken) {
                    alert("Something went wrong on the server. Please contact support.");
                    return;
                }
                var plaidConfig = {
                    token: newLinkToken,
                    onSuccess: function (public_token, metadata) {
                        console.log("Plaid update onSuccess");
                        _this.completePlaidSync(public_token, ledgerAccount.plaidItemId, null);
                    },
                    onLoad: function () { },
                    onExit: function (err, metadata) { console.log("onExit.err", err, metadata); },
                    onEvent: function (eventName, metadata) { console.log("onEvent.eventName", eventName, metadata); },
                    receivedRedirectUri: null,
                };
                _this.plaidHandler = Plaid.create(plaidConfig);
                _this.plaidHandler.open();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to update account link: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user wants to edit a transaction
         */
        LedgerController.prototype.editEntry = function (entry) {
            this.editingTransaction = _.clone(entry);
            if (this.editingTransaction.isSplit)
                this.onSplitAmountChange();
        };
        /**
         * Occurs when the user wants to delete a transaction
         */
        LedgerController.prototype.deleteEntry = function (entry) {
            var _this = this;
            if (!confirm("Are you sure you want to delete this entry? Deletion is permanent."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Ledger/DeleteEntry/" + entry.ledgerEntryId).then(function (httpResponse) {
                _this.isLoading = false;
                _this.editAccount = null;
                _this.editingTransaction = null;
                _this.fullRefresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the button to save transaction details
         */
        LedgerController.prototype.onSaveEntry = function () {
            var _this = this;
            if (!this.editingTransaction.isSplit) {
                if (!this.editingTransaction.description) {
                    alert("Description is required");
                    return;
                }
                if (!this.editingTransaction.amount) {
                    alert("Non-zero amount is required");
                    return;
                }
            }
            else {
                for (var i = 0; i < this.editingTransaction.splitEntries.length; ++i) {
                    if (!this.editingTransaction.splitEntries[i].amount) {
                        alert("A non-zero amount is required for all split transaction entries");
                        return;
                    }
                }
            }
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
            var _this = this;
            if (this.createAccountInfo)
                this.createAccountInfo.type = 'plaid';
            if (!this.isPremiumPlanActive)
                return;
            this.isLoading = true;
            this.$http.get("/api/Plaid/NewLinkToken").then(function (httpResponse) {
                _this.isLoading = false;
                if (!httpResponse.data)
                    return;
                var plaidConfig = {
                    token: httpResponse.data,
                    onSuccess: function (public_token, metadata) {
                        console.log("Plaid onSuccess", metadata);
                        var selectedAccountIds = null;
                        if (metadata && metadata.accounts && metadata.accounts.length > 0)
                            selectedAccountIds = metadata.accounts.map(function (a) { return a.id; });
                        _this.completePlaidSync(public_token, null, selectedAccountIds);
                    },
                    onLoad: function () { },
                    onExit: function (err, metadata) { console.log("update onExit.err", err, metadata); },
                    onEvent: function (eventName, metadata) { console.log("update onEvent.eventName", eventName, metadata); },
                    receivedRedirectUri: null,
                };
                _this.plaidHandler = Plaid.create(plaidConfig);
                _this.plaidHandler.open();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to start Plaid sign-up: " + httpResponse.data.exceptionMessage);
                _this.closeAccountAndReload();
            });
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
        LedgerController.prototype.syncPlaidAccounts = function (shouldSyncRecent) {
            var _this = this;
            this.isLoading = true;
            var getUri = shouldSyncRecent ? "/api/Plaid/SyncRecentTransactions" : "/api/Plaid/SyncTwoYearTransactions";
            this.$http.get(getUri).then(function (httpResponse) {
                _this.isLoading = false;
                _this.refreshEntries();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to sync: " + httpResponse.data.exceptionMessage);
                if (httpResponse.data.exceptionMessage && httpResponse.data.exceptionMessage.indexOf("login credentials") > -1)
                    window.location.reload();
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
        LedgerController.prototype.loadUnits = function () {
            var _this = this;
            this.$http.get("/api/Unit").then(function (httpResponse) {
                _this.allUnits = httpResponse.data;
                var shouldSortUnitsNumerically = _.every(_this.allUnits, function (u) { return HtmlUtil.isNumericString(u.name); });
                if (shouldSortUnitsNumerically)
                    _this.allUnits = _.sortBy(_this.allUnits, function (u) { return parseFloat(u.name); });
                // Populate the object used for quick editing the home
                var uiGridUnitDropDown = [];
                uiGridUnitDropDown.push({ id: null, value: "" });
                for (var i = 0; i < _this.allUnits.length; ++i) {
                    uiGridUnitDropDown.push({ id: _this.allUnits[i].unitId, value: _this.allUnits[i].name });
                }
                var unitColumn = _this.ledgerGridOptions.columnDefs.find(function (c) { return c.field === "unitGridLabel"; });
                unitColumn.editDropdownOptionsArray = uiGridUnitDropDown;
                // If we already have entries, populate the label for the grid
                if (_this.allEntries)
                    _this.populateGridUnitLabels();
            }, function () {
                _this.isLoading = false;
                alert("Failed to retrieve your association's home listing, please contact support.");
            });
        };
        LedgerController.prototype.onDeleteAccount = function () {
            var _this = this;
            if (!confirm("Are you sure you want to remove this account?"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Ledger/DeleteAccount/" + this.editAccount.ledgerAccountId).then(function (httpResponse) {
                _this.isLoading = false;
                _this.editAccount = null;
                _this.fullRefresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.prototype.splitTransaction = function () {
            if (!this.editingTransaction.splitEntries)
                this.editingTransaction.splitEntries = [];
            this.editingTransaction.splitEntries.push(new LedgerEntry());
            this.editingTransaction.isSplit = true;
        };
        LedgerController.prototype.onSplitAmountChange = function () {
            this.splitAmountTotal = this.editingTransaction.splitEntries.reduce(function (sum, e) { return sum + e.amount; }, 0);
            var roundedSplit = Math.round(this.splitAmountTotal * 100);
            var roundedTotal = Math.round(this.editingTransaction.amount * 100);
            this.isSplitAmountEqual = roundedSplit === roundedTotal;
        };
        LedgerController.prototype.removeSplit = function (splitEntry) {
            this.editingTransaction.splitEntries.splice(this.editingTransaction.splitEntries.indexOf(splitEntry), 1);
            this.onSplitAmountChange();
        };
        LedgerController.prototype.openImportFilePicker = function () {
            document.getElementById('importTransactionFileInput').click();
        };
        LedgerController.prototype.openImportModal = function () {
            this.shouldShowImportModal = true;
            this.previewImportGridOptions.data = null;
        };
        LedgerController.prototype.onImportFileSelected = function (event) {
            var _this = this;
            var importTransactionsFile = event.target.files[0];
            if (!importTransactionsFile)
                return;
            this.isLoading = true;
            var formData = new FormData();
            formData.append("importFile", importTransactionsFile);
            var postHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            this.$http.post("/api/Ledger/PreviewImport", formData, postHeaders).then(function (httpResponse) {
                _this.isLoading = false;
                var fileElem = document.getElementById("importTransactionFileInput");
                fileElem.value = "";
                _this.previewImportGridOptions.data = httpResponse.data;
                var _loop_3 = function (i) {
                    var curEntry = _this.previewImportGridOptions.data[i];
                    curEntry.ledgerEntryId = i;
                    var unit = _this.allUnits.find(function (u) { return u.unitId === curEntry.associatedUnitId; });
                    if (unit)
                        curEntry.unitGridLabel = unit.name;
                    var catEntry = _this.flatCategoryList.find(function (c) { return c.financialCategoryId === curEntry.financialCategoryId; });
                    curEntry.categoryDisplayName = catEntry ? catEntry.displayName : null;
                };
                for (var i = 0; i < _this.previewImportGridOptions.data.length; ++i) {
                    _loop_3(i);
                }
                _this.previewImportGridOptions.minRowsToShow = httpResponse.data.length;
                _this.previewImportGridOptions.virtualizationThreshold = _this.previewImportGridOptions.minRowsToShow;
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to upload document: " + httpResponse.data.exceptionMessage);
            });
        };
        /** Bulk import transactions */
        LedgerController.prototype.importPreviewTransactions = function () {
            var _this = this;
            if (!this.bulkImportAccountId) {
                alert("Please select the account into which these transactions will be imported using the drop-down above the grid.");
                return;
            }
            this.isLoading = true;
            var entries = this.previewImportGridOptions.data;
            for (var i = 0; i < entries.length; ++i)
                entries[i].ledgerAccountId = this.bulkImportAccountId;
            this.$http.post("/api/Ledger/BulkImport", this.previewImportGridOptions.data).then(function (httpResponse) {
                _this.previewImportGridOptions.data = null;
                _this.shouldShowImportModal = false;
                _this.isLoading = false;
                _this.refreshEntries();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to import: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.prototype.removeImportRow = function (entry) {
            // For import rows, the row index is stored in ledgerEntryId
            var importEntries = this.previewImportGridOptions.data;
            importEntries.splice(entry.ledgerEntryId, 1);
            for (var i = 0; i < importEntries.length; ++i)
                importEntries[i].ledgerEntryId = i;
        };
        /** Export the transactions list as a CSV */
        LedgerController.prototype.exportTransactionsCsv = function () {
            var csvColumns = [
                {
                    headerText: "Date",
                    fieldName: "transactionDate",
                    dataMapper: function (value) {
                        if (!value)
                            return "";
                        return moment(value).format("YYYY-MM-DD");
                    }
                },
                {
                    headerText: "Description",
                    fieldName: "description"
                },
                {
                    headerText: "Category",
                    fieldName: "categoryDisplayName"
                },
                {
                    headerText: AppConfig.homeName,
                    fieldName: "unitGridLabel"
                },
                {
                    headerText: "Amount",
                    fieldName: "amount"
                },
                {
                    headerText: "Account",
                    fieldName: "accountName"
                }
            ];
            var csvDataString = Ally.createCsvString(this.ledgerGridOptions.data, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Transactions.csv");
        };
        /** Occurs when the user changes the setting to share transactions with owners */
        LedgerController.prototype.onShowOwnerTxnsChange = function () {
            var _this = this;
            this.isLoading = true;
            var putUri = "/api/Ledger/SetOwnerTxnViewing?shouldAllow=" + this.shouldShowOwnerFinanceTxn;
            this.$http.put(putUri, null).then(function (httpResponse) {
                _this.isLoading = false;
                _this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn = _this.shouldShowOwnerFinanceTxn;
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to change setting: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.$inject = ["$http", "SiteInfo", "appCacheService", "uiGridConstants", "$rootScope", "$timeout"];
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
    Ally.LedgerEntry = LedgerEntry;
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
    var BasicUnitListEntry = /** @class */ (function () {
        function BasicUnitListEntry() {
        }
        return BasicUnitListEntry;
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

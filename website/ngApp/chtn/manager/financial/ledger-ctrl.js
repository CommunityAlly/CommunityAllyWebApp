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
     * The controller for the page to view online payment information
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
            this.accounts = [];
            this.categoryOptions = [];
            this.shouldShowAddTransaction = false;
            this.editingTransaction = null;
            this.createAccountInfo = null;
            this.HistoryPageSize = 50;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        LedgerController.prototype.$onInit = function () {
            var _this = this;
            this.categoryOptions = [
                { name: "Bank Fees" },
                { name: "Cash Advance" },
                { name: "Community" },
                { name: "Food and Drink" },
                { name: "Healthcare" },
                { name: "Interest" },
                { name: "Payment" },
                { name: "Recreation" },
                { name: "Service" },
                { name: "Shops" },
                { name: "Tax" },
                { name: "Transfer" },
                { name: "Travel" }
            ];
            this.ledgerGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'" },
                        { field: 'accountName', displayName: 'Account', enableCellEdit: false, width: 140 },
                        { field: 'description', displayName: 'Description', enableCellEditOnFocus: true },
                        { field: 'category', displayName: 'Category', width: 170 },
                        { field: 'amount', displayName: 'Amount', width: 95, type: 'number', cellFilter: "currency" },
                        { field: 'id', displayName: 'Actions', enableSorting: false, enableCellEdit: false, width: 90, cellTemplate: '<div class="ui-grid-cell-contents text-center"><img style="cursor: pointer;" data-ng-click="grid.appScope.$ctrl.editEntry( row.entity )" src="/assets/images/pencil-active.png" /><span class="close-x mt-0 mb-0 ml-3" style="color: red;">&times;</span></div>' }
                    ],
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: true,
                    paginationPageSize: this.HistoryPageSize,
                    paginationPageSizes: [this.HistoryPageSize],
                    enableRowHeaderSelection: false,
                    onRegisterApi: function (gridApi) {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                        gridApi.edit.on.afterCellEdit(_this.$rootScope, function (rowEntity, colDef, newValue, oldValue) {
                            console.log('edited row id:' + rowEntity.amount + ' Column:' + colDef + ' newValue:' + newValue + ' oldValue:' + oldValue);
                            _this.$http.put("/api/Ledger/UpdateEntry", rowEntity);
                            //vm.msg.lastCellEdited = 'edited row id:' + rowEntity.id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue;
                            //$scope.$apply();
                        });
                    }
                };
            // Populate the page
            this.refresh();
        };
        /**
         * Load all of the data on the page
         */
        LedgerController.prototype.refresh = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Ledger/PageInfo").then(function (httpResponse) {
                _this.isLoading = false;
                var pageInfo = httpResponse.data;
                _this.accounts = pageInfo.accounts;
                _this.ledgerGridOptions.data = pageInfo.entries;
                _this.ledgerGridOptions.enablePaginationControls = pageInfo.entries.length > _this.HistoryPageSize;
                _this.ledgerGridOptions.minRowsToShow = Math.min(pageInfo.entries.length, _this.HistoryPageSize);
                _this.ledgerGridOptions.virtualizationThreshold = _this.ledgerGridOptions.minRowsToShow;
            });
        };
        /**
         * Occurs when the user clicks the button to add a new transaction
         */
        LedgerController.prototype.onAddTransaction = function () {
            if (this.accounts.length === 0) {
                alert("Please add at least one account first");
                return;
            }
            this.editingTransaction = new LedgerEntry();
            this.editingTransaction.accountId = this.accounts[0].ledgerAccountId;
        };
        LedgerController.prototype.showAddAccount = function () {
            this.createAccountInfo = new CreateAccountInfo();
            window.setTimeout(function () { return document.getElementById("new-account-name-field").focus(); }, 150);
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
                _this.refresh();
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
                _this.refresh();
            };
            var onError = function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            };
            this.$http.post("/api/Ledger/NewAccount", this.createAccountInfo).then(onSave, onError);
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
})(Ally || (Ally = {}));
CA.angularApp.component("ledger", {
    templateUrl: "/ngApp/chtn/manager/financial/ledger.html",
    controller: Ally.LedgerController
});

var Ally;
(function (Ally) {
    /**
     * The controller for display a resident's financial transaction history
     */
    var ResidentTransactionsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ResidentTransactionsController($http, siteInfo, $timeout, $rootScope, uiGridConstants) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$rootScope = $rootScope;
            this.uiGridConstants = uiGridConstants;
            this.shouldShowModal = false;
            this.isLoading = false;
            this.HistoryPageSize = 50;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        ResidentTransactionsController.prototype.$onInit = function () {
            this.homeName = AppConfig.homeName || "Unit";
            this.transactionGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false },
                        //{
                        //    field: 'accountName', filter: {
                        //        type: this.uiGridConstants.filter.SELECT,
                        //        selectOptions: []
                        //    }, displayName: 'Account', enableCellEdit: false, width: 140, enableFiltering: true
                        //},
                        { field: 'description', displayName: 'Description', enableFiltering: true, filter: { placeholder: "search" } },
                        { field: 'categoryDisplayName', editModelField: "financialCategoryId", displayName: 'Category', width: 170, editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'unitGridLabel', editModelField: "associatedUnitId", displayName: this.homeName, width: 120, enableFiltering: true },
                        { field: 'amount', displayName: 'Amount', width: 120, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: this.uiGridConstants.aggregationTypes.sum, footerCellTemplate: '<div class="ui-grid-cell-contents" >Total: {{col.getAggregationValue() | currency }}</div>' }
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
                    enableRowHeaderSelection: false
                };
        };
        ResidentTransactionsController.prototype.showModal = function () {
            this.shouldShowModal = true;
            this.refreshEntries();
        };
        ResidentTransactionsController.prototype.refreshEntries = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/OwnerLedger/MyTransactions").then(function (httpResponse) {
                _this.isLoading = false;
                _this.transactionGridOptions.data = httpResponse.data;
                // Hide the unit column if the owner only has one unit
                var allUnitIds = _this.transactionGridOptions.data.map(function (u) { return u.associatedUnitId; });
                var uniqueUnitIds = allUnitIds.filter(function (v, i, a) { return a.indexOf(v) === i; });
                var unitColumn = _this.transactionGridOptions.columnDefs.find(function (c) { return c.field === "unitGridLabel"; });
                if (unitColumn)
                    unitColumn.visible = uniqueUnitIds.length > 1;
                if (_this.transactionGridOptions.data.length <= _this.HistoryPageSize) {
                    _this.transactionGridOptions.enablePagination = false;
                    _this.transactionGridOptions.enablePaginationControls = false;
                }
            }, function () {
                _this.isLoading = false;
            });
        };
        ResidentTransactionsController.prototype.exportTransactionsCsv = function () {
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
                }
            ];
            var csvDataString = Ally.createCsvString(this.transactionGridOptions.data, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Owner-Transactions.csv");
        };
        ResidentTransactionsController.$inject = ["$http", "SiteInfo", "$timeout", "$rootScope", "uiGridConstants"];
        return ResidentTransactionsController;
    }());
    Ally.ResidentTransactionsController = ResidentTransactionsController;
})(Ally || (Ally = {}));
CA.angularApp.component("residentTransactions", {
    templateUrl: "/ngApp/common/financial/resident-transactions.html",
    controller: Ally.ResidentTransactionsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    var FinancialReportsController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function FinancialReportsController($http, siteInfo, appCacheService, $location) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.$location = $location;
            this.isLoading = false;
            this.incomeByCategoryData = null;
            this.incomeByCategoryLabels = null;
            this.incomeByCategoryCatIds = null;
            this.expenseByCategoryData = null;
            this.expenseByCategoryLabels = null;
            this.expenseByCategoryCatIds = null;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        FinancialReportsController.prototype.$onInit = function () {
            if (window.sessionStorage.getItem("financialReport_startDate"))
                this.startDate = new Date(parseInt(window.sessionStorage.getItem("financialReport_startDate")));
            if (!this.startDate || isNaN(this.startDate.getTime()))
                this.startDate = moment().subtract(1, 'year').toDate();
            if (window.sessionStorage.getItem("financialReport_endDate"))
                this.endDate = new Date(parseInt(window.sessionStorage.getItem("financialReport_endDate")));
            if (!this.endDate || isNaN(this.endDate.getTime()))
                this.endDate = moment().toDate();
            var innerThis = this;
            this.doughnutChartOptions = {
                onClick: function (event) {
                    var elements = this.getElementAtEvent(event);
                    if (elements.length) {
                        var elem = elements[0];
                        var isExpenseChart = event.target.id === "expense-category-chart";
                        var categoryId = void 0;
                        if (isExpenseChart) {
                            //console.log( "Clicked on expense category: " + innerThis.expenseByCategoryLabels[elem._index] );
                            categoryId = innerThis.expenseByCategoryCatIds[elem._index];
                        }
                        else {
                            console.log("Clicked on income category: " + innerThis.incomeByCategoryLabels[elem._index]);
                            categoryId = innerThis.incomeByCategoryCatIds[elem._index];
                        }
                        innerThis.appCacheService.set("ledger_preselect_start", innerThis.startDate.getTime().toString());
                        innerThis.appCacheService.set("ledger_preselect_end", innerThis.endDate.getTime().toString());
                        innerThis.appCacheService.set("ledger_preselect_categoryId", categoryId.toString());
                        window.location.href = "/#!/Financials/BankTransactions";
                        //console.log( "in new", element[0] )
                    }
                },
            };
            this.refreshData();
        };
        /**
        * Retrieve the report data
        */
        FinancialReportsController.prototype.refreshData = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/FinancialReports/ChartData?startDate=" + encodeURIComponent(this.startDate.toISOString()) + "&endDate=" + encodeURIComponent(this.endDate.toISOString())).then(function (httpResponse) {
                _this.isLoading = false;
                _this.reportData = httpResponse.data;
                _this.incomeByCategoryData = _.map(_this.reportData.incomeByCategory, function (e) { return e.amount; });
                _this.incomeByCategoryLabels = _.map(_this.reportData.incomeByCategory, function (e) { return e.parentFinancialCategoryName; });
                _this.incomeByCategoryCatIds = _.map(_this.reportData.incomeByCategory, function (e) { return e.parentFinancialCategoryId; });
                _this.expenseByCategoryData = _.map(_this.reportData.expenseByCategory, function (e) { return e.amount; });
                _this.expenseByCategoryLabels = _.map(_this.reportData.expenseByCategory, function (e) { return e.parentFinancialCategoryName; });
                _this.expenseByCategoryCatIds = _.map(_this.reportData.expenseByCategory, function (e) { return e.parentFinancialCategoryId; });
                window.sessionStorage.setItem("financialReport_startDate", _this.startDate.getTime().toString());
                window.sessionStorage.setItem("financialReport_endDate", _this.endDate.getTime().toString());
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve report data: " + httpResponse.data.exceptionMessage);
            });
        };
        FinancialReportsController.prototype.onByCategoryClickChart = function (points, event) {
            if (!points || points.length === 0)
                return;
            var isExpenseChart = points[0]._chart.canvas.id === "expense-category-chart";
            console.log("Clicked", isExpenseChart, points[0], event);
            if (isExpenseChart) {
                console.log("Clicked on expense category: " + this.expenseByCategoryLabels[points[0]._index]);
            }
            else
                console.log("Clicked on income category: " + this.incomeByCategoryLabels[points[0]._index]);
        };
        FinancialReportsController.$inject = ["$http", "SiteInfo", "appCacheService", "$location"];
        return FinancialReportsController;
    }());
    Ally.FinancialReportsController = FinancialReportsController;
    var DoughnutChartEntry = /** @class */ (function () {
        function DoughnutChartEntry() {
        }
        return DoughnutChartEntry;
    }());
    var BalanceEntry = /** @class */ (function () {
        function BalanceEntry() {
        }
        return BalanceEntry;
    }());
    var AccountBalanceMonth = /** @class */ (function () {
        function AccountBalanceMonth() {
        }
        return AccountBalanceMonth;
    }());
    var FinancialReportData = /** @class */ (function () {
        function FinancialReportData() {
        }
        return FinancialReportData;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("financialReports", {
    templateUrl: "/ngApp/chtn/manager/financial/financial-reports.html",
    controller: Ally.FinancialReportsController
});

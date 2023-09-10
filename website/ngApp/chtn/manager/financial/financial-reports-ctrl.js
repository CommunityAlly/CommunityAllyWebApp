var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    class FinancialReportsController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, appCacheService, $location) {
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
        $onInit() {
            if (window.sessionStorage.getItem("financialReport_startDate"))
                this.startDate = new Date(parseInt(window.sessionStorage.getItem("financialReport_startDate")));
            if (!this.startDate || isNaN(this.startDate.getTime()))
                this.startDate = moment().subtract(1, 'year').toDate();
            if (window.sessionStorage.getItem("financialReport_endDate"))
                this.endDate = new Date(parseInt(window.sessionStorage.getItem("financialReport_endDate")));
            if (!this.endDate || isNaN(this.endDate.getTime()))
                this.endDate = moment().toDate();
            const innerThis = this;
            this.doughnutChartOptions = {
                onClick: function (event) {
                    const elements = this.getElementAtEvent(event);
                    if (elements.length) {
                        const elem = elements[0];
                        const isExpenseChart = event.target.id === "expense-category-chart";
                        let categoryId;
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
        }
        /**
        * Retrieve the report data
        */
        refreshData() {
            this.isLoading = true;
            this.$http.get(`/api/FinancialReports/ChartData?startDate=${encodeURIComponent(this.startDate.toISOString())}&endDate=${encodeURIComponent(this.endDate.toISOString())}`).then((httpResponse) => {
                this.isLoading = false;
                this.reportData = httpResponse.data;
                this.reportData.incomeByCategory = _.sortBy(this.reportData.incomeByCategory, e => e.amount);
                this.incomeByCategoryData = _.map(this.reportData.incomeByCategory, e => Math.abs(e.amount));
                this.incomeByCategoryLabels = _.map(this.reportData.incomeByCategory, e => e.parentFinancialCategoryName);
                this.incomeByCategoryCatIds = _.map(this.reportData.incomeByCategory, e => e.parentFinancialCategoryId);
                this.reportData.expenseByCategory = _.sortBy(this.reportData.expenseByCategory, e => e.amount);
                this.expenseByCategoryData = _.map(this.reportData.expenseByCategory, e => Math.abs(e.amount));
                this.expenseByCategoryLabels = _.map(this.reportData.expenseByCategory, e => e.parentFinancialCategoryName);
                this.expenseByCategoryCatIds = _.map(this.reportData.expenseByCategory, e => e.parentFinancialCategoryId);
                window.sessionStorage.setItem("financialReport_startDate", this.startDate.getTime().toString());
                window.sessionStorage.setItem("financialReport_endDate", this.endDate.getTime().toString());
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to retrieve report data: " + httpResponse.data.exceptionMessage);
            });
        }
        onByCategoryClickChart(points, event) {
            if (!points || points.length === 0)
                return;
            const isExpenseChart = points[0]._chart.canvas.id === "expense-category-chart";
            console.log("Clicked", isExpenseChart, points[0], event);
            if (isExpenseChart) {
                console.log("Clicked on expense category: " + this.expenseByCategoryLabels[points[0]._index]);
            }
            else
                console.log("Clicked on income category: " + this.incomeByCategoryLabels[points[0]._index]);
        }
    }
    FinancialReportsController.$inject = ["$http", "SiteInfo", "appCacheService", "$location"];
    Ally.FinancialReportsController = FinancialReportsController;
    class DoughnutChartEntry {
    }
    class BalanceEntry {
    }
    class AccountBalanceMonth {
    }
    class FinancialReportData {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("financialReports", {
    templateUrl: "/ngApp/chtn/manager/financial/financial-reports.html",
    controller: Ally.FinancialReportsController
});

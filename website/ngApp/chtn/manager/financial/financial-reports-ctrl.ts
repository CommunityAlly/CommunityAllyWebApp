﻿namespace Ally
{
    /**
     * The controller for the page to track group spending
     */
    export class FinancialReportsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "appCacheService", "$location"];

        isLoading: boolean = false;
        reportData: FinancialReportData;
        incomeByCategoryData: number[] | null = null;
        incomeByCategoryLabels: string[] | null = null;
        incomeByCategoryCatIds: number[] | null = null;
        expenseByCategoryData: number[] | null = null;
        expenseByCategoryLabels: string[] | null = null;
        expenseByCategoryCatIds: number[] | null = null;
        doughnutChartOptions: any;
        startDate: Date;
        endDate: Date;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private appCacheService: AppCacheService,
            private $location: ng.ILocationService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            if( window.sessionStorage.getItem( "financialReport_startDate" ) )
                this.startDate = new Date( parseInt( window.sessionStorage.getItem( "financialReport_startDate" ) ) );
            if( !this.startDate || isNaN(this.startDate.getTime()) )
                this.startDate = moment().subtract( 1, 'year' ).toDate();

            if( window.sessionStorage.getItem( "financialReport_endDate" ) )
                this.endDate = new Date( parseInt( window.sessionStorage.getItem( "financialReport_endDate" ) ) );
            if( !this.endDate || isNaN( this.endDate.getTime() ) )
                this.endDate = moment().toDate();

            // We need to use classic function() syntax here in order to access Chart.js getElementAtEvent
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const innerThis = this;
            this.doughnutChartOptions = {
                onClick: function( event: MouseEvent )
                {
                    const elements = this.getElementAtEvent( event );
                    if( elements.length )
                    {
                        const elem = elements[0];

                        const isExpenseChart = ( event.target as HTMLElement ).id === "expense-category-chart";

                        let categoryId: number;
                        if( isExpenseChart )
                        {
                            //console.log( "Clicked on expense category: " + innerThis.expenseByCategoryLabels[elem._index] );
                            categoryId = innerThis.expenseByCategoryCatIds[elem._index];
                        }
                        else
                        {
                            console.log( "Clicked on income category: " + innerThis.incomeByCategoryLabels[elem._index] );
                            categoryId = innerThis.incomeByCategoryCatIds[elem._index];
                        }

                        innerThis.appCacheService.set( "ledger_preselect_start", innerThis.startDate.getTime().toString() );
                        innerThis.appCacheService.set( "ledger_preselect_end", innerThis.endDate.getTime().toString() );
                        innerThis.appCacheService.set( "ledger_preselect_categoryId", categoryId.toString() );
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
        refreshData()
        {
            this.isLoading = true;

            this.$http.get( `/api/FinancialReports/ChartData?startDate=${encodeURIComponent( this.startDate.toISOString() )}&endDate=${encodeURIComponent( this.endDate.toISOString() )}` ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<FinancialReportData> ) =>
                {
                    this.isLoading = false;

                    this.reportData = httpResponse.data;

                    this.reportData.incomeByCategory = _.sortBy( this.reportData.incomeByCategory, e => e.amount );
                    this.incomeByCategoryData = _.map( this.reportData.incomeByCategory, e => Math.abs( e.amount ) );
                    this.incomeByCategoryLabels = _.map( this.reportData.incomeByCategory, e => e.parentFinancialCategoryName );
                    this.incomeByCategoryCatIds = _.map( this.reportData.incomeByCategory, e => e.parentFinancialCategoryId );

                    this.reportData.expenseByCategory = _.sortBy( this.reportData.expenseByCategory, e => e.amount );
                    this.expenseByCategoryData = _.map( this.reportData.expenseByCategory, e => Math.abs( e.amount ) );
                    this.expenseByCategoryLabels = _.map( this.reportData.expenseByCategory, e => e.parentFinancialCategoryName );
                    this.expenseByCategoryCatIds = _.map( this.reportData.expenseByCategory, e => e.parentFinancialCategoryId );
                    
                    window.sessionStorage.setItem( "financialReport_startDate", this.startDate.getTime().toString() );
                    window.sessionStorage.setItem( "financialReport_endDate", this.endDate.getTime().toString() );
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve report data: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        onByCategoryClickChart( points: any[], event: MouseEvent )
        {
            if( !points || points.length === 0 )
                return;

            const isExpenseChart = points[0]._chart.canvas.id === "expense-category-chart";
            console.log( "Clicked", isExpenseChart, points[0], event );

            if( isExpenseChart )
            {
                console.log( "Clicked on expense category: " + this.expenseByCategoryLabels[points[0]._index] );
            }
            else
                console.log( "Clicked on income category: " + this.incomeByCategoryLabels[points[0]._index] );
        }
    }

    class DoughnutChartEntry
    {
        parentFinancialCategoryId: number | null;
        parentFinancialCategoryName: string;
        amount: number;
    }

    class BalanceEntry
    {
        ledgerAccountId: number;
        ledgerAccountName: string;
        amount: number;
    }

    class AccountBalanceMonth
    {
        year: number;
        monthNumber: number;
        balanceEntries: BalanceEntry[];
    }

    class FinancialReportData
    {
        startDate: Date;
        endDate: Date;
        incomeByCategory: DoughnutChartEntry[];
        expenseByCategory: DoughnutChartEntry[];
        currentAccountBalances: BalanceEntry[];
        historicAccountBalances: AccountBalanceMonth[];
        profitAndLossData: object;
    }
}


CA.angularApp.component( "financialReports", {
    templateUrl: "/ngApp/chtn/manager/financial/financial-reports.html",
    controller: Ally.FinancialReportsController
} );

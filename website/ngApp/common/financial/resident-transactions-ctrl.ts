namespace Ally
{
    /**
     * The controller for display a resident's financial transaction history
     */
    export class ResidentTransactionsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$timeout", "$rootScope", "uiGridConstants"];
        shouldShowModal: boolean = false;
        isLoading: boolean = false;
        transactionGridOptions: uiGrid.IGridOptionsOf<LedgerEntry>;
        readonly HistoryPageSize: number = 50;
        homeName: string;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private $timeout: ng.ITimeoutService,
            private $rootScope: ng.IRootScopeService,
            private uiGridConstants: uiGrid.IUiGridConstants )
        {
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            this.homeName = AppConfig.homeName || "Unit";

            this.transactionGridOptions =
            {
                columnDefs:
                    [
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
                        { field: 'amount', displayName: 'Amount', width: 140, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: this.uiGridConstants.aggregationTypes.sum, footerCellTemplate: '<div class="ui-grid-cell-contents">Total: {{col.getAggregationValue() | currency }}</div>' }
                    ],
                enableFiltering: true,
                enableSorting: true,
                showColumnFooter: true,
                enableHorizontalScrollbar: window.innerWidth < 640 ? this.uiGridConstants.scrollbars.ALWAYS : this.uiGridConstants.scrollbars.NEVER,
                enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                enableColumnMenus: false,
                enablePaginationControls: true,
                paginationPageSize: this.HistoryPageSize,
                paginationPageSizes: [this.HistoryPageSize],
                enableRowHeaderSelection: false
            };
        }


        showModal()
        {
            this.shouldShowModal = true;
            this.refreshEntries();
        }


        refreshEntries()
        {
            this.isLoading = true;

            this.$http.get( `/api/OwnerLedger/MyTransactions` ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<LedgerEntry[]> ) =>
                {
                    this.isLoading = false;
                    this.transactionGridOptions.data = httpResponse.data;

                    // Hide the unit column if the owner only has one unit
                    const allUnitIds = this.transactionGridOptions.data.map( u => u.associatedUnitId );
                    const uniqueUnitIds = allUnitIds.filter( ( v, i, a ) => a.indexOf( v ) === i );
                    const unitColumn = this.transactionGridOptions.columnDefs.find( c => c.field === "unitGridLabel" );
                    if( unitColumn )
                        unitColumn.visible = uniqueUnitIds.length > 1;

                    if( this.transactionGridOptions.data.length <= this.HistoryPageSize )
                    {
                        this.transactionGridOptions.enablePagination = false;
                        this.transactionGridOptions.enablePaginationControls = false;
                    }
                },
                () =>
                {
                    this.isLoading = false;
                }
            );
        }


        exportTransactionsCsv()
        {
            var csvColumns = [
                {
                    headerText: "Date",
                    fieldName: "transactionDate",
                    dataMapper: function( value: Date )
                    {
                        if( !value )
                            return "";

                        return moment( value ).format( "YYYY-MM-DD" );
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

            var csvDataString = Ally.createCsvString( this.transactionGridOptions.data as LedgerEntry[], csvColumns );

            HtmlUtil2.downloadCsv( csvDataString, "Owner-Transactions.csv" );
        }
    }
}


CA.angularApp.component( "residentTransactions", {
    templateUrl: "/ngApp/common/financial/resident-transactions.html",
    controller: Ally.ResidentTransactionsController
} );
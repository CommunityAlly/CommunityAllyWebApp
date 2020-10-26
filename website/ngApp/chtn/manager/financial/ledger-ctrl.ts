namespace Ally
{
    /**
     * The controller for the page to view online payment information
     */
    export class LedgerController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "appCacheService", "uiGridConstants", "$rootScope"];

        isLoading: boolean = false;
        ledgerGridOptions: uiGrid.IGridOptionsOf<LedgerEntry>;
        accounts: LedgerAccount[] = [];
        categoryOptions: CategoryOption[] = [];
        shouldShowAddTransaction: boolean = false;
        editingTransaction: LedgerEntry = null;
        createAccountInfo: CreateAccountInfo = null;
        readonly HistoryPageSize: number = 50;

        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private appCacheService: AppCacheService,
            private uiGridConstants: uiGrid.IUiGridConstants,
            private $rootScope: ng.IRootScopeService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
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
                columnDefs:
                    [
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
                onRegisterApi: ( gridApi ) =>
                {
                    // Fix dumb scrolling
                    HtmlUtil.uiGridFixScroll();

                    gridApi.edit.on.afterCellEdit( this.$rootScope, ( rowEntity, colDef, newValue, oldValue ) =>
                    {
                        console.log( 'edited row id:' + rowEntity.amount + ' Column:' + colDef + ' newValue:' + newValue + ' oldValue:' + oldValue );
                        this.$http.put( "/api/Ledger/UpdateEntry", rowEntity );
                        //vm.msg.lastCellEdited = 'edited row id:' + rowEntity.id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue;
                        //$scope.$apply();
                    } );
                }
            };

            // Populate the page
            this.refresh();
        }


        /**
         * Load all of the data on the page
         */
        refresh()
        {
            this.isLoading = true;

            this.$http.get( "/api/Ledger/PageInfo" ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<LedgerPageInfo> ) =>
            {
                this.isLoading = false;

                const pageInfo = httpResponse.data;
                this.accounts = pageInfo.accounts;
                this.ledgerGridOptions.data = pageInfo.entries;
                this.ledgerGridOptions.enablePaginationControls = pageInfo.entries.length > this.HistoryPageSize;
                this.ledgerGridOptions.minRowsToShow = Math.min( pageInfo.entries.length, this.HistoryPageSize );
                this.ledgerGridOptions.virtualizationThreshold = this.ledgerGridOptions.minRowsToShow;
            } );
        }


        /**
         * Occurs when the user clicks the button to add a new transaction
         */
        onAddTransaction()
        {
            if( this.accounts.length === 0 )
            {
                alert( "Please add at least one account first" );
                return;
            }

            this.editingTransaction = new LedgerEntry();
            this.editingTransaction.accountId = this.accounts[0].ledgerAccountId;
        }


        showAddAccount()
        {
            this.createAccountInfo = new CreateAccountInfo();
            window.setTimeout( () => document.getElementById( "new-account-name-field" ).focus(), 150 );
        }


        /**
         * Occurs when the user wants to edit a transaction
         */
        editEntry( entry:LedgerEntry )
        {
            this.editingTransaction = _.clone( entry );
        }


        /**
         * Occurs when the user clicks the button to save transaction details
         */
        onSaveEntry()
        {
            this.isLoading = true;

            const onSave = ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.editingTransaction = null;
                this.refresh();
            };

            const onError = ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to save: " + httpResponse.data.exceptionMessage );
            };

            if( this.editingTransaction.ledgerEntryId )
                this.$http.put( "/api/Ledger/UpdateEntry", this.editingTransaction ).then( onSave, onError );
            else
                this.$http.post( "/api/Ledger/NewManualEntry", this.editingTransaction ).then( onSave, onError );
        }


        /**
         * Occurs when the user clicks the button to add a new account
         */
        onSaveNewAccount()
        {
            this.isLoading = true;

            const onSave = ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.createAccountInfo = null;
                this.refresh();
            };

            const onError = ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to save: " + httpResponse.data.exceptionMessage );
            };

            this.$http.post( "/api/Ledger/NewAccount", this.createAccountInfo ).then( onSave, onError );
        }
    }

    class CategoryOption
    {
        name: string;
    }

    class CreateAccountInfo
    {
        name: string;
        type: string;
    }

    class LedgerAccount
    {
        ledgerAccountId: number;
        groupId: number;
        name: string;
        type: string;
        createdByUserId: string;
        createdDateUtc: Date;
    }

    class LedgerEntry
    {
        ledgerEntryId: number;
        accountId: number;
        transactionDate: Date;
        description: string;
        category: string;
        tags: string;
        amount: number;
        accountName: string;
    }
    
    class LedgerListEntry extends LedgerEntry
    {
        accountName: string;
    }

    class LedgerPageInfo
    {
        accounts: LedgerAccount[];
        entries: LedgerEntry[];
    }
}


CA.angularApp.component( "ledger", {
    templateUrl: "/ngApp/chtn/manager/financial/ledger.html",
    controller: Ally.LedgerController
} );

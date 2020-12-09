declare var Plaid: any;

namespace Ally
{
    /**
     * The controller for the page to track group spending
     */
    export class LedgerController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "appCacheService", "uiGridConstants", "$rootScope"];

        isLoading: boolean = false;
        isLoadingEntries: boolean = false;
        ledgerGridOptions: uiGrid.IGridOptionsOf<LedgerEntry>;
        ledgerAccounts: LedgerAccount[] = [];
        categoryOptions: CategoryOption[] = [];
        shouldShowAddTransaction: boolean = false;
        editAccount: LedgerAccount = null;
        editingTransaction: LedgerEntry = null;
        createAccountInfo: CreateAccountInfo = null;
        readonly HistoryPageSize: number = 50;
        plaidToken: string;
        plaidHandler: any = null;
        newPlaidAccounts: LedgerAccount[] = [];
        hasPlaidAccounts: boolean = false;
        filter: FilterCriteria = new FilterCriteria();
        filterPresetDateRange: string;
        flatCategoryList: FinancialCategory[];
        allEntries: LedgerEntry[];
        isPremiumPlanActive: boolean = false;
        readonly ManageCategoriesDropId = -15;
        shouldShowCategoryEditModal: boolean = false;
        spendingChartData: number[]|null = null;
        spendingChartLabels: string[] | null = null;

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
            this.isPremiumPlanActive = false;///this.siteInfo.privateSiteInfo.isPremiumPlanActive;

            this.ledgerGridOptions =
            {
                columnDefs:
                    [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false },
                        { field: 'accountName', filter: {
                              type: this.uiGridConstants.filter.SELECT,
                              selectOptions: []
                            }, displayName: 'Account', enableCellEdit: false, width: 140, enableFiltering: true
                        },
                        { field: 'description', displayName: 'Description', enableCellEditOnFocus: true, enableFiltering: true, filter: { placeholder: "search" } },
                        { field: 'categoryDisplayName', editModelField: "financialCategoryId", displayName: 'Category', width: 170, editableCellTemplate: "ui-grid/dropdownEditor", editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'amount', displayName: 'Amount', width: 95, type: 'number', cellFilter: "currency", enableFiltering: true },
                        { field: 'id', displayName: 'Actions', enableSorting: false, enableCellEdit: false, enableFiltering: false, width: 90, cellTemplate: '<div class="ui-grid-cell-contents text-center"><img style="cursor: pointer;" data-ng-click="grid.appScope.$ctrl.editEntry( row.entity )" src="/assets/images/pencil-active.png" /><span class="close-x mt-0 mb-0 ml-3" style="color: red;">&times;</span></div>' }
                    ],
                enableFiltering: true,
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

                    gridApi.edit.on.afterCellEdit( this.$rootScope, ( rowEntity, colDef: any, newValue, oldValue ) =>
                    {
                        console.log( 'edited row id:' + rowEntity.amount + ' Column:' + colDef + ' newValue:' + newValue + ' oldValue:' + oldValue );

                        // Ignore no changes
                        if( oldValue === newValue )
                            return;

                        if( colDef.field === "categoryDisplayName" && rowEntity.financialCategoryId === this.ManageCategoriesDropId )
                        {
                            rowEntity.financialCategoryId = oldValue;
                            this.shouldShowCategoryEditModal = true;
                            return;
                        }

                        const catEntry = this.flatCategoryList.filter( c => c.financialCategoryId === rowEntity.financialCategoryId );
                        if( catEntry && catEntry.length > 0 )
                            rowEntity.categoryDisplayName = catEntry[0].displayName;

                        this.$http.put( "/api/Ledger/UpdateEntry", rowEntity );
                        //vm.msg.lastCellEdited = 'edited row id:' + rowEntity.id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue;
                        //$scope.$apply();
                    } );
                }
            };

            // Populate the page
            this.filterPresetDateRange = "thisMonth";
            this.selectPresetDateRange( true );
            this.fullRefresh();
        }


        /**
         * Load all of the data on the page
         */
        fullRefresh()
        {
            this.isLoading = true;

            var getUri = `/api/Ledger/PageInfo?startDate=${encodeURIComponent( this.filter.startDate.toISOString() )}&endDate=${encodeURIComponent( this.filter.endDate.toISOString() )}`;
            if( this.filter.description.length > 3 )
                getUri += "&descriptionSearch=" + encodeURIComponent( this.filter.description );

            this.$http.get( getUri ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<LedgerPageInfo> ) =>
                {
                    this.isLoading = false;

                    const pageInfo = httpResponse.data;
                    this.ledgerAccounts = pageInfo.accounts;
                    _.forEach( this.ledgerAccounts, a => a.shouldShowInGrid = true );
                    const accountColumn = this.ledgerGridOptions.columnDefs.filter( c => c.field === "accountName" )[0];
                    accountColumn.filter.selectOptions = this.ledgerAccounts.map( a => { return {value: a.accountName, label: a.accountName} } );

                    this.hasPlaidAccounts = _.any( this.ledgerAccounts, a => a.syncType === 'plaid' );

                    this.allEntries = pageInfo.entries;
                    
                    this.flatCategoryList = [];
                    const visitNode = ( curNode: FinancialCategory, depth: number ) =>
                    {
                        if( curNode.displayName )
                        {
                            let labelPrefix = "";
                            if( depth > 1 )
                                labelPrefix = Array( ( depth - 2 ) * 4 ).join( String.fromCharCode( 160 ) ) + "|--";
                            curNode.dropDownLabel = labelPrefix + curNode.displayName;

                            this.flatCategoryList.push( curNode );
                        }

                        if( curNode.childCategories == null || curNode.childCategories.length == 0 )
                            return;

                        for( let i = 0; i < curNode.childCategories.length; ++i )
                        {
                            visitNode( curNode.childCategories[i], depth + 1 );
                        }
                    };
                    visitNode( pageInfo.rootFinancialCategory, 0 );

                    this.updateLocalFilter();

                    const uiGridCategoryDropDown = [];
                    for( let i = 0; i < this.flatCategoryList.length; ++i )
                    {
                        uiGridCategoryDropDown.push( { id: this.flatCategoryList[i].financialCategoryId, value: this.flatCategoryList[i].dropDownLabel } );
                    }
                    uiGridCategoryDropDown.push( { id: this.ManageCategoriesDropId, value: "Manage Categories..." } );

                    const categoryColumn = this.ledgerGridOptions.columnDefs.filter( c => c.field === "categoryDisplayName" )[0];
                    categoryColumn.editDropdownOptionsArray = uiGridCategoryDropDown;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        refreshEntries()
        {
            this.isLoadingEntries = true;

            var getUri = `/api/Ledger/PageInfo?startDate=${encodeURIComponent( this.filter.startDate.toISOString() )}&endDate=${encodeURIComponent( this.filter.endDate.toISOString() )}`;
            if( this.filter.description.length > 3 )
                getUri += "&descriptionSearch=" + encodeURIComponent( this.filter.description );

            this.$http.get( getUri ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoadingEntries = false;

                this.allEntries = httpResponse.data.entries;
                this.updateLocalFilter();
            } );
        }


        updateLocalFilter()
        {
            const enabledAccountIds = this.ledgerAccounts.filter( a => a.shouldShowInGrid ).map( a => a.ledgerAccountId );

            const filteredList = this.allEntries.filter( e => enabledAccountIds.indexOf(e.ledgerAccountId) > -1 );

            this.ledgerGridOptions.data = filteredList;
            this.ledgerGridOptions.enablePaginationControls = filteredList.length > this.HistoryPageSize;
            this.ledgerGridOptions.minRowsToShow = Math.min( filteredList.length, this.HistoryPageSize );
            this.ledgerGridOptions.virtualizationThreshold = this.ledgerGridOptions.minRowsToShow;

            this.regenerateDateDonutChart();
        }


        /**
         * Rebuild the data needed to populate the donut chart
         */
        regenerateDateDonutChart()
        {
            this.spendingChartData = null;
            if( this.allEntries.length === 0 )
                return;

            const getParentCategoryId = ( financialCategoryId: number | null ): number =>
            {
                const cat = this.flatCategoryList.filter( c => c.financialCategoryId === financialCategoryId );
                if( cat && cat.length > 0 )
                {
                    if( !cat[0].parentFinancialCategoryId )
                        return cat[0].financialCategoryId;

                    return getParentCategoryId( cat[0].parentFinancialCategoryId );
                }

                return 0;
            };

            const entriesByParentCat = _.groupBy( this.allEntries, e => getParentCategoryId( e.financialCategoryId ) );

            let spendingChartEntries: SpendingChartEntry[] = [];

            const parentCatIds = _.keys( entriesByParentCat );
            for( let i = 0; i < parentCatIds.length; ++i )
            {
                const parentCategoryId = +parentCatIds[i];
                const entries = entriesByParentCat[parentCategoryId];
                const cats = this.flatCategoryList.filter( c => c.financialCategoryId === +parentCategoryId );
                let parentCategory: FinancialCategory = null;
                if( cats && cats.length > 0 )
                    parentCategory = cats[0];

                let sumTotal = 0;
                for( let entryIndex = 0; entryIndex < entries.length; ++entryIndex )
                    sumTotal += entries[entryIndex].amount;

                const newEntry: SpendingChartEntry = {
                    parentCategoryId,
                    parentCategoryDisplayName: parentCategory ? parentCategory.displayName : "Uncategorized",
                    sumTotal: Math.abs( sumTotal ),
                    numLedgerEntries: entries.length
                };

                spendingChartEntries.push( newEntry );
            }

            spendingChartEntries = _.sortBy( spendingChartEntries, e => e.sumTotal ).reverse();

            this.spendingChartData = [];
            this.spendingChartLabels = [];

            for( let i = 0; i < spendingChartEntries.length; ++i )
            {
                this.spendingChartData.push( spendingChartEntries[i].sumTotal );
                this.spendingChartLabels.push( spendingChartEntries[i].parentCategoryDisplayName );
            }
        }


        /**
         * Occurs when the user clicks the button to add a new transaction
         */
        onAddTransaction()
        {
            if( this.ledgerAccounts.length === 0 )
            {
                alert( "Please add at least one account first" );
                return;
            }

            this.editingTransaction = new LedgerEntry();
            this.editingTransaction.ledgerAccountId = this.ledgerAccounts[0].ledgerAccountId;
            this.editingTransaction.transactionDate = new Date();
        }


        completePlaidSync( accessToken: string )
        {
            this.isLoading = true;

            this.$http.post( "/api/Plaid/ProcessAccessToken", { accessToken } ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<LedgerAccount[]> ) =>
                {
                    this.isLoading = false;

                    this.newPlaidAccounts = httpResponse.data;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to link: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        showAddAccount()
        {
            this.createAccountInfo = new CreateAccountInfo();
            this.createAccountInfo.type = null; // Explicitly set to simplify UI logic

            if( !this.isPremiumPlanActive )
                return;

            this.isLoading = true;

            this.$http.get( "/api/Plaid/LinkToken" ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    this.isLoading = false;

                    if( !httpResponse.data )
                        return;

                    this.plaidHandler = Plaid.create( {
                        token: httpResponse.data,
                        onSuccess: ( public_token: string, metadata: any ) =>
                        {
                            console.log( "Plaid onSuccess" );
                            this.completePlaidSync( public_token );
                        },
                        onLoad: () => { },
                        onExit: ( err: any, metadata: any ) => { console.log( "onExit.err", err, metadata ); },
                        onEvent: ( eventName: string, metadata: any ) => { console.log( "onEvent.eventName", eventName, metadata ); },
                        receivedRedirectUri: null,
                    } );
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                }
            );
        }


        /**
         * Occurs when the user wants to edit a transaction
         */
        editEntry( entry: LedgerEntry )
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
                this.refreshEntries();
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
                this.fullRefresh();
            };

            const onError = ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to save: " + httpResponse.data.exceptionMessage );
            };

            this.$http.post( "/api/Ledger/NewBankAccount", this.createAccountInfo ).then( onSave, onError );
        }

        startPlaidFlow()
        {
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
        }

        openEditAccountModal( account: LedgerAccount )
        {
            this.editAccount = _.clone( account );
        }

        closeAccountAndReload()
        {
            this.createAccountInfo = null;
            this.fullRefresh();
        }

        onEditAccount()
        {
            const putUri = `/api/Ledger/UpdateAccount/${this.editAccount.ledgerAccountId}?newName=${encodeURIComponent( this.editAccount.accountName )}&newType=${encodeURIComponent( this.editAccount.accountType )}`;
            this.isLoading = true;

            this.$http.put( putUri, null ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.editAccount = null;
                    this.fullRefresh();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to update: " + httpResponse.data.exceptionMessage );
                }
            );
        }

        syncPlaidAccounts()
        {
            this.isLoading = true;

            this.$http.get( `/api/Plaid/SyncRecentTransactions` ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.refreshEntries();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to sync: " + httpResponse.data.exceptionMessage );
                }
            );
        }

        selectPresetDateRange(suppressRefresh: boolean = false)
        {
            if( this.filterPresetDateRange === "thisMonth" )
            {
                this.filter.startDate = moment().startOf( 'month' ).toDate();
                this.filter.endDate = moment().endOf( 'month' ).toDate();
            }
            else if( this.filterPresetDateRange === "lastMonth" )
            {
                var lastMonth = moment().subtract( 1, 'months' );
                this.filter.startDate = lastMonth.startOf( 'month' ).toDate();
                this.filter.endDate = lastMonth.endOf( 'month' ).toDate();
            }
            else if( this.filterPresetDateRange === "thisYear" )
            {
                this.filter.startDate = moment().startOf( 'year' ).toDate();
                this.filter.endDate = moment().endOf( 'year' ).toDate();
            }
            else if( this.filterPresetDateRange === "lastYear" )
            {
                var lastYear = moment().subtract( 1, 'years' );
                this.filter.startDate = lastYear.startOf( 'year' ).toDate();
                this.filter.endDate = lastYear.endOf( 'year' ).toDate();
            }
            else if( this.filterPresetDateRange === "oneYear" )
            {
                this.filter.startDate = moment().subtract( 1, 'years' ).toDate();
                this.filter.endDate = moment().toDate();
            }

            if( !suppressRefresh )
                this.refreshEntries();
        }

        onFilterDescriptionChange()
        {
            if( this.filter.description.length > 2 || this.filter.description.length == 0 )
                this.refreshEntries();
        }

        onEditTransactionCategoryChange()
        {

        }

        onCategoryManagerClosed(didMakeChanges: boolean)
        {
            this.shouldShowCategoryEditModal = false;
            if( didMakeChanges )
                this.fullRefresh();
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

    class SpendingChartEntry
    {
        parentCategoryId: number;
        parentCategoryDisplayName: string;
        sumTotal: number;
        numLedgerEntries: number;
    }

    class LedgerAccount
    {
        ledgerAccountId: number;
        groupId: number;
        accountName: string;
        syncType: string;
        accountType: string;
        createdByUserId: string;
        createdDateUtc: Date;
        plaidAccountId: string;
        syncLastUpdatedUtc: Date;
        syncBalance: number;
        bankName: string;

        // Not from server
        shouldShowInGrid: boolean;
    }

    class LedgerEntry
    {
        ledgerEntryId: number;
        ledgerAccountId: number;
        transactionDate: Date;
        description: string;
        financialCategoryId: number;
        tags: string;
        amount: number;
        accountName: string;
        categoryDisplayName: string;
    }

    class LedgerListEntry extends LedgerEntry
    {
        accountName: string;
    }

    class LedgerPageInfo
    {
        accounts: LedgerAccount[];
        entries: LedgerEntry[];
        rootFinancialCategory: FinancialCategory;
    }

    class FilterCriteria
    {
        description: string = "";
        startDate: Date = new Date();
        endDate: Date = new Date();
        category: string = "";
    }

    export class FinancialCategory
    {
        financialCategoryId: number;
        displayName: string;
        parentFinancialCategoryId: number|null;
        plaidCategoryIdMatchRegEx: string;
        childCategories: FinancialCategory[];
        dropDownLabel: string;
    }
}


CA.angularApp.component( "ledger", {
    templateUrl: "/ngApp/chtn/manager/financial/ledger.html",
    controller: Ally.LedgerController
} );

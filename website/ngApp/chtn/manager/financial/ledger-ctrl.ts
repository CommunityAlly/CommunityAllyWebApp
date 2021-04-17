declare var Plaid: any;

namespace Ally
{
    /**
     * The controller for the page to track group spending
     */
    export class LedgerController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "appCacheService", "uiGridConstants", "$rootScope", "$timeout"];

        isLoading: boolean = false;
        isLoadingEntries: boolean = false;
        ledgerGridOptions: uiGrid.IGridOptionsOf<LedgerEntry>;
        ledgerGridApi: uiGrid.IGridApiOf<LedgerEntry>;
        ledgerAccounts: LedgerAccount[] = [];
        accountsNeedingLogin: LedgerAccount[] = [];
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
        spendingChartData: number[] | null = null;
        spendingChartLabels: string[] | null = null;
        showDonut: boolean = true;
        preselectCategoryId: number | undefined;
        isSuperAdmin: boolean = false;
        homeName: string;
        allUnits: Ally.Unit[];
        plaidSuccessProgressMsg: string;
        splitAmountTotal: number;
        isSplitAmountEqual: boolean;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private appCacheService: AppCacheService,
            private uiGridConstants: uiGrid.IUiGridConstants,
            private $rootScope: ng.IRootScopeService,
            private $timeout: ng.ITimeoutService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;
            this.homeName = AppConfig.homeName || "Unit";

            this.ledgerGridOptions =
            {
                columnDefs:
                    [
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
                        { field: 'amount', displayName: 'Amount', width: 95, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: this.uiGridConstants.aggregationTypes.sum },
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
                onRegisterApi: ( gridApi ) =>
                {
                    this.ledgerGridApi = gridApi;

                    // Fix dumb scrolling
                    HtmlUtil.uiGridFixScroll();

                    gridApi.edit.on.afterCellEdit( this.$rootScope, ( rowEntity, colDef: any, newValue, oldValue ) =>
                    {
                        console.log( 'edited row amount:' + rowEntity.amount + ' Column', colDef, ' newValue:' + newValue + ' oldValue:' + oldValue );

                        // Ignore no changes
                        if( oldValue === newValue )
                            return;

                        if( colDef.field === "categoryDisplayName" && rowEntity.financialCategoryId === this.ManageCategoriesDropId )
                        {
                            rowEntity.financialCategoryId = oldValue;
                            this.shouldShowCategoryEditModal = true;
                            return;
                        }

                        const catEntry = this.flatCategoryList.find( c => c.financialCategoryId === rowEntity.financialCategoryId );
                        rowEntity.categoryDisplayName = catEntry ? catEntry.displayName : null;

                        const unitEntry = this.allUnits.find( c => c.unitId === rowEntity.associatedUnitId );
                        rowEntity.unitGridLabel = unitEntry ? unitEntry.name : null;

                        this.$http.put( "/api/Ledger/UpdateEntry", rowEntity ).then( () => this.regenerateDateDonutChart() );
                        //vm.msg.lastCellEdited = 'edited row id:' + rowEntity.id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue;
                        //$scope.$apply();
                    } );
                }
            };

            const preselectStartMillis = parseInt( this.appCacheService.getAndClear( "ledger_preselect_start" ) );
            if( !isNaN( preselectStartMillis ) )
            {
                // Let the page finish loading then update the filter or else the date filter will overwrite our date
                window.setTimeout( () =>
                {
                    this.filter.startDate = new Date( preselectStartMillis );
                    const preselectEndMillis = parseInt( this.appCacheService.getAndClear( "ledger_preselect_end" ) );
                    this.filter.endDate = new Date( preselectEndMillis );

                    this.preselectCategoryId = parseInt( this.appCacheService.getAndClear( "ledger_preselect_categoryId" ) );
                    if( isNaN( this.preselectCategoryId ) )
                        this.preselectCategoryId = undefined;

                    this.fullRefresh();
                }, 100 );
            }
            else
            {
                this.filter.startDate = moment().subtract( 30, 'days' ).toDate();
                this.filter.endDate = moment().toDate();

                this.fullRefresh();

                this.loadUnits();
            }
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

                    // Add only the first account needing login for a Plaid item
                    let accountsNeedingLogin = this.ledgerAccounts.filter( a => a.plaidNeedsRelogin );
                    this.accountsNeedingLogin = [];
                    for( let i = 0; i < accountsNeedingLogin.length; ++i )
                    {
                        if( !this.accountsNeedingLogin.find( a => a.plaidItemId === accountsNeedingLogin[i].plaidItemId ) )
                            this.accountsNeedingLogin.push( accountsNeedingLogin[i] );
                    }

                    const accountColumn = this.ledgerGridOptions.columnDefs.filter( c => c.field === "accountName" )[0];
                    accountColumn.filter.selectOptions = this.ledgerAccounts.map( a => { return { value: a.accountName, label: a.accountName } } );

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

                    this.updateLocalData();

                    const uiGridCategoryDropDown = [];
                    uiGridCategoryDropDown.push( { id: null, value: "" } );
                    for( let i = 0; i < this.flatCategoryList.length; ++i )
                    {
                        uiGridCategoryDropDown.push( { id: this.flatCategoryList[i].financialCategoryId, value: this.flatCategoryList[i].dropDownLabel } );
                    }
                    uiGridCategoryDropDown.push( { id: this.ManageCategoriesDropId, value: "Manage Categories..." } );

                    const categoryColumn = this.ledgerGridOptions.columnDefs.find( c => c.field === "categoryDisplayName" );
                    categoryColumn.editDropdownOptionsArray = uiGridCategoryDropDown;

                    if( this.preselectCategoryId )
                    {
                        window.setTimeout( () =>
                        {
                            const selectedCatEntry = this.flatCategoryList.filter( c => c.financialCategoryId === this.preselectCategoryId )[0];
                            this.preselectCategoryId = undefined;

                            const categoryColumn = this.ledgerGridApi.grid.columns.filter( c => c.displayName === "Category" )[0];
                            categoryColumn.filters[0] = {
                                term: selectedCatEntry.displayName
                            };
                        }, 100 );
                    }

                    if( this.allUnits )
                        this.populateGridUnitLabels();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Populate the text that is shown for the unit column and split for category
         */
        populateGridUnitLabels()
        {
            // Populate the unit names for the grid
            _.each( this.allEntries, ( entry ) =>
            {
                if( entry.isSplit )
                    entry.categoryDisplayName = "(split)";

                if( !entry.associatedUnitId )
                    return;

                entry.unitGridLabel = this.allUnits.find( u => u.unitId === entry.associatedUnitId ).name;
            } );
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
                this.updateLocalData();

                this.populateGridUnitLabels();
            } );
        }


        updateLocalData()
        {
            const enabledAccountIds = this.ledgerAccounts.filter( a => a.shouldShowInGrid ).map( a => a.ledgerAccountId );

            const filteredList = this.allEntries.filter( e => enabledAccountIds.indexOf( e.ledgerAccountId ) > -1 );

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

            const flattenedTransactions = [];
            for( let i = 0; i < this.allEntries.length; ++i )
            {
                if( this.allEntries[i].isSplit )
                {
                    for( let e of this.allEntries[i].splitEntries )
                        flattenedTransactions.push( e );
                }
                else
                    flattenedTransactions.push( this.allEntries[i] );
            }

            const entriesByParentCat = _.groupBy( flattenedTransactions, e => getParentCategoryId( e.financialCategoryId ) );

            let spendingChartEntries: SpendingChartEntry[] = [];

            // Go through all the parent categories and sum the transactions under them
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

            // Force redraw
            this.showDonut = false;
            this.$timeout( () => this.showDonut = true, 100 );
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

            window.setTimeout( () => document.getElementById( "transaction-amount-input" ).focus(), 50 );
        }


        completePlaidSync( accessToken: string, updatePlaidItemId: string, selectedAccountIds: string[] )
        {
            this.isLoading = true;
            this.plaidSuccessProgressMsg = "Contacting Plaid server for selected account information";

            const postData = {
                accessToken,
                updatePlaidItemId,
                selectedAccountIds
            };

            const postUri = updatePlaidItemId ? "/api/Plaid/UpdateAccessToken" : "/api/Plaid/ProcessNewAccessToken";
            this.$http.post( postUri, postData ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<LedgerAccount[]> ) =>
                {
                    this.isLoading = false;

                    this.plaidSuccessProgressMsg = "Account information successfully retrieved";

                    this.newPlaidAccounts = httpResponse.data;

                    if( updatePlaidItemId )
                        window.location.reload();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    this.plaidSuccessProgressMsg = "Failed to retrieve account information from Plaid: " + httpResponse.data.exceptionMessage;
                    alert( "Failed to link: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        showAddAccount()
        {
            this.createAccountInfo = new CreateAccountInfo();
            this.createAccountInfo.type = null; // Explicitly set to simplify UI logic
        }


        updateAccountLink( ledgerAccount: LedgerAccount )
        {
            //this.createAccountInfo = new CreateAccountInfo();
            //this.createAccountInfo.type = null; // Explicitly set to simplify UI logic

            if( !this.isPremiumPlanActive )
                return;

            this.isLoading = true;

            this.$http.get( "/api/Plaid/UpdateLinkToken/" + ledgerAccount.plaidItemId ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    this.isLoading = false;

                    if( !httpResponse.data )
                        return;

                    this.plaidHandler = Plaid.create( {
                        token: httpResponse.data,
                        onSuccess: ( public_token: string, metadata: any ) =>
                        {
                            console.log( "Plaid update onSuccess" );
                            this.completePlaidSync( public_token, ledgerAccount.plaidItemId, null );
                        },
                        onLoad: () => { },
                        onExit: ( err: any, metadata: any ) => { console.log( "onExit.err", err, metadata ); },
                        onEvent: ( eventName: string, metadata: any ) => { console.log( "onEvent.eventName", eventName, metadata ); },
                        receivedRedirectUri: null,
                    } );

                    this.plaidHandler.open();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to start account update: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user wants to edit a transaction
         */
        editEntry( entry: LedgerEntry )
        {
            this.editingTransaction = _.clone( entry );
            if( this.editingTransaction.isSplit )
                this.onSplitAmountChange();
        }


        /**
         * Occurs when the user wants to delete a transaction
         */
        deleteEntry( entry: LedgerEntry )
        {
            if( !confirm( "Are you sure you want to delete this entry? Deletion is permanent." ) )
                return;

            this.isLoading = true;

            this.$http.delete( "/api/Ledger/DeleteEntry/" + entry.ledgerEntryId ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.editAccount = null;
                    this.editingTransaction = null;
                    this.fullRefresh();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to delete: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user clicks the button to save transaction details
         */
        onSaveEntry()
        {
            if( !this.editingTransaction.isSplit )
            {
                if( !this.editingTransaction.description )
                {
                    alert( "Description is required" );
                    return;
                }

                if( !this.editingTransaction.amount )
                {
                    alert( "Non-zero amount is required" );
                    return;
                }
            }
            else
            {
                for( let i = 0; i < this.editingTransaction.splitEntries.length; ++i )
                {
                    if( !this.editingTransaction.splitEntries[i].amount )
                    {
                        alert( "A non-zero amount is required for all split transaction entries" );
                        return;
                    }
                }
            }

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
            if( this.createAccountInfo )
                this.createAccountInfo.type = 'plaid';

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
                            console.log( "Plaid onSuccess", metadata );

                            let selectedAccountIds: string[] = null;
                            if( metadata && metadata.accounts && metadata.accounts.length > 0 )
                                selectedAccountIds = metadata.accounts.map( ( a: any ) => a.id );

                            this.completePlaidSync( public_token, null, selectedAccountIds );
                        },
                        onLoad: () => { },
                        onExit: ( err: any, metadata: any ) => { console.log( "update onExit.err", err, metadata ); },
                        onEvent: ( eventName: string, metadata: any ) => { console.log( "update onEvent.eventName", eventName, metadata ); },
                        receivedRedirectUri: null,
                    } );

                    this.plaidHandler.open();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to start Plaid sign-up: " + httpResponse.data.exceptionMessage );

                    this.closeAccountAndReload();
                }
            );

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


        syncPlaidAccounts( shouldSyncRecent: boolean )
        {
            this.isLoading = true;

            const getUri = shouldSyncRecent ? "/api/Plaid/SyncRecentTransactions" : "/api/Plaid/SyncTwoYearTransactions";
            this.$http.get( getUri ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.refreshEntries();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to sync: " + httpResponse.data.exceptionMessage );

                    if( httpResponse.data.exceptionMessage && httpResponse.data.exceptionMessage.indexOf( "login credentials" ) > -1 )
                        window.location.reload();
                }
            );
        }


        onFilterDescriptionChange()
        {
            if( this.filter.description.length > 2 || this.filter.description.length == 0 )
                this.refreshEntries();
        }


        onEditTransactionCategoryChange()
        {

        }

        onCategoryManagerClosed( didMakeChanges: boolean )
        {
            this.shouldShowCategoryEditModal = false;
            if( didMakeChanges )
                this.fullRefresh();
        }


        loadUnits()
        {
            this.$http.get( "/api/Unit" ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.Unit[]> ) =>
                {
                    this.allUnits = httpResponse.data;

                    const shouldSortUnitsNumerically = _.every( this.allUnits, u => HtmlUtil.isNumericString( u.name ) );

                    if( shouldSortUnitsNumerically )
                        this.allUnits = _.sortBy( this.allUnits, u => parseFloat( u.name ) );

                    // Populate the object used for quick editing the home
                    const uiGridUnitDropDown = [];
                    uiGridUnitDropDown.push( { id: null, value: "" } );
                    for( let i = 0; i < this.allUnits.length; ++i )
                    {
                        uiGridUnitDropDown.push( { id: this.allUnits[i].unitId, value: this.allUnits[i].name } );
                    }

                    const unitColumn = this.ledgerGridOptions.columnDefs.find( c => c.field === "unitGridLabel" );
                    unitColumn.editDropdownOptionsArray = uiGridUnitDropDown;

                    // If we already have entries, populate the label for the grid
                    if( this.allEntries )
                        this.populateGridUnitLabels();
                },
                () =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve your association's home listing, please contact support." );
                }
            );
        }


        onDeleteAccount()
        {
            if( !confirm( "Are you sure you want to remove this account?" ) )
                return;

            this.isLoading = true;

            this.$http.delete( "/api/Ledger/DeleteAccount/" + this.editAccount.ledgerAccountId ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.editAccount = null;
                    this.fullRefresh();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to delete: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        splitTransaction()
        {
            if( !this.editingTransaction.splitEntries )
                this.editingTransaction.splitEntries = [];

            this.editingTransaction.splitEntries.push( new LedgerEntry() );
            this.editingTransaction.isSplit = true;
        }


        onSplitAmountChange()
        {
            this.splitAmountTotal = this.editingTransaction.splitEntries.reduce( ( sum, e ) => sum + e.amount, 0 );

            const roundedSplit = Math.round( this.splitAmountTotal * 100 );
            const roundedTotal = Math.round( this.editingTransaction.amount * 100 );
            this.isSplitAmountEqual = roundedSplit === roundedTotal;
        }


        removeSplit( splitEntry: LedgerEntry )
        {
            this.editingTransaction.splitEntries.splice( this.editingTransaction.splitEntries.indexOf( splitEntry ), 1 );
            this.onSplitAmountChange();
        }


        /** Export the transactions list as a CSV */
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
                    headerText: "Account",
                    fieldName: "accountName"
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

            var csvDataString = Ally.createCsvString( this.ledgerGridOptions.data as LedgerEntry[], csvColumns );

            HtmlUtil2.downloadCsv( csvDataString, "Transactions.csv" );
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
        plaidItemId: string;
        syncLastUpdatedUtc: Date;
        syncBalance: number;
        bankName: string;
        plaidNeedsRelogin: boolean;

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
        addedDateUtc: Date;
        plaidTransactionId: string;
        associatedUnitId: number | null;
        isSplit: boolean;
        parentLedgerEntryId: number | null;
        accountName: string;
        categoryDisplayName: string;
        splitEntries: LedgerEntry[] | null;

        unitGridLabel: string;
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
        parentFinancialCategoryId: number | null;
        plaidCategoryIdMatchRegEx: string;
        childCategories: FinancialCategory[];
        dropDownLabel: string;
    }
}


CA.angularApp.component( "ledger", {
    templateUrl: "/ngApp/chtn/manager/financial/ledger.html",
    controller: Ally.LedgerController
} );

namespace Ally
{
    /**
     * The controller for the component to manage financial categories
     */
    export class FinancialCategoryManagerController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "appCacheService", "$rootScope"];

        isLoading: boolean = false;
        onClosed: ( didMakeChanges: any ) => void;
        rootFinancialCategory: FinancialCategory;
        flatCategoryList: FinancialCategory[];
        selectedCategory: FinancialCategory = null;
        newCategoryParent: FinancialCategory = null;
        deleteCategoryRessignTo: FinancialCategory = null;
        editName: string;
        newName: string;
        shouldShowNewCategoryArea: boolean = false;
        shouldShowDeleteCategoryArea: boolean = false;
        didMakeChanges: boolean = false;
        preselectById: number|null = null;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private appCacheService: AppCacheService,
            private $rootScope: ng.IRootScopeService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.refresh();
        }


        /**
         * Load all of the data on the page
         */
        refresh()
        {
            this.isLoading = true;

            this.$http.get( `/api/Ledger/FinancialCategories` ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<FinancialCategory> ) =>
                {
                    this.isLoading = false;

                    this.rootFinancialCategory = httpResponse.data;

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
                    visitNode( this.rootFinancialCategory, 0 );

                    this.selectedCategory = this.flatCategoryList[0];
                    if( this.preselectById )
                    {
                        const preselectCat = this.flatCategoryList.filter( c => c.financialCategoryId === this.preselectById );
                        if( preselectCat && preselectCat.length > 0 )
                            this.selectedCategory = preselectCat[0];
                        this.preselectById = null;
                    }

                    this.onCategorySelected();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage );
                }
            );
        }

        /**
        * Occurs when a category is selected from the list
        */
        onCategorySelected()
        {
            this.editName = this.selectedCategory ? this.selectedCategory.displayName : "";
        }


        /**
        * Called when the user wants to close the manager
        */
        closeManager()
        {
            this.onClosed( { didMakeChanges: this.didMakeChanges } );
        }


        /**
        * Display the section to add a new category
        */
        showNewCategoryArea()
        {
            this.shouldShowNewCategoryArea = true;
            this.shouldShowDeleteCategoryArea = false;
            this.newName = "";
            this.newCategoryParent = null;
        }


        /**
        * Update a category name
        */
        updateCategoryName()
        {
            if( !this.editName )
            {
                alert( "Please enter a name" );
                return;
            }

            this.isLoading = true;

            const putUri = `/api/Ledger/FinancialCategory/UpdateName/${this.selectedCategory.financialCategoryId}?newName=${encodeURIComponent( this.editName )}`;

            this.$http.put( putUri, null ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.didMakeChanges = true;
                    this.shouldShowNewCategoryArea = false;
                    this.newName = "";
                    this.preselectById = this.selectedCategory.financialCategoryId;
                    this.refresh();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to update: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
        * Called when the user wants to add a new category
        */
        saveNewCategory()
        {
            if( !this.newName )
            {
                alert( "Please enter a name" );
                return;
            }

            this.isLoading = true;

            let postUri = `/api/Ledger/FinancialCategory/Add?name=${encodeURIComponent( this.newName )}`;
            if( this.newCategoryParent )
                postUri += "&parentCategoryId=" + this.newCategoryParent.financialCategoryId;

            this.$http.post( postUri, null ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<number> ) =>
                {
                    this.isLoading = false;
                    this.didMakeChanges = true;
                    this.preselectById = httpResponse.data;
                    this.shouldShowNewCategoryArea = false;
                    this.refresh();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to save: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
        * Called when the user wants to remove a category
        */
        deleteCategory()
        {
            this.isLoading = true;

            let deleteUri = `/api/Ledger/FinancialCategory/${this.selectedCategory.financialCategoryId}`;
            if( this.deleteCategoryRessignTo )
                deleteUri += "?reassignToCategoryId=" + this.deleteCategoryRessignTo.financialCategoryId;

            this.$http.delete( deleteUri ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<number> ) =>
                {
                    this.isLoading = false;
                    this.didMakeChanges = true;
                    this.shouldShowDeleteCategoryArea = false;
                    this.refresh();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to delete: " + httpResponse.data.exceptionMessage );
                }
            );
        }
    }
}


CA.angularApp.component( "financialCategoryManager", {
    bindings: {
        onClosed: "&"
    },
    templateUrl: "/ngApp/chtn/manager/financial/financial-category-manager.html",
    controller: Ally.FinancialCategoryManagerController
} );
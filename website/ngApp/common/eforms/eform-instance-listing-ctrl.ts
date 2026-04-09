namespace Ally
{
    /**
     * The controller for viewing available E-form instances (the user's submitted and ones assigned-to)
     */
    export class EformInstanceListingController implements ng.IController
    {
        static $inject = ["$http", "fellowResidents", "$location", "SiteInfo", "uiGridConstants", "appCacheService"];
        isLoading: boolean = false;
        isLoadingResidents: boolean = false;
        pageInfo: EformListPageInfo;
        filteredInstances: EformInstanceDto[] = [];
        isSiteManager = false;
        shouldShowSubmitted = false;
        formStatusFilter: "active" | "complete" | null = null;
        eformGridOptions: uiGrid.IGridOptionsOf<EformInstanceDto>;
        public static readonly AssignToUserPrefix = "user:";
        static readonly AnonymousUserId = "00000000-0000-0000-0000-000000000000";


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private fellowResidents: Ally.FellowResidentsService,
            private $location: ng.ILocationService,
            private siteInfo: Ally.SiteInfoService,
            private uiGridConstants: uiGrid.IUiGridConstants,
            private appCacheService: AppCacheService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.shouldShowSubmitted = this.isSiteManager;

            this.eformGridOptions =
            {
                data: [],
                enableFiltering: false,
                columnDefs:
                    [
                        { field: 'template.templateName', displayName: 'Name', cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><a ng-cell-text href="#!/ViewEform/{{row.entity.eformInstanceId}}">{{row.entity.template.templateName}}</a></div>' },
                        { field: 'assignedToLabel', displayName: 'Assigned To' },
                        { field: 'submitterLabel', displayName: 'Submitted By', visible: this.shouldShowSubmitted },
                        { field: 'formStatus', displayName: 'Status' },
                        { field: 'submitDateUtc', displayName: 'Created', type: 'date', cellFilter: "date:'short'", sort: { direction: 'desc', priority: 0 } }
                    ],
                multiSelect: false,
                enableSorting: true,
                enableHorizontalScrollbar: window.innerWidth < 996 ? this.uiGridConstants.scrollbars.ALWAYS : this.uiGridConstants.scrollbars.NEVER,
                enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                //enableFullRowSelection: true,
                enableColumnMenus: false,
                //enableGridMenu: true,
                //enableRowHeaderSelection: false,
            };

            // Tell the E-form logic to return to this listing on save
            this.appCacheService.set(EformTemplateDto.AppCacheKeyReturnUrl, "/EformInstanceListing" );

            this.loadInstances();
        }


        /**
         * Populate the assigned to and submitter labels for a form instance
         */
        public static populateUserNameLabels( fellowResidents: FellowResidents, curInstance: EformInstanceDto )
        {
            const allResidents = fellowResidents.residents;

            // If this form is assigned to a specific user, find their name
            if( curInstance.currentAssignedUserOrGroup && curInstance.currentAssignedUserOrGroup.startsWith( EformInstanceListingController.AssignToUserPrefix ) )
            {
                const userId = curInstance.currentAssignedUserOrGroup.substring( EformInstanceListingController.AssignToUserPrefix.length );
                if( userId === EformInstanceListingController.AnonymousUserId )
                    curInstance.assignedToLabel = "Anonymous";
                else
                    curInstance.assignedToLabel = allResidents.find( r => r.userId === userId )?.fullName;
            }
            // Otherwise just use the group name
            else
                curInstance.assignedToLabel = curInstance.currentAssignedUserOrGroup;

            // If this form was submitted as anonymous, then show that
            if( curInstance.submitterUserId === EformInstanceListingController.AnonymousUserId )
                curInstance.submitterLabel = "Anonymous";
            else
            {
                const submitterResident = allResidents.find( r => r.userId === curInstance.submitterUserId );
                if( submitterResident )
                {
                    curInstance.submitterLabel = submitterResident.fullName;
                    const submittersUnitIds = submitterResident.homes ? submitterResident.homes.map( h => h.unitId ) : [];
                    curInstance.submittersHomes = fellowResidents.byUnit.filter( u => submittersUnitIds.includes( u.unitId ) );

                    curInstance.submittersEmail = submitterResident.email;
                    curInstance.submittersPhone = submitterResident.phoneNumber;
                }
                curInstance.submitterLabel = allResidents.find( r => r.userId === curInstance.submitterUserId )?.fullName;
                if( !curInstance.submitterLabel )
                    curInstance.submitterLabel = "N/A";
            }

            // Hook up the last edit user names
            for( const curSection of curInstance.sections )
            {
                if( curSection.lastEditUserId === EformInstanceListingController.AnonymousUserId )
                    curSection.lastEditUserLabel = "Anonymous";
                else
                    curSection.lastEditUserLabel = allResidents.find( r => r.userId === curSection.lastEditUserId )?.fullName;
            }
        }


        /**
         * Populate the assigned to and submitter labels for all form instances
         */
        public static populateUserNameLabelsForList( fellowResidents: FellowResidents, instances: EformInstanceDto[] )
        {
            for( const curInstance of instances )
                EformInstanceListingController.populateUserNameLabels( fellowResidents, curInstance );
        }


        /**
         * Loads the E-form instances for the user
         */
        loadInstances()
        {
            this.isLoading = true;

            this.$http.get( "/api/EformInstance/ForListPage" ).then(
                ( response: ng.IHttpPromiseCallbackArg<EformListPageInfo> ) =>
                {
                    this.isLoading = false;
                    this.pageInfo = response.data;
                    this.filteredInstances = this.pageInfo.instances;
                    this.eformGridOptions.data = this.filteredInstances;

                    this.isLoadingResidents = true;
                    this.fellowResidents.getByUnitsAndResidents().then( fr =>
                    {
                        this.isLoadingResidents = false;
                        EformInstanceListingController.populateUserNameLabelsForList( fr, this.pageInfo.instances );
                    } );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to load E-forms: " + response.data.exceptionMessage );
                }
            );
        }


        /**
         * Refresh the visible form list based on the current status filter selection
         */
        refreshFormStatusFilter()
        {
            if( this.formStatusFilter === "active" || this.formStatusFilter === "complete" )
                this.filteredInstances = this.pageInfo.instances.filter( i => i.formStatus === this.formStatusFilter );
            else
                this.filteredInstances = this.pageInfo.instances;

            this.eformGridOptions.data = this.filteredInstances;
        }
    }


    // Represents the API result for populating the E-form listing page
    class EformListPageInfo
    {
        instances: EformInstanceDto[];
        assignedToUserInstances: EformInstanceDto[];
    }
}

CA.angularApp.component( "eformInstanceListing", {
    bindings: {
    },
    templateUrl: "/ngApp/common/eforms/eform-instance-listing.html",
    controller: Ally.EformInstanceListingController
} );

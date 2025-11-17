namespace Ally
{
    /**
     * The controller for viewing available E-form instances (the user's submitted and ones assigned-to)
     */
    export class EformInstanceListingController implements ng.IController
    {
        static $inject = ["$http", "fellowResidents", "$location", "SiteInfo"];
        isLoading: boolean = false;
        isLoadingResidents: boolean = false;
        pageInfo: EformListPageInfo;
        filteredInstances: EformInstanceDto[] = [];
        isSiteManager = false;
        shouldShowSubmitted = false;
        formStatusFilter: "active" | "complete" | null = null;
        public static readonly AssignToUserPrefix = "user:";
        static readonly AnonymousUserId = "00000000-0000-0000-0000-000000000000";


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private fellowResidents: Ally.FellowResidentsService,
            private $location: ng.ILocationService,
            private siteInfo: Ally.SiteInfoService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.shouldShowSubmitted = this.isSiteManager;

            this.loadInstances();
        }


        public static populateUserNameLabels( allResidents: FellowChtnResident[], curInstance: EformInstanceDto )
        {
            if( curInstance.currentAssignedUserOrGroup && curInstance.currentAssignedUserOrGroup.startsWith( EformInstanceListingController.AssignToUserPrefix ) )
            {
                const userId = curInstance.currentAssignedUserOrGroup.substring( EformInstanceListingController.AssignToUserPrefix.length );
                if( userId === EformInstanceListingController.AnonymousUserId )
                    curInstance.assignedToLabel = "Anonymous";
                else
                    curInstance.assignedToLabel = allResidents.find( r => r.userId === userId )?.fullName;
            }
            else
                curInstance.assignedToLabel = curInstance.currentAssignedUserOrGroup;

            if( curInstance.submitterUserId === EformInstanceListingController.AnonymousUserId )
                curInstance.submitterLabel = "Anonymous";
            else
            {
                curInstance.submitterLabel = allResidents.find( r => r.userId === curInstance.submitterUserId )?.fullName;
                if( !curInstance.submitterLabel )
                    curInstance.submitterLabel = "N/A";
            }

            for( const curSection of curInstance.sections )
            {
                if( curSection.lastEditUserId === EformInstanceListingController.AnonymousUserId )
                    curSection.lastEditUserLabel = "Anonymous";
                else
                    curSection.lastEditUserLabel = allResidents.find( r => r.userId === curInstance.submitterUserId )?.fullName;
            }
        }


        public static populateUserNameLabelsForList( allResidents: FellowChtnResident[], instances: EformInstanceDto[] )
        {
            for( const curInstance of instances )
                EformInstanceListingController.populateUserNameLabels( allResidents, curInstance );
        }


        loadInstances()
        {
            this.isLoading = true;

            this.$http.get( "/api/EformInstance/ForListPage" ).then(
                ( response: ng.IHttpPromiseCallbackArg<EformListPageInfo> ) =>
                {
                    this.isLoading = false;
                    this.pageInfo = response.data;
                    this.filteredInstances = this.pageInfo.instances;

                    this.isLoadingResidents = true;
                    this.fellowResidents.getResidents().then( r =>
                    {
                        this.isLoadingResidents = false;
                        EformInstanceListingController.populateUserNameLabelsForList( r, this.pageInfo.instances );
                    } );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to load E-forms: " + response.data.exceptionMessage );
                }
            );
        }


        refreshFormStatusFilter()
        {
            if( this.formStatusFilter === "active" || this.formStatusFilter === "complete" )
                this.filteredInstances = this.pageInfo.instances.filter( i => i.formStatus === this.formStatusFilter );
            else
                this.filteredInstances = this.pageInfo.instances;
        }
    }


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

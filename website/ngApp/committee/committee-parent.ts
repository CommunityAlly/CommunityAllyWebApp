namespace Ally
{
    interface ICommitteeParentRouteParams extends ng.route.IRouteParamsService
    {
        committeeId: number;
        viewName: string;
    }


    /**
     * The controller for the committee parent view
     */
    export class CommitteeParentController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$routeParams", "$cacheFactory", "$rootScope"];

        canManage: boolean = false;
        initialView: string = "Home";
        selectedView: string = null;
        committeeId: number;
        committee: Ally.Committee;
        isLoading: boolean = false;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $routeParams: ICommitteeParentRouteParams, private $cacheFactory: ng.ICacheFactoryService, private $rootScope: ng.IRootScopeService )
        {
            this.committeeId = this.$routeParams.committeeId;
            this.initialView = this.$routeParams.viewName || "Home";
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;

            this.retrieveCommittee();
        }


        /*
         * Retreive the committee data
         */
        retrieveCommittee()
        {
            this.isLoading = true;

            // Set this flag so we don't redirect if sending results in a 403
            this.$rootScope.dontHandle403 = true;

            this.$http.get( "/api/Committee/" + this.committeeId, { cache: true } ).then(
                ( response: ng.IHttpPromiseCallbackArg<Ally.Committee> ) =>
                {
                    this.$rootScope.dontHandle403 = false;
                    this.isLoading = false;
                    this.committee = response.data;
                    this.selectedView = this.initialView;

                }, ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.$rootScope.dontHandle403 = false;
                this.isLoading = false;

                if( response.status === 403 )
                {
                    alert( "You are not authorized to view this private committee. You must be a member of the committee to view its contents. Reach out to a board member to inquire about joining the committiee." );
                    window.location.href = "/#!/Home";
                }
                else
                    alert( "Failed to load committee: " + response.data.exceptionMessage );
            }
            );
        }


        /*
         * Called after the user edits the committee name
         */
        onUpdateCommitteeName()
        {
            this.isLoading = true;

            const putUri = "/api/Committee/" + this.committeeId + "?name=" + this.committee.name;

            this.$http.put( putUri, null ).then(
                () =>
                {
                    this.isLoading = false;
                    this.$cacheFactory.get( '$http' ).remove( "/api/Committee/" + this.committeeId );
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to update the committee name: " + response.data.exceptionMessage );
                }
            );
        }
    }
}


CA.angularApp.component( "committeeParent", {
    templateUrl: "/ngApp/committee/committee-parent.html",
    controller: Ally.CommitteeParentController
} );
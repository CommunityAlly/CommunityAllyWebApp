/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
/// <reference path="../chtn/manager/manage-committees-ctrl.ts" />


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
        static $inject = ["$http", "SiteInfo", "$routeParams"];

        canManage = false;
        selectedView = "home";
        committeeId: number;
        committee: Ally.Committee;
        isLoading = false;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $routeParams: ICommitteeParentRouteParams )
        {
            this.committeeId = this.$routeParams.committeeId;
            this.selectedView = this.$routeParams.viewName || "home";
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.canManage = this.siteInfo.userInfo.isSiteManager;

            this.retrieveCommittee();
        }


        /*
         * Retreive the committee data
         */
        retrieveCommittee()
        {
            this.isLoading = true;

            var innerThis = this;
            this.$http.get( "/api/Committee/" + this.committeeId ).success(( committee: Ally.Committee ) =>
            {
                innerThis.isLoading = false;
                innerThis.committee = committee;
            } ).error(( exc: Ally.ExceptionResult ) =>
            {
                innerThis.isLoading = false;
                alert( "Failed to load committee: " + exc.exceptionMessage );
            } );
        }


        /*
         * Called after the user edits the committee name
         */
        onUpdateCommitteeName()
        {
            this.isLoading = true;

            var putUri = "/api/Committee/" + this.committeeId + "?newName=" + this.committee.name;
            var innerThis = this;
            this.$http.put( putUri, null ).success(() =>
            {
                innerThis.isLoading = false;
            } ).error(( exc: Ally.ExceptionResult ) =>
            {
                innerThis.isLoading = false;
                alert( "Failed to update the committee name: " + exc.exceptionMessage );
            } );
        }
    }
}


CA.angularApp.component( "committeeParent", {
    templateUrl: "/ngApp/committee/committee-parent.html",
    controller: Ally.CommitteeParentController
} );
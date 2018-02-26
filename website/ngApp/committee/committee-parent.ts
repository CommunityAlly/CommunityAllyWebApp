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
        static $inject = ["$http", "SiteInfo", "$routeParams", "$cacheFactory"];

        canManage: boolean = false;
        initialView: string = "Home";
        selectedView: string = null;
        committeeId: number;
        committee: Ally.Committee;
        isLoading: boolean = false;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $routeParams: ICommitteeParentRouteParams, private $cacheFactory: ng.ICacheFactoryService )
        {
            this.committeeId = this.$routeParams.committeeId;
            this.initialView = this.$routeParams.viewName || "Home";
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

            this.$http.get( "/api/Committee/" + this.committeeId, { cache: true } ).then( ( response: ng.IHttpPromiseCallbackArg<Ally.Committee> ) =>
            {
                this.isLoading = false;
                this.committee = response.data;
                this.selectedView = this.initialView;

            }, ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to load committee: " + response.data.exceptionMessage );
            } );
        }


        /*
         * Called after the user edits the committee name
         */
        onUpdateCommitteeName()
        {
            this.isLoading = true;

            var putUri = "/api/Committee/" + this.committeeId + "?newName=" + this.committee.name;

            this.$http.put( putUri, null ).then(() =>
            {
                this.isLoading = false;
                this.$cacheFactory.get( '$http' ).remove( "/api/Committee/" + this.committeeId );

            },( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to update the committee name: " + response.data.exceptionMessage );
            } );
        }
    }
}


CA.angularApp.component( "committeeParent", {
    templateUrl: "/ngApp/committee/committee-parent.html",
    controller: Ally.CommitteeParentController
} );
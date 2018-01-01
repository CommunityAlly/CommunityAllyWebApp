/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />


namespace Ally
{
    interface IDiscussionManageRouteParams extends ng.route.IRouteParamsService
    {
        idValue: string;
    }
      
    export class DiscussionThread
    {
        discussionId: number;
        title: string;
        creatorUserId: string;
        creationDateUtc: Date;
    }


    /**
     * The controller for the page that lets users unsubscribe from discussions
     */
    export class DiscussionManageController implements ng.IController
    {
        static $inject = ["$http", "$routeParams"];

        isLoading: boolean = false;
        discussion: Ally.DiscussionThread;
        activeView: string = "loading";
        errorMessage: string;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private $routeParams: IDiscussionManageRouteParams )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.unsubscribeUser();
        }


        /**
        * Load the discussion details
        */
        loadDiscussion()
        {
            var idVal = decodeURIComponent( this.$routeParams.idValue );

            this.isLoading = true;

            var innerThis = this;
            this.$http.get( "/Discussion/" + idVal ).then(( httpResponse: ng.IHttpPromiseCallbackArg<Ally.DiscussionThread> ) =>
            {
                innerThis.isLoading = false;
                innerThis.discussion = httpResponse.data;

            }, ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                innerThis.isLoading = false;
                innerThis.errorMessage = "Failed to find the discussion details. Please contact support to alert them to the issue.";
            } );
        }


        /**
         * Unsubscribe the user from the discussion
         */
        unsubscribeUser()
        {
            var idVal = decodeURIComponent( this.$routeParams.idValue );

            this.isLoading = true;
            this.activeView = "loading";

            var innerThis = this;
            this.$http.put( "/api/Discussion/Unsubscribe/" + idVal, null ).then(( httpResponse: ng.IHttpPromiseCallbackArg<DiscussionThread> ) =>
            {
                innerThis.isLoading = false;
                innerThis.activeView = "unsubscribed";
                innerThis.discussion = httpResponse.data;

            }, ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                innerThis.isLoading = false;
                innerThis.activeView = "error";
                innerThis.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
            } );
        }


        /**
         * Resubscribe the user to a discussion
         */
        resubscribeUser()
        {
            var idVal = decodeURIComponent( this.$routeParams.idValue );

            this.isLoading = true;
            this.activeView = "loading";

            var innerThis = this;
            this.$http.put( "/api/Discussion/Resubscribe/" + idVal, null ).then(( httpResponse: ng.IHttpPromiseCallbackArg<DiscussionThread> ) =>
            {
                innerThis.isLoading = false;
                innerThis.activeView = "resubscribed";

            }, ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                innerThis.isLoading = false;
                innerThis.activeView = "error";
                innerThis.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
            } );
        }
    }
}


CA.angularApp.component( "discussionManage", {
    templateUrl: "/ngApp/chtn/public/discussion-manage.html",
    controller: Ally.DiscussionManageController
} );
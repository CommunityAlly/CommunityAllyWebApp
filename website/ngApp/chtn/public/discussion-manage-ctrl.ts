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
            const idVal = decodeURIComponent( this.$routeParams.idValue );

            this.isLoading = true;

            this.$http.get( "/Discussion/" + idVal ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.DiscussionThread> ) =>
                {
                    this.isLoading = false;
                    this.discussion = httpResponse.data;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.errorMessage = "Failed to find the discussion details. Please contact support to alert them to the issue.";
                    console.log( "Failed to load discussion", httpResponse.data );
                }
            );
        }


        /**
         * Unsubscribe the user from the discussion
         */
        unsubscribeUser()
        {
            const idVal = decodeURIComponent( this.$routeParams.idValue );

            this.isLoading = true;
            this.activeView = "loading";

            this.$http.put( "/api/Discussion/Unsubscribe/" + idVal, null ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<DiscussionThread> ) =>
                {
                    this.isLoading = false;
                    this.activeView = "unsubscribed";
                    this.discussion = httpResponse.data;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.activeView = "error";
                    this.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
                    console.log( "Failed to unsubscribe", httpResponse.data );
                }
            );
        }


        /**
         * Resubscribe the user to a discussion
         */
        resubscribeUser()
        {
            const idVal = decodeURIComponent( this.$routeParams.idValue );

            this.isLoading = true;
            this.activeView = "loading";

            this.$http.put( "/api/Discussion/Resubscribe/" + idVal, null ).then(
                () =>
                {
                    this.isLoading = false;
                    this.activeView = "resubscribed";
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.activeView = "error";
                    this.errorMessage = "Failed to resubscribe you to the discussion due to a server error.";
                    console.log( "Failed to resubscribe", httpResponse.data );
                }
            );
        }
    }
}


CA.angularApp.component( "discussionManage", {
    templateUrl: "/ngApp/chtn/public/discussion-manage.html",
    controller: Ally.DiscussionManageController
} );
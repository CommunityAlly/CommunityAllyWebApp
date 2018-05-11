namespace Ally
{
    export class CommentThread
    {
        commentThreadId: number;
        groupId: number;
        title: string;
        createDateUtc: Date;
        authorUserId: string;
        authorFullName: string;
        lastCommentDateUtc: Date;
        lastCommentAuthorName: string;
    }

    /**
     * The controller for the committee home page
     */
    export class GroupCommentThreadsController implements ng.IController
    {
        static $inject = ["$http", "$rootScope", "SiteInfo"];

        isLoading: boolean = false;
        editComment: any;
        viewingThread: CommentThread = null;
        commentThreads: CommentThread[];
        showCreateNewModal: boolean = false;
        newThreadTitle: string;
        newThreadBody: string;
        newThreadIsBoardOnly: boolean;
        newThreadErrorMessage: string;
        showBoardOnly: boolean = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private $rootScope: ng.IRootScopeService, private siteInfo: SiteInfoService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.showBoardOnly = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;

            this.editComment = {
                commentText: "",
                replyToCommentId: null
            };

            this.refreshCommentThreads();
        }

        
        setDisplayCreateModal( shouldShow: boolean )
        {
            this.showCreateNewModal = shouldShow;
            this.newThreadTitle = "";
            this.newThreadBody = "";
            this.newThreadIsBoardOnly = false;
            this.newThreadErrorMessage = "";
        }


        displayDiscussModal( thread: CommentThread )
        {
            this.viewingThread = thread;
        }


        hideDiscussModal()
        {
            this.viewingThread = null;
        }


        createNewThread()
        {
            this.isLoading = true;
            this.newThreadErrorMessage = null;

            var createInfo = {
                title: this.newThreadTitle,
                body: this.newThreadBody,
                isBoardOnly: this.newThreadIsBoardOnly
            };

            this.$http.post( "/api/CommentThread", createInfo ).then( ( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.showCreateNewModal = false;
                this.refreshCommentThreads();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                this.newThreadErrorMessage = response.data.exceptionMessage
            } );
        }


        /**
         * Retrieve the comments from the server for the current thread
         */
        refreshCommentThreads()
        {
            this.isLoading = true;

            this.$http.get( "/api/CommentThread" ).then( ( response: ng.IHttpPromiseCallbackArg<CommentThread[]> ) =>
            {
                this.isLoading = false;
                this.commentThreads = response.data;

                var markDates = ( c: CommentThread ) =>
                {
                    c.createDateUtc = moment.utc( c.createDateUtc ).toDate();
                    
                    //c.isMyComment = c.authorUserId === this.$rootScope.userInfo.userId;
                };

                // Convert the UTC dates to local dates and mark the user's comments
                _.each( this.commentThreads, markDates );

                this.commentThreads = _.sortBy( this.commentThreads, ct => ct.createDateUtc ).reverse();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
            } );
        }
    }
}
    

CA.angularApp.component( "groupCommentThreads", {
    templateUrl: "/ngApp/services/group-comment-threads.html",
    controller: Ally.GroupCommentThreadsController
} );
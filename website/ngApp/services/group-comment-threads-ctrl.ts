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
        static $inject = ["$http", "$rootScope", "SiteInfo", "$scope"];

        isLoading: boolean = false;
        editComment: any;
        viewingThread: CommentThread = null;
        commentThreads: CommentThread[];
        showCreateNewModal: boolean = false;
        newThreadTitle: string;
        newThreadBody: string;
        newThreadIsBoardOnly: boolean;
        shouldSendNoticeForNewThread: boolean;
        newThreadErrorMessage: string;
        showBoardOnly: boolean = false;
        committeeId: number;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private $rootScope: ng.IRootScopeService, private siteInfo: SiteInfoService, private $scope: ng.IScope )
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

            this.$scope.$on( "refreshCommentThreadList", ( event, data ) => this.refreshCommentThreads() );

            this.refreshCommentThreads();
        }

        
        setDisplayCreateModal( shouldShow: boolean )
        {
            this.showCreateNewModal = shouldShow;
            this.newThreadTitle = "";
            this.newThreadBody = "";
            this.newThreadIsBoardOnly = false;
            this.shouldSendNoticeForNewThread = true;
            this.newThreadErrorMessage = "";

            // If we're displaying the modal, focus on the title text box
            if( shouldShow )
                setTimeout( () => $( "#new-thread-title-text-box" ).focus(), 100 );
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
                isBoardOnly: this.newThreadIsBoardOnly,
                shouldSendNotice: this.shouldSendNoticeForNewThread,
                committeeId: this.committeeId
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

            var getUri = "/api/CommentThread";
            if( this.committeeId )
                getUri += "?committeeId=" + this.committeeId;

            this.$http.get( getUri ).then( ( response: ng.IHttpPromiseCallbackArg<CommentThread[]> ) =>
            {
                this.isLoading = false;
                this.commentThreads = response.data;
                
                this.commentThreads = _.sortBy( this.commentThreads, ct => ct.lastCommentDateUtc ).reverse();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
            } );
        }
    }
}
    

CA.angularApp.component( "groupCommentThreads", {
    bindings: {
        committeeId: "<?"
    },
    templateUrl: "/ngApp/services/group-comment-threads.html",
    controller: Ally.GroupCommentThreadsController
} );
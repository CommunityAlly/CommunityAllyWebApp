namespace Ally
{
    export class CommentThread
    {
        commentThreadId: number;
        groupId: number;
        title: string;
        createDateUtc: Date;
        archiveDateUtc: Date;
        authorUserId: string;
        pinnedDateUtc: Date;
        isReadOnly: boolean;
        authorFullName: string;
        lastCommentDateUtc: Date;
        lastCommentAuthorName: string;
    }


    /**
     * The controller for the discussion threads directive
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
        newThreadIsReadOnly: boolean;
        shouldSendNoticeForNewThread: boolean;
        newThreadErrorMessage: string;
        showBoardOnly: boolean = false;
        committeeId: number;
        archivedThreads: CommentThread[] = null;
        canCreateThreads: boolean = false;


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
            if( !this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads || this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads === "everyone" )
                this.canCreateThreads = true;
            else if( this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads === "board" )
                this.canCreateThreads = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;

            this.showBoardOnly = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;

            this.editComment = {
                commentText: "",
                replyToCommentId: null
            };

            this.$scope.$on( "refreshCommentThreadList", ( event, data ) => this.refreshCommentThreads( false ) );

            this.refreshCommentThreads( false );
        }

        
        setDisplayCreateModal( shouldShow: boolean )
        {
            this.showCreateNewModal = shouldShow;
            this.newThreadTitle = "";
            this.newThreadBody = "";
            this.newThreadIsBoardOnly = false;
            this.newThreadIsReadOnly = false;
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


        /**
         * Occurs when the user clicks the pin to toggle a thread's pinned status
         * @param thread
         */
        onClickPin( thread: CommentThread )
        {
            this.isLoading = true;

            this.$http.put( "/api/CommentThread/TogglePinned/" + thread.commentThreadId, null ).then(
                ( response: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.refreshCommentThreads();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to toggle: " + response.data.exceptionMessage );
                }
            );
        }


        createNewThread()
        {
            this.isLoading = true;
            this.newThreadErrorMessage = null;

            var createInfo = {
                title: this.newThreadTitle,
                body: this.newThreadBody,
                isBoardOnly: this.newThreadIsBoardOnly,
                isReadOnly: this.newThreadIsReadOnly,
                shouldSendNotice: this.shouldSendNoticeForNewThread,
                committeeId: this.committeeId
            };

            this.$http.post( "/api/CommentThread", createInfo ).then( ( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.showCreateNewModal = false;
                this.refreshCommentThreads( false );

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                this.newThreadErrorMessage = response.data.exceptionMessage
            } );
        }


        /**
         * Retrieve the comments from the server for the current thread
         */
        refreshCommentThreads( retrieveArchived: boolean = false )
        {
            this.isLoading = true;

            var getUri = "/api/CommentThread";

            if( retrieveArchived )
                getUri += "/Archived";

            if( this.committeeId )
                getUri += "?committeeId=" + this.committeeId;

            this.$http.get( getUri ).then( ( response: ng.IHttpPromiseCallbackArg<CommentThread[]> ) =>
            {
                this.isLoading = false;

                // Sort by comment date, put unpinned threads 100 years in the past so pinned always show up on top
                response.data = _.sortBy( response.data, ct => ct.pinnedDateUtc ? ct.pinnedDateUtc : moment( ct.lastCommentDateUtc ).subtract( "years", 100 ).toDate() ).reverse();

                if( retrieveArchived )
                    this.archivedThreads = response.data;
                else
                {
                    this.commentThreads = response.data;
                    this.archivedThreads = null;
                }
                
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
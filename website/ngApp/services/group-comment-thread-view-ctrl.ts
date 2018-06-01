namespace Ally
{
    class ReplyComment
    {
        replyToCommentId: number;
        commentText: string;
    }


    /**
     * The controller for the committee home page
     */
    export class GroupCommentThreadViewController implements ng.IController
    {
        static $inject = ["$http", "$rootScope"];

        isLoading: boolean = false;
        thread: CommentThread;
        comments: Comment[];
        onClosed: () => void;
        newCommentText: string;
        replyToCommentId: number;
        replyCommentText: string;
        editCommentId: number;
        editCommentText: string;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private $rootScope: ng.IRootScopeService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.retrieveComments();
        }


        onTextAreaKeyDown( e: any, messageType: string )
        {
            let keyCode = ( e.keyCode ? e.keyCode : e.which );

            let KeyCode_Enter = 13;
            if( e.keyCode == KeyCode_Enter )
            {
                e.preventDefault();

                if( messageType === "new" )
                    this.submitNewComment();
                else if( messageType === "edit" )
                    this.submitCommentEdit();
                else if( messageType === "reply" )
                    this.submitReplyComment();
            }
        }

        /**
         * Retrieve the comments from the server
         */
        retrieveComments()
        {
            this.isLoading = true;

            this.$http.get( `/api/CommentThread/${this.thread.commentThreadId}/Comments` ).then( ( response: ng.IHttpPromiseCallbackArg<Comment[]>) =>
            {
                this.isLoading = false;
                this.comments = response.data;

                let processComments = ( c: Comment ) =>
                {
                    c.isMyComment = c.authorUserId === this.$rootScope.userInfo.userId;

                    if( c.replies )
                        _.each( c.replies, processComments );
                };

                _.forEach( this.comments, processComments );

                this.comments = _.sortBy( this.comments, ct => ct.postDateUtc ).reverse();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
            } );
        }


        /**
         * Occurs when the user clicks the button to reply to a comment
         */
        startReplyToComment( comment: Comment )
        {
            this.replyToCommentId = comment.commentId;
            this.replyCommentText = "";

            setTimeout( () => $(".reply-to-textarea").focus(), 150 );
        }


        /**
         * Edit an existing comment
         * @param comment
         */
        startEditComment( comment: Comment )
        {
            this.editCommentId = comment.commentId;
            this.editCommentText = comment.commentText;
        };


        /**
         * Delete a comment
         */
        deleteComment( comment: Comment )
        {
            var deleteMessage = "Are you sure you want to delete this comment?";
            if( this.comments.length === 1 )
                deleteMessage = "Since there is only one comment, if you delete this comment you'll delete the thread. Are you sure you want to delete this comment?";

            if( !confirm( deleteMessage ) )
                return;

            this.isLoading = true;

            this.$http.delete( `/api/CommentThread/${this.thread.commentThreadId}/${comment.commentId}` ).then( () =>
            {
                this.isLoading = false;

                if( this.comments.length === 1 )
                {
                    this.$rootScope.$broadcast( "refreshCommentThreadList" );
                    this.closeModal( false );
                }
                else
                    this.retrieveComments();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to post comment: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Modify an existing comment
         */
        submitCommentEdit()
        {
            var editInfo = {
                commentId: this.editCommentId,
                newCommentText: this.editCommentText
            };

            this.isLoading = true;

            this.$http.put( `/api/CommentThread/${this.thread.commentThreadId}/EditComment`, editInfo ).then( () =>
            {
                this.isLoading = false;
                this.editCommentId = -1;
                this.editCommentText = "";
                this.retrieveComments();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;

                alert( "Failed to edit comment: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Add a comment in reply to another
         */
        submitReplyComment()
        {
            var newComment = {
                replyToCommentId: this.replyToCommentId,
                commentText: this.replyCommentText
            };

            this.isLoading = true;

            this.$http.put( `/api/CommentThread/${this.thread.commentThreadId}/AddComment`, newComment ).then( ( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.replyToCommentId = -1;
                this.replyCommentText = "";
                this.retrieveComments();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to add comment: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Add a new comment to this thread
         */
        submitNewComment()
        {
            var newComment = {
                commentText: this.newCommentText
            };

            this.isLoading = true;

            this.$http.put( `/api/CommentThread/${this.thread.commentThreadId}/AddComment`, newComment ).then( ( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.newCommentText = "";
                this.retrieveComments();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to add comment: " + response.data.exceptionMessage );
            } );
        }


        closeModal(isFromOverlayClick: boolean)
        {
            if( this.onClosed )
                this.onClosed();
        }
    }
}


CA.angularApp.component( "groupCommentThreadView", {
    bindings: {
        thread: "<",
        onClosed: "&"
    },
    templateUrl: "/ngApp/services/group-comment-thread-view.html",
    controller: Ally.GroupCommentThreadViewController
} );
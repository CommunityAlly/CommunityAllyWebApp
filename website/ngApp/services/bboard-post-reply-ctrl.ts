namespace Ally
{
    /**
     * The controller for the bulletin board comment reply directive
     */
    export class BBoardPostReplyController implements ng.IController
    {
        static $inject: string[] = ["$http", "SiteInfo", "$rootScope"];

        reply: Comment;
        thread: CommentThreadBBoard;
        depth: number;
        displayDepth: number;
        isLoading = false;
        shouldShowAttachmentFullScreen = false;
        shouldShowEditButton = false;
        isUserTheAuthor = false;
        isInEditMode = false;
        updatedCommentText: string;
        shouldRemoveAttachment = false;
        shouldShowReplyField = false;
        newReplyText: string;
        newReplyAttachmentFile: File;
        newReplyAttachmentPreviewUrl: string;
        usersAvatarUrl: string;
        replyDepth: number;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private siteInfo: SiteInfoService,
            private $rootScope: ng.IRootScopeService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isUserTheAuthor = this.reply.authorUserId === this.siteInfo.userInfo.userId;
            this.shouldShowEditButton = !this.reply.deletedDateUtc && this.isUserTheAuthor;// ( this.isUserTheAuthor || this.siteInfo.userInfo.isSiteManager );
            this.usersAvatarUrl = this.siteInfo.userInfo.avatarUrl;
            this.displayDepth = Math.min( 2, this.depth );
        }


        getFileIcon( fileName: string )
        {
            return HtmlUtil2.getFileIcon( fileName );
        }


        editComment()
        {
            this.isInEditMode = true;
            this.updatedCommentText = this.reply.commentText;
            this.shouldRemoveAttachment = false;
            window.setTimeout( () => document.getElementById( "bboard-post-reply-field-" + this.reply.commentId ).focus(), 50 );
        }


        submitCommentEdit()
        {
            const updateInfo: EditCommentInfo = {
                commentId: this.reply.commentId,
                newCommentText: this.updatedCommentText,
                shouldRemoveAttachment: this.shouldRemoveAttachment
            };

            this.isLoading = true;

            this.$http.put( `/api/CommentThread/${this.thread.commentThreadId}/EditComment`, updateInfo ).then(
                () =>
                {
                    this.isLoading = false;
                    this.$rootScope.$broadcast( "refreshSingleBBoardPost", this.thread.commentThreadId );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to edit comment: " + response.data.exceptionMessage );
                }
            );
        }


        removeComment()
        {
            if( !confirm( "Are you sure you want to delete this comment?" ) )
                return;

            this.isLoading = true;

            this.$http.delete( `/api/CommentThread/${this.thread.commentThreadId}/${this.reply.commentId}` ).then(
                () =>
                {
                    this.isLoading = false;
                    //this.reply.commentText = "[removed]";
                    //this.reply.attachedDocDisplayName = null;
                    //this.reply.attachedDocPath = null;
                    //this.reply.attachedDocPreviewUrl = null;
                    this.$rootScope.$broadcast( "refreshSingleBBoardPost", this.thread.commentThreadId );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to remove comment: " + response.data.exceptionMessage );
                }
            );
        }


        showReply()
        {
            this.shouldShowReplyField = true;
            this.newReplyText = "";
            this.newReplyAttachmentFile = null;
            this.newReplyAttachmentPreviewUrl = null;
            this.replyDepth = this.displayDepth + 1;
            if( this.replyDepth > 2 )
                this.replyDepth = this.displayDepth;

            window.setTimeout( () => document.getElementById( "bboard-post-reply-reply-" + this.reply.commentId ).focus(), 50 );
        }


        submitReply()
        {
            if( !this.newReplyText )
            {
                alert( "You must enter text to submit a comment" );
                return;
            }

            const newCommentFormData = new FormData();
            newCommentFormData.append( "commentText", this.newReplyText );
            newCommentFormData.append( "replyToCommentId", this.reply.commentId.toString() );
            
            if( this.newReplyAttachmentFile )// && this.attachmentFiles.length > 0 )
            {
                newCommentFormData.append( "attachedFile", this.newReplyAttachmentFile );

                //for( let i = 0; i < this.attachmentFiles.length; ++i )
                //    newCommentFormData.append( "attachedFile" + i, this.attachmentFiles[i] );
            }

            const putHeaders: ng.IRequestShortcutConfig = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };

            this.thread.isLoading = true;

            this.$http.put( `/api/CommentThread/${this.thread.commentThreadId}/AddCommentFromForm`, newCommentFormData, putHeaders ).then(
                () =>
                {
                    this.shouldShowReplyField = false;
                    this.thread.isLoading = false;
                    this.newReplyText = "";
                    this.removeReplyAttachment();
                    
                    //this.removeAttachment( curThread );

                    this.$rootScope.$broadcast( "refreshSingleBBoardPost", this.thread.commentThreadId );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.thread.isLoading = false;
                    alert( "Failed to add reply comment: " + response.data.exceptionMessage );
                }
            );
        }


        removeReplyAttachment()
        {
            this.newReplyAttachmentFile = null;
            this.newReplyAttachmentPreviewUrl = null;
        }


        openReplyAttachmentFilePicker()
        {
            const fileElemId = "file-attacher-reply-" + this.reply.commentId;
            document.getElementById( fileElemId ).click();
        }


        onAttachmentFileSelected( event: Event )
        {
            this.newReplyAttachmentFile = ( event.target as HTMLInputElement ).files[0];

            if( this.newReplyAttachmentFile )
                this.newReplyAttachmentPreviewUrl = URL.createObjectURL( this.newReplyAttachmentFile );
            else
                this.newReplyAttachmentPreviewUrl = null;
        }


        onViewAttachedDoc( comment: Comment )
        {
            BulletinBoardController.sharedViewAttachedDoc( comment, this.$http, this.siteInfo )
        }
    }
}


class EditCommentInfo
{
    commentId: number;
    newCommentText: string;
    shouldRemoveAttachment: boolean;
}


CA.angularApp.component( "bboardPostReply", {
    bindings: {
        reply: "<",
        thread: "<",
        depth: "<"
    },
    templateUrl: "/ngApp/services/bboard-post-reply.html",
    controller: Ally.BBoardPostReplyController
} );

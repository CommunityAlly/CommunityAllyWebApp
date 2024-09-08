var Ally;
(function (Ally) {
    /**
     * The controller for the bulletin board comment reply directive
     */
    class BBoardPostReplyController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.shouldShowAttachmentFullScreen = false;
            this.shouldShowEditButton = false;
            this.isUserTheAuthor = false;
            this.isInEditMode = false;
            this.shouldRemoveAttachment = false;
            this.shouldShowReplyField = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isUserTheAuthor = this.reply.authorUserId === this.siteInfo.userInfo.userId;
            this.shouldShowEditButton = !this.reply.deletedDateUtc && this.isUserTheAuthor; // ( this.isUserTheAuthor || this.siteInfo.userInfo.isSiteManager );
            this.usersAvatarUrl = this.siteInfo.userInfo.avatarUrl;
            this.displayDepth = Math.min(2, this.depth);
        }
        getFileIcon(fileName) {
            return Ally.HtmlUtil2.getFileIcon(fileName);
        }
        editComment() {
            this.isInEditMode = true;
            this.updatedCommentText = this.reply.commentText;
            this.shouldRemoveAttachment = false;
            window.setTimeout(() => document.getElementById("bboard-post-reply-field-" + this.reply.commentId).focus(), 50);
        }
        submitCommentEdit() {
            const updateInfo = {
                commentId: this.reply.commentId,
                newCommentText: this.updatedCommentText,
                shouldRemoveAttachment: this.shouldRemoveAttachment
            };
            this.isLoading = true;
            this.$http.put(`/api/CommentThread/${this.thread.commentThreadId}/EditComment`, updateInfo).then(() => {
                this.isLoading = false;
                this.$rootScope.$broadcast("refreshSingleBBoardPost", this.thread.commentThreadId);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to edit comment: " + response.data.exceptionMessage);
            });
        }
        removeComment() {
            if (!confirm("Are you sure you want to delete this comment?"))
                return;
            this.isLoading = true;
            this.$http.delete(`/api/CommentThread/${this.thread.commentThreadId}/${this.reply.commentId}`).then(() => {
                this.isLoading = false;
                //this.reply.commentText = "[removed]";
                //this.reply.attachedDocDisplayName = null;
                //this.reply.attachedDocPath = null;
                //this.reply.attachedDocPreviewUrl = null;
                this.$rootScope.$broadcast("refreshSingleBBoardPost", this.thread.commentThreadId);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to remove comment: " + response.data.exceptionMessage);
            });
        }
        showReply() {
            this.shouldShowReplyField = true;
            this.newReplyText = "";
            this.newReplyAttachmentFile = null;
            this.newReplyAttachmentPreviewUrl = null;
            this.replyDepth = this.displayDepth + 1;
            if (this.replyDepth > 2)
                this.replyDepth = this.displayDepth;
            window.setTimeout(() => document.getElementById("bboard-post-reply-reply-" + this.reply.commentId).focus(), 50);
        }
        submitReply() {
            if (!this.newReplyText) {
                alert("You must enter text to submit a comment");
                return;
            }
            const newCommentFormData = new FormData();
            newCommentFormData.append("commentText", this.newReplyText);
            newCommentFormData.append("replyToCommentId", this.reply.commentId.toString());
            if (this.newReplyAttachmentFile) // && this.attachmentFiles.length > 0 )
             {
                newCommentFormData.append("attachedFile", this.newReplyAttachmentFile);
                //for( let i = 0; i < this.attachmentFiles.length; ++i )
                //    newCommentFormData.append( "attachedFile" + i, this.attachmentFiles[i] );
            }
            const putHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            this.thread.isLoading = true;
            this.$http.put(`/api/CommentThread/${this.thread.commentThreadId}/AddCommentFromForm`, newCommentFormData, putHeaders).then(() => {
                this.shouldShowReplyField = false;
                this.thread.isLoading = false;
                this.newReplyText = "";
                this.removeReplyAttachment();
                //this.removeAttachment( curThread );
                this.$rootScope.$broadcast("refreshSingleBBoardPost", this.thread.commentThreadId);
            }, (response) => {
                this.thread.isLoading = false;
                alert("Failed to add reply comment: " + response.data.exceptionMessage);
            });
        }
        removeReplyAttachment() {
            this.newReplyAttachmentFile = null;
            this.newReplyAttachmentPreviewUrl = null;
        }
        openReplyAttachmentFilePicker() {
            const fileElemId = "file-attacher-reply-" + this.reply.commentId;
            document.getElementById(fileElemId).click();
        }
        onAttachmentFileSelected(event) {
            this.newReplyAttachmentFile = event.target.files[0];
            if (this.newReplyAttachmentFile)
                this.newReplyAttachmentPreviewUrl = URL.createObjectURL(this.newReplyAttachmentFile);
            else
                this.newReplyAttachmentPreviewUrl = null;
        }
        onViewAttachedDoc(comment) {
            Ally.BulletinBoardController.sharedViewAttachedDoc(comment, this.$http, this.siteInfo);
        }
    }
    BBoardPostReplyController.$inject = ["$http", "SiteInfo", "$rootScope"];
    Ally.BBoardPostReplyController = BBoardPostReplyController;
})(Ally || (Ally = {}));
class EditCommentInfo {
}
CA.angularApp.component("bboardPostReply", {
    bindings: {
        reply: "<",
        thread: "<",
        depth: "<"
    },
    templateUrl: "/ngApp/services/bboard-post-reply.html",
    controller: Ally.BBoardPostReplyController
});

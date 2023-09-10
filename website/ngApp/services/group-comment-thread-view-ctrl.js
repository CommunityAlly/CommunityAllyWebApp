var Ally;
(function (Ally) {
    class ReplyComment {
    }
    class CommentsState {
    }
    /**
     * The controller for the committee home page
     */
    class GroupCommentThreadViewController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo, $scope, $sce) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.$sce = $sce;
            this.isLoading = false;
            this.editCommentShouldRemoveAttachment = false;
            this.shouldShowAdminControls = false;
            this.digestFrequency = null;
            this.shouldShowAddComment = true;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.defaultDigestFrequency = this.siteInfo.userInfo.defaultDigestFrequency;
            this.shouldShowAdminControls = this.siteInfo.userInfo.isSiteManager;
            this.threadUrl = this.siteInfo.publicSiteInfo.baseUrl + "/#!/Home/DiscussionThread/" + this.thread.commentThreadId;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.retrieveComments();
            if (!this.thread.isReadOnly && !this.thread.archiveDateUtc)
                this.initCommentTinyMce("new-comment-tiny-mce-editor");
        }
        initCommentTinyMce(elemId) {
            // Auto-focus on replies and edits
            if (elemId === "reply-tiny-mce-editor" || elemId === "edit-tiny-mce-editor")
                GroupCommentThreadViewController.TinyMceSettings.autoFocusElemId = elemId;
            else
                GroupCommentThreadViewController.TinyMceSettings.autoFocusElemId = undefined;
            Ally.HtmlUtil2.initTinyMce(elemId, 200, GroupCommentThreadViewController.TinyMceSettings).then(e => {
                if (elemId === "reply-tiny-mce-editor")
                    this.replyTinyMceEditor = e;
                else if (elemId === "edit-tiny-mce-editor")
                    this.editTinyMceEditor = e;
                else
                    this.newCommentTinyMceEditor = e;
                // Hook up CTRL+enter to submit a comment
                e.shortcuts.add('ctrl+13', 'CTRL ENTER to submit comment', () => {
                    this.$scope.$apply(() => {
                        if (elemId === "reply-tiny-mce-editor")
                            this.submitReplyComment();
                        else if (elemId === "edit-tiny-mce-editor")
                            this.submitCommentEdit();
                        else
                            this.submitNewComment();
                    });
                });
            });
        }
        /**
         * Handle the key down message on the message text area
         */
        onTextAreaKeyDown(e, messageType) {
            // keyCode = ( e.keyCode ? e.keyCode : e.which );
            const KeyCode_Enter = 13;
            if (e.keyCode == KeyCode_Enter) {
                e.preventDefault();
                if (messageType === "new")
                    this.submitNewComment();
                else if (messageType === "edit")
                    this.submitCommentEdit();
                else if (messageType === "reply")
                    this.submitReplyComment();
            }
        }
        /**
         * Occurs when the user elects to set the thread digest frequency
         */
        onChangeDigestFrequency() {
            this.isLoading = true;
            const putUri = `/api/CommentThread/${this.thread.commentThreadId}/DigestFrequency/${this.commentsState.digestFrequency}`;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to change: " + response.data.exceptionMessage);
            });
        }
        /**
         * Retrieve the comments from the server
         */
        retrieveComments() {
            this.isLoading = true;
            this.$http.get(`/api/CommentThread/${this.thread.commentThreadId}/Comments`).then((response) => {
                this.isLoading = false;
                this.commentsState = response.data;
                const processComments = (c) => {
                    c.isMyComment = c.authorUserId === this.$rootScope.userInfo.userId;
                    c.commentText = this.$sce.trustAsHtml(c.commentText);
                    if (c.replies)
                        _.each(c.replies, processComments);
                };
                _.forEach(this.commentsState.comments, processComments);
                this.commentsState.comments = _.sortBy(this.commentsState.comments, ct => ct.postDateUtc).reverse();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve comments: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user clicks the button to reply to a comment
         */
        startReplyToComment(comment) {
            this.replyToCommentId = comment.commentId;
            this.replyCommentText = "";
            this.editCommentId = -1;
            this.shouldShowAddComment = false;
            this.initCommentTinyMce("reply-tiny-mce-editor");
        }
        /**
         * Edit an existing comment
         * @param comment
         */
        startEditComment(comment) {
            this.editCommentId = comment.commentId;
            this.editCommentText = comment.commentText;
            this.editCommentShouldRemoveAttachment = false;
            this.replyToCommentId = -1;
            this.shouldShowAddComment = false;
            this.initCommentTinyMce("edit-tiny-mce-editor");
        }
        /**
         * Delete a comment
         */
        deleteComment(comment) {
            let deleteMessage = "Are you sure you want to delete this comment?";
            if (this.commentsState.comments.length === 1)
                deleteMessage = "Since there is only one comment, if you delete this comment you'll delete the thread. Are you sure you want to delete this comment?";
            if (!confirm(deleteMessage))
                return;
            this.isLoading = true;
            this.$http.delete(`/api/CommentThread/${this.thread.commentThreadId}/${comment.commentId}`).then(() => {
                this.isLoading = false;
                if (this.commentsState.comments.length === 1) {
                    // Tell the parent thread list to refresh
                    this.$rootScope.$broadcast("refreshCommentThreadList");
                    this.closeModal(false);
                }
                else
                    this.retrieveComments();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to post comment: " + response.data.exceptionMessage);
            });
        }
        /**
         * Archive this thread
         */
        archiveThread(shouldArchive = true) {
            this.isLoading = true;
            let putUri = `/api/CommentThread/Archive/${this.thread.commentThreadId}`;
            if (!shouldArchive)
                putUri = `/api/CommentThread/Unarchive/${this.thread.commentThreadId}`;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
                // Tell the parent thread list to refresh
                this.$rootScope.$broadcast("refreshCommentThreadList");
                this.closeModal(false);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to archive: " + response.data.exceptionMessage);
            });
        }
        /**
         * Modify an existing comment
         */
        submitCommentEdit() {
            const editInfo = {
                commentId: this.editCommentId,
                newCommentText: this.editTinyMceEditor.getContent(),
                shouldRemoveAttachment: this.editCommentShouldRemoveAttachment
            };
            if (!editInfo.newCommentText) {
                alert("Comments cannot be empty. If you want to delete the comment, click the delete button.");
                return;
            }
            this.isLoading = true;
            this.$http.put(`/api/CommentThread/${this.thread.commentThreadId}/EditComment`, editInfo).then(() => {
                this.isLoading = false;
                this.editCommentId = -1;
                this.editCommentText = "";
                this.editCommentShouldRemoveAttachment = false;
                this.editTinyMceEditor.setContent("");
                this.removeAttachment();
                this.retrieveComments();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to edit comment: " + response.data.exceptionMessage);
            });
        }
        /**
         * Add a comment in reply to another
         */
        submitReplyComment() {
            const replyCommentText = this.replyTinyMceEditor.getContent();
            if (!replyCommentText) {
                alert("Please enter some text to add a reply");
                return;
            }
            const newCommentFormData = new FormData();
            newCommentFormData.append("commentText", replyCommentText);
            newCommentFormData.append("replyToCommentId", this.replyToCommentId.toString());
            //newCommentFormData.append( "attachedFile", null );
            //newCommentFormData.append( "attachedGroupDocId", null );
            const putHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            this.isLoading = true;
            this.$http.put(`/api/CommentThread/${this.thread.commentThreadId}/AddCommentFromForm`, newCommentFormData, putHeaders).then(() => {
                this.isLoading = false;
                this.replyToCommentId = -1;
                this.replyCommentText = "";
                this.replyTinyMceEditor.setContent("");
                this.removeAttachment();
                this.retrieveComments();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to add comment: " + response.data.exceptionMessage);
            });
        }
        /**
         * Add a new comment to this thread
         */
        submitNewComment() {
            const newCommentText = this.newCommentTinyMceEditor.getContent();
            if (!newCommentText) {
                alert("You must enter text to submit a comment");
                return;
            }
            const newCommentFormData = new FormData();
            newCommentFormData.append("commentText", newCommentText);
            if (this.attachmentFile)
                newCommentFormData.append("attachedFile", this.attachmentFile);
            //newCommentFormData.append( "attachedGroupDocId", null );
            const putHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            this.isLoading = true;
            this.$http.put(`/api/CommentThread/${this.thread.commentThreadId}/AddCommentFromForm`, newCommentFormData, putHeaders).then(() => {
                this.isLoading = false;
                this.newCommentText = "";
                this.newCommentTinyMceEditor.setContent("");
                this.removeAttachment();
                this.retrieveComments();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to add comment: " + response.data.exceptionMessage);
            });
        }
        closeModal(isFromOverlayClick) {
            if (this.onClosed)
                this.onClosed();
        }
        copyThreadLink($event) {
            $event.stopPropagation();
            $event.preventDefault();
            if (Ally.HtmlUtil2.copyTextToClipboard(this.threadUrl))
                Ally.HtmlUtil2.showTooltip($event.target, "Copied!");
            else
                Ally.HtmlUtil2.showTooltip($event.target, "Auto-copy failed, right-click and copy link address");
            return false;
        }
        showAddComment() {
            this.shouldShowAddComment = true;
            this.removeAttachment();
            this.initCommentTinyMce("new-comment-tiny-mce-editor");
        }
        cancelCommentEdit() {
            this.editCommentId = -1;
            this.removeAttachment();
            this.showAddComment();
        }
        cancelCommentReply() {
            this.replyToCommentId = -1;
            this.removeAttachment();
            this.showAddComment();
        }
        onFileAttached(event) {
            this.attachmentFile = event.target.files[0];
        }
        removeAttachment() {
            this.attachmentFile = null;
            const fileInput = document.getElementById("comment-attachment-input");
            if (fileInput)
                fileInput.value = null;
        }
        getFileIcon(fileName) {
            return Ally.HtmlUtil2.getFileIcon(fileName);
        }
        onViewAttachedDoc(comment) {
            this.isLoading = true;
            const viewDocWindow = window.open('', '_blank');
            const wasPopUpBlocked = !viewDocWindow || viewDocWindow.closed || typeof viewDocWindow.closed === "undefined";
            if (wasPopUpBlocked) {
                alert(`Looks like your browser may be blocking pop-ups which are required to view documents. Please see the right of the address bar or your browser settings to enable pop-ups for ${AppConfig.appName}.`);
                //this.showPopUpWarning = true;
            }
            else
                viewDocWindow.document.write('Loading document... (If the document cannot be viewed directly in your browser, it will be downloaded automatically)');
            const viewUri = "/api/DocumentLink/DiscussionAttachment/" + comment.commentId;
            this.$http.get(viewUri).then((response) => {
                this.isLoading = false;
                const s3Path = comment.attachedDocPath.substring("s3:".length);
                let fileUri = `Documents/${s3Path}?vid=${encodeURIComponent(response.data.vid)}`;
                fileUri = this.siteInfo.publicSiteInfo.baseApiUrl + fileUri;
                viewDocWindow.location.href = fileUri;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to open document: " + response.data.exceptionMessage);
            });
        }
    }
    GroupCommentThreadViewController.$inject = ["$http", "$rootScope", "SiteInfo", "$scope", "$sce"];
    GroupCommentThreadViewController.TinyMceSettings = {
        menubar: false,
        toolbar: "bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link emoticons"
    };
    Ally.GroupCommentThreadViewController = GroupCommentThreadViewController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupCommentThreadView", {
    bindings: {
        thread: "<",
        onClosed: "&"
    },
    templateUrl: "/ngApp/services/group-comment-thread-view.html",
    controller: Ally.GroupCommentThreadViewController
});

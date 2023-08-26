var Ally;
(function (Ally) {
    var ReplyComment = /** @class */ (function () {
        function ReplyComment() {
        }
        return ReplyComment;
    }());
    var CommentsState = /** @class */ (function () {
        function CommentsState() {
        }
        return CommentsState;
    }());
    /**
     * The controller for the committee home page
     */
    var GroupCommentThreadViewController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupCommentThreadViewController($http, $rootScope, siteInfo, $scope, $sce) {
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
        GroupCommentThreadViewController.prototype.$onInit = function () {
            this.defaultDigestFrequency = this.siteInfo.userInfo.defaultDigestFrequency;
            this.shouldShowAdminControls = this.siteInfo.userInfo.isSiteManager;
            this.threadUrl = this.siteInfo.publicSiteInfo.baseUrl + "/#!/Home/DiscussionThread/" + this.thread.commentThreadId;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.retrieveComments();
            if (!this.thread.isReadOnly && !this.thread.archiveDateUtc)
                this.initCommentTinyMce("new-comment-tiny-mce-editor");
        };
        GroupCommentThreadViewController.prototype.initCommentTinyMce = function (elemId) {
            var _this = this;
            // Auto-focus on replies and edits
            if (elemId === "reply-tiny-mce-editor" || elemId === "edit-tiny-mce-editor")
                GroupCommentThreadViewController.TinyMceSettings.autoFocusElemId = elemId;
            else
                GroupCommentThreadViewController.TinyMceSettings.autoFocusElemId = undefined;
            Ally.HtmlUtil2.initTinyMce(elemId, 200, GroupCommentThreadViewController.TinyMceSettings).then(function (e) {
                if (elemId === "reply-tiny-mce-editor")
                    _this.replyTinyMceEditor = e;
                else if (elemId === "edit-tiny-mce-editor")
                    _this.editTinyMceEditor = e;
                else
                    _this.newCommentTinyMceEditor = e;
                // Hook up CTRL+enter to submit a comment
                e.shortcuts.add('ctrl+13', 'CTRL ENTER to submit comment', function () {
                    _this.$scope.$apply(function () {
                        if (elemId === "reply-tiny-mce-editor")
                            _this.submitReplyComment();
                        else if (elemId === "edit-tiny-mce-editor")
                            _this.submitCommentEdit();
                        else
                            _this.submitNewComment();
                    });
                });
            });
        };
        /**
         * Handle the key down message on the message text area
         */
        GroupCommentThreadViewController.prototype.onTextAreaKeyDown = function (e, messageType) {
            // keyCode = ( e.keyCode ? e.keyCode : e.which );
            var KeyCode_Enter = 13;
            if (e.keyCode == KeyCode_Enter) {
                e.preventDefault();
                if (messageType === "new")
                    this.submitNewComment();
                else if (messageType === "edit")
                    this.submitCommentEdit();
                else if (messageType === "reply")
                    this.submitReplyComment();
            }
        };
        /**
         * Occurs when the user elects to set the thread digest frequency
         */
        GroupCommentThreadViewController.prototype.onChangeDigestFrequency = function () {
            var _this = this;
            this.isLoading = true;
            var putUri = "/api/CommentThread/" + this.thread.commentThreadId + "/DigestFrequency/" + this.commentsState.digestFrequency;
            this.$http.put(putUri, null).then(function () {
                _this.isLoading = false;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to change: " + response.data.exceptionMessage);
            });
        };
        /**
         * Retrieve the comments from the server
         */
        GroupCommentThreadViewController.prototype.retrieveComments = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/CommentThread/" + this.thread.commentThreadId + "/Comments").then(function (response) {
                _this.isLoading = false;
                _this.commentsState = response.data;
                var processComments = function (c) {
                    c.isMyComment = c.authorUserId === _this.$rootScope.userInfo.userId;
                    c.commentText = _this.$sce.trustAsHtml(c.commentText);
                    if (c.replies)
                        _.each(c.replies, processComments);
                };
                _.forEach(_this.commentsState.comments, processComments);
                _this.commentsState.comments = _.sortBy(_this.commentsState.comments, function (ct) { return ct.postDateUtc; }).reverse();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve comments: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the button to reply to a comment
         */
        GroupCommentThreadViewController.prototype.startReplyToComment = function (comment) {
            this.replyToCommentId = comment.commentId;
            this.replyCommentText = "";
            this.editCommentId = -1;
            this.shouldShowAddComment = false;
            this.initCommentTinyMce("reply-tiny-mce-editor");
        };
        /**
         * Edit an existing comment
         * @param comment
         */
        GroupCommentThreadViewController.prototype.startEditComment = function (comment) {
            this.editCommentId = comment.commentId;
            this.editCommentText = comment.commentText;
            this.editCommentShouldRemoveAttachment = false;
            this.replyToCommentId = -1;
            this.shouldShowAddComment = false;
            this.initCommentTinyMce("edit-tiny-mce-editor");
        };
        /**
         * Delete a comment
         */
        GroupCommentThreadViewController.prototype.deleteComment = function (comment) {
            var _this = this;
            var deleteMessage = "Are you sure you want to delete this comment?";
            if (this.commentsState.comments.length === 1)
                deleteMessage = "Since there is only one comment, if you delete this comment you'll delete the thread. Are you sure you want to delete this comment?";
            if (!confirm(deleteMessage))
                return;
            this.isLoading = true;
            this.$http.delete("/api/CommentThread/" + this.thread.commentThreadId + "/" + comment.commentId).then(function () {
                _this.isLoading = false;
                if (_this.commentsState.comments.length === 1) {
                    // Tell the parent thread list to refresh
                    _this.$rootScope.$broadcast("refreshCommentThreadList");
                    _this.closeModal(false);
                }
                else
                    _this.retrieveComments();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to post comment: " + response.data.exceptionMessage);
            });
        };
        /**
         * Archive this thread
         */
        GroupCommentThreadViewController.prototype.archiveThread = function (shouldArchive) {
            var _this = this;
            if (shouldArchive === void 0) { shouldArchive = true; }
            this.isLoading = true;
            var putUri = "/api/CommentThread/Archive/" + this.thread.commentThreadId;
            if (!shouldArchive)
                putUri = "/api/CommentThread/Unarchive/" + this.thread.commentThreadId;
            this.$http.put(putUri, null).then(function () {
                _this.isLoading = false;
                // Tell the parent thread list to refresh
                _this.$rootScope.$broadcast("refreshCommentThreadList");
                _this.closeModal(false);
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to archive: " + response.data.exceptionMessage);
            });
        };
        /**
         * Modify an existing comment
         */
        GroupCommentThreadViewController.prototype.submitCommentEdit = function () {
            var _this = this;
            var editInfo = {
                commentId: this.editCommentId,
                newCommentText: this.editTinyMceEditor.getContent(),
                shouldRemoveAttachment: this.editCommentShouldRemoveAttachment
            };
            if (!editInfo.newCommentText) {
                alert("Comments cannot be empty. If you want to delete the comment, click the delete button.");
                return;
            }
            this.isLoading = true;
            this.$http.put("/api/CommentThread/" + this.thread.commentThreadId + "/EditComment", editInfo).then(function () {
                _this.isLoading = false;
                _this.editCommentId = -1;
                _this.editCommentText = "";
                _this.editCommentShouldRemoveAttachment = false;
                _this.editTinyMceEditor.setContent("");
                _this.removeAttachment();
                _this.retrieveComments();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to edit comment: " + response.data.exceptionMessage);
            });
        };
        /**
         * Add a comment in reply to another
         */
        GroupCommentThreadViewController.prototype.submitReplyComment = function () {
            var _this = this;
            var replyCommentText = this.replyTinyMceEditor.getContent();
            if (!replyCommentText) {
                alert("Please enter some text to add a reply");
                return;
            }
            var newCommentFormData = new FormData();
            newCommentFormData.append("commentText", replyCommentText);
            newCommentFormData.append("replyToCommentId", this.replyToCommentId.toString());
            //newCommentFormData.append( "attachedFile", null );
            //newCommentFormData.append( "attachedGroupDocId", null );
            var putHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            this.isLoading = true;
            this.$http.put("/api/CommentThread/" + this.thread.commentThreadId + "/AddCommentFromForm", newCommentFormData, putHeaders).then(function () {
                _this.isLoading = false;
                _this.replyToCommentId = -1;
                _this.replyCommentText = "";
                _this.replyTinyMceEditor.setContent("");
                _this.removeAttachment();
                _this.retrieveComments();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to add comment: " + response.data.exceptionMessage);
            });
        };
        /**
         * Add a new comment to this thread
         */
        GroupCommentThreadViewController.prototype.submitNewComment = function () {
            var _this = this;
            var newCommentText = this.newCommentTinyMceEditor.getContent();
            if (!newCommentText) {
                alert("You must enter text to submit a comment");
                return;
            }
            var newCommentFormData = new FormData();
            newCommentFormData.append("commentText", newCommentText);
            if (this.attachmentFile)
                newCommentFormData.append("attachedFile", this.attachmentFile);
            //newCommentFormData.append( "attachedGroupDocId", null );
            var putHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            this.isLoading = true;
            this.$http.put("/api/CommentThread/" + this.thread.commentThreadId + "/AddCommentFromForm", newCommentFormData, putHeaders).then(function () {
                _this.isLoading = false;
                _this.newCommentText = "";
                _this.newCommentTinyMceEditor.setContent("");
                _this.removeAttachment();
                _this.retrieveComments();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to add comment: " + response.data.exceptionMessage);
            });
        };
        GroupCommentThreadViewController.prototype.closeModal = function (isFromOverlayClick) {
            if (this.onClosed)
                this.onClosed();
        };
        GroupCommentThreadViewController.prototype.copyThreadLink = function ($event) {
            $event.stopPropagation();
            $event.preventDefault();
            if (Ally.HtmlUtil2.copyTextToClipboard(this.threadUrl))
                Ally.HtmlUtil2.showTooltip($event.target, "Copied!");
            else
                Ally.HtmlUtil2.showTooltip($event.target, "Auto-copy failed, right-click and copy link address");
            return false;
        };
        GroupCommentThreadViewController.prototype.showAddComment = function () {
            this.shouldShowAddComment = true;
            this.removeAttachment();
            this.initCommentTinyMce("new-comment-tiny-mce-editor");
        };
        GroupCommentThreadViewController.prototype.cancelCommentEdit = function () {
            this.editCommentId = -1;
            this.removeAttachment();
            this.showAddComment();
        };
        GroupCommentThreadViewController.prototype.cancelCommentReply = function () {
            this.replyToCommentId = -1;
            this.removeAttachment();
            this.showAddComment();
        };
        GroupCommentThreadViewController.prototype.onFileAttached = function (event) {
            this.attachmentFile = event.target.files[0];
        };
        GroupCommentThreadViewController.prototype.removeAttachment = function () {
            this.attachmentFile = null;
            var fileInput = document.getElementById("comment-attachment-input");
            if (fileInput)
                fileInput.value = null;
        };
        GroupCommentThreadViewController.prototype.getFileIcon = function (fileName) {
            return Ally.HtmlUtil2.getFileIcon(fileName);
        };
        GroupCommentThreadViewController.prototype.onViewAttachedDoc = function (comment) {
            var _this = this;
            this.isLoading = true;
            var viewDocWindow = window.open('', '_blank');
            var wasPopUpBlocked = !viewDocWindow || viewDocWindow.closed || typeof viewDocWindow.closed === "undefined";
            if (wasPopUpBlocked) {
                alert("Looks like your browser may be blocking pop-ups which are required to view documents. Please see the right of the address bar or your browser settings to enable pop-ups for " + AppConfig.appName + ".");
                //this.showPopUpWarning = true;
            }
            else
                viewDocWindow.document.write('Loading document... (If the document cannot be viewed directly in your browser, it will be downloaded automatically)');
            var viewUri = "/api/DocumentLink/DiscussionAttachment/" + comment.commentId;
            this.$http.get(viewUri).then(function (response) {
                _this.isLoading = false;
                var s3Path = comment.attachedDocPath.substring("s3:".length);
                var fileUri = "Documents/" + s3Path + "?vid=" + encodeURIComponent(response.data.vid);
                fileUri = _this.siteInfo.publicSiteInfo.baseApiUrl + fileUri;
                viewDocWindow.location.href = fileUri;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to open document: " + response.data.exceptionMessage);
            });
        };
        GroupCommentThreadViewController.$inject = ["$http", "$rootScope", "SiteInfo", "$scope", "$sce"];
        GroupCommentThreadViewController.TinyMceSettings = {
            menubar: false,
            toolbar: "bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link emoticons"
        };
        return GroupCommentThreadViewController;
    }());
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

var Ally;
(function (Ally) {
    var ReplyComment = /** @class */ (function () {
        function ReplyComment() {
        }
        return ReplyComment;
    }());
    /**
     * The controller for the committee home page
     */
    var GroupCommentThreadViewController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupCommentThreadViewController($http, $rootScope, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.shouldShowAdminControls = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupCommentThreadViewController.prototype.$onInit = function () {
            this.shouldShowAdminControls = this.siteInfo.userInfo.isSiteManager;
            this.retrieveComments();
        };
        GroupCommentThreadViewController.prototype.onTextAreaKeyDown = function (e, messageType) {
            var keyCode = (e.keyCode ? e.keyCode : e.which);
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
         * Retrieve the comments from the server
         */
        GroupCommentThreadViewController.prototype.retrieveComments = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/CommentThread/" + this.thread.commentThreadId + "/Comments").then(function (response) {
                _this.isLoading = false;
                _this.comments = response.data;
                var processComments = function (c) {
                    c.isMyComment = c.authorUserId === _this.$rootScope.userInfo.userId;
                    if (c.replies)
                        _.each(c.replies, processComments);
                };
                _.forEach(_this.comments, processComments);
                _this.comments = _.sortBy(_this.comments, function (ct) { return ct.postDateUtc; }).reverse();
            }, function (response) {
                _this.isLoading = false;
            });
        };
        /**
         * Occurs when the user clicks the button to reply to a comment
         */
        GroupCommentThreadViewController.prototype.startReplyToComment = function (comment) {
            this.replyToCommentId = comment.commentId;
            this.replyCommentText = "";
            setTimeout(function () { return $(".reply-to-textarea").focus(); }, 150);
        };
        /**
         * Edit an existing comment
         * @param comment
         */
        GroupCommentThreadViewController.prototype.startEditComment = function (comment) {
            this.editCommentId = comment.commentId;
            this.editCommentText = comment.commentText;
        };
        ;
        /**
         * Delete a comment
         */
        GroupCommentThreadViewController.prototype.deleteComment = function (comment) {
            var _this = this;
            var deleteMessage = "Are you sure you want to delete this comment?";
            if (this.comments.length === 1)
                deleteMessage = "Since there is only one comment, if you delete this comment you'll delete the thread. Are you sure you want to delete this comment?";
            if (!confirm(deleteMessage))
                return;
            this.isLoading = true;
            this.$http.delete("/api/CommentThread/" + this.thread.commentThreadId + "/" + comment.commentId).then(function () {
                _this.isLoading = false;
                if (_this.comments.length === 1) {
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
        GroupCommentThreadViewController.prototype.archiveThread = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/CommentThread/Archive/" + this.thread.commentThreadId, null).then(function () {
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
                newCommentText: this.editCommentText
            };
            this.isLoading = true;
            this.$http.put("/api/CommentThread/" + this.thread.commentThreadId + "/EditComment", editInfo).then(function () {
                _this.isLoading = false;
                _this.editCommentId = -1;
                _this.editCommentText = "";
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
            var newComment = {
                replyToCommentId: this.replyToCommentId,
                commentText: this.replyCommentText
            };
            this.isLoading = true;
            this.$http.put("/api/CommentThread/" + this.thread.commentThreadId + "/AddComment", newComment).then(function (response) {
                _this.isLoading = false;
                _this.replyToCommentId = -1;
                _this.replyCommentText = "";
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
            var newComment = {
                commentText: this.newCommentText
            };
            this.isLoading = true;
            this.$http.put("/api/CommentThread/" + this.thread.commentThreadId + "/AddComment", newComment).then(function (response) {
                _this.isLoading = false;
                _this.newCommentText = "";
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
        GroupCommentThreadViewController.$inject = ["$http", "$rootScope", "SiteInfo"];
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

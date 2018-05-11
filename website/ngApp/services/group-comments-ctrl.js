var Ally;
(function (Ally) {
    var Comment = /** @class */ (function () {
        function Comment() {
        }
        return Comment;
    }());
    Ally.Comment = Comment;
    /**
     * The controller for the committee home page
     */
    var GroupCommentsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupCommentsController($http, $rootScope) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.showDiscussModal = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupCommentsController.prototype.$onInit = function () {
            this.isQaSite = false; //HtmlUtil.getSubdomain() === "qa" || HtmlUtil.getSubdomain() === "localtest";
            if (!this.threadId)
                this.threadId = "Home";
            this.editComment = {
                threadId: this.threadId,
                commentText: "",
                replyToCommentId: null
            };
            this.refreshComments();
        };
        GroupCommentsController.prototype.displayDiscussModal = function () {
            this.showDiscussModal = true;
        };
        GroupCommentsController.prototype.hideDiscussModal = function () {
            //TODO put in a delay before we allow close to avoid the mobile tap-open-close issue
            this.showDiscussModal = false;
        };
        /**
         * Retrieve the comments from the server for the current thread
         */
        GroupCommentsController.prototype.refreshComments = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Comment?threadId=" + this.threadId).then(function (response) {
                _this.isLoading = false;
                _this.commentList = response.data;
                var processComments = function (c) {
                    c.isMyComment = c.authorUserId === _this.$rootScope.userInfo.userId;
                    if (c.replies)
                        _.each(c.replies, processComments);
                };
                // Convert the UTC dates to local dates and mark the user's comments
                _.each(_this.commentList, processComments);
            }, function (response) {
                _this.isLoading = false;
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        GroupCommentsController.prototype.postComment = function (commentData) {
            var _this = this;
            this.isLoading = true;
            var httpFunc = this.$http.post;
            if (typeof (commentData.existingCommentId) === "number")
                httpFunc = this.$http.put;
            httpFunc("/api/Comment", commentData).then(function () {
                _this.isLoading = false;
                _this.editComment = {};
                _this.showReplyBoxId = -1;
                _this.refreshComments();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to post comment: " + response.data.exceptionMessage);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment to the current thread
        ///////////////////////////////////////////////////////////////////////////////////////////
        GroupCommentsController.prototype.onPostCommentClicked = function () {
            if (this.editComment.commentText.length === 0)
                return;
            // Copy the object to avoid updating the UI
            var commentData = {
                threadId: this.threadId,
                commentText: this.editComment.commentText,
                replyToCommentId: null,
                existingCommentId: this.editComment.existingCommentId
            };
            this.postComment(commentData);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Edit an existing comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        GroupCommentsController.prototype.editMyComment = function (comment) {
            this.editComment = {
                commentText: comment.commentText,
                existingCommentId: comment.commentId
            };
        };
        ;
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Delete a comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        GroupCommentsController.prototype.deleteMyComment = function (comment) {
            this.isLoading = true;
            this.$http.delete("/api/Comment?commentId=" + comment.commentId).then(function () {
                this.isLoading = false;
                this.refreshComments();
            }, function (httpResponse) {
                this.isLoading = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to post comment: " + errorMessage);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment in response to a comment in the current thread
        ///////////////////////////////////////////////////////////////////////////////////////////
        GroupCommentsController.prototype.onPostReplyCommentClicked = function () {
            if (this.editComment.replyText.length === 0)
                return;
            // Copy the object to avoid updating the UI
            var commentData = {
                threadId: this.threadId,
                commentText: this.editComment.replyText,
                replyToCommentId: this.editComment.replyToCommentId
            };
            this.postComment(commentData);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to reply
        ///////////////////////////////////////////////////////////////////////////////////////////
        GroupCommentsController.prototype.clickReplyToComment = function (commentId) {
            this.showReplyBoxId = commentId;
            this.editComment = {
                commentText: "",
                replyToCommentId: commentId
            };
        };
        GroupCommentsController.$inject = ["$http", "$rootScope"];
        return GroupCommentsController;
    }());
    Ally.GroupCommentsController = GroupCommentsController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupComments", {
    bindings: {
        threadId: "@?"
    },
    templateUrl: "/ngApp/services/group-comments.html",
    controller: Ally.GroupCommentsController
});

var Ally;
(function (Ally) {
    class Comment {
    }
    Ally.Comment = Comment;
    /**
     * The controller for the committee home page
     */
    class GroupCommentsController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.showDiscussModal = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isQaSite = false; //HtmlUtil.getSubdomain() === "qa" || HtmlUtil.getSubdomain() === "localtest";
            if (!this.threadId)
                this.threadId = "Home";
            this.editComment = {
                threadId: this.threadId,
                commentText: "",
                replyToCommentId: null
            };
            this.refreshComments();
        }
        displayDiscussModal() {
            this.showDiscussModal = true;
        }
        hideDiscussModal() {
            //TODO put in a delay before we allow close to avoid the mobile tap-open-close issue
            this.showDiscussModal = false;
        }
        /**
         * Retrieve the comments from the server for the current thread
         */
        refreshComments() {
            this.isLoading = true;
            this.$http.get("/api/Comment?threadId=" + this.threadId).then((response) => {
                this.isLoading = false;
                this.commentList = response.data;
                const processComments = (c) => {
                    c.isMyComment = c.authorUserId === this.$rootScope.userInfo.userId;
                    if (c.replies)
                        _.each(c.replies, processComments);
                };
                // Convert the UTC dates to local dates and mark the user's comments
                _.each(this.commentList, processComments);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to refresh comments: " + response.data.exceptionMessage);
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        postComment(commentData) {
            this.isLoading = true;
            let httpFunc = this.$http.post;
            if (typeof (commentData.existingCommentId) === "number")
                httpFunc = this.$http.put;
            httpFunc("/api/Comment", commentData).then(() => {
                this.isLoading = false;
                this.editComment = {};
                this.showReplyBoxId = -1;
                this.refreshComments();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to post comment: " + response.data.exceptionMessage);
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment to the current thread
        ///////////////////////////////////////////////////////////////////////////////////////////
        onPostCommentClicked() {
            if (this.editComment.commentText.length === 0)
                return;
            // Copy the object to avoid updating the UI
            const commentData = {
                threadId: this.threadId,
                commentText: this.editComment.commentText,
                replyToCommentId: null,
                existingCommentId: this.editComment.existingCommentId
            };
            this.postComment(commentData);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Edit an existing comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        editMyComment(comment) {
            this.editComment = {
                commentText: comment.commentText,
                existingCommentId: comment.commentId
            };
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Delete a comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        deleteMyComment(comment) {
            this.isLoading = true;
            this.$http.delete("/api/Comment?commentId=" + comment.commentId).then(() => {
                this.isLoading = false;
                this.refreshComments();
            }, (httpResponse) => {
                this.isLoading = false;
                const errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to post comment: " + errorMessage);
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment in response to a comment in the current thread
        ///////////////////////////////////////////////////////////////////////////////////////////
        onPostReplyCommentClicked() {
            if (this.editComment.replyText.length === 0)
                return;
            // Copy the object to avoid updating the UI
            const commentData = {
                threadId: this.threadId,
                commentText: this.editComment.replyText,
                replyToCommentId: this.editComment.replyToCommentId
            };
            this.postComment(commentData);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to reply
        ///////////////////////////////////////////////////////////////////////////////////////////
        clickReplyToComment(commentId) {
            this.showReplyBoxId = commentId;
            this.editComment = {
                commentText: "",
                replyToCommentId: commentId
            };
        }
    }
    GroupCommentsController.$inject = ["$http", "$rootScope"];
    Ally.GroupCommentsController = GroupCommentsController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupComments", {
    bindings: {
        threadId: "@?"
    },
    templateUrl: "/ngApp/services/group-comments.html",
    controller: Ally.GroupCommentsController
});

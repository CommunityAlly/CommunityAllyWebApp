var Ally;
(function (Ally) {
    var CommentThread = /** @class */ (function () {
        function CommentThread() {
        }
        return CommentThread;
    }());
    Ally.CommentThread = CommentThread;
    /**
     * The controller for the committee home page
     */
    var GroupCommentThreadsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupCommentThreadsController($http, $rootScope, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.viewingThread = null;
            this.showCreateNewModal = false;
            this.showBoardOnly = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupCommentThreadsController.prototype.$onInit = function () {
            this.showBoardOnly = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;
            this.editComment = {
                commentText: "",
                replyToCommentId: null
            };
            this.refreshCommentThreads();
        };
        GroupCommentThreadsController.prototype.setDisplayCreateModal = function (shouldShow) {
            this.showCreateNewModal = shouldShow;
            this.newThreadTitle = "";
            this.newThreadBody = "";
            this.newThreadIsBoardOnly = false;
            this.newThreadErrorMessage = "";
        };
        GroupCommentThreadsController.prototype.displayDiscussModal = function (thread) {
            this.viewingThread = thread;
        };
        GroupCommentThreadsController.prototype.hideDiscussModal = function () {
            this.viewingThread = null;
        };
        GroupCommentThreadsController.prototype.createNewThread = function () {
            var _this = this;
            this.isLoading = true;
            this.newThreadErrorMessage = null;
            var createInfo = {
                title: this.newThreadTitle,
                body: this.newThreadBody,
                isBoardOnly: this.newThreadIsBoardOnly
            };
            this.$http.post("/api/CommentThread", createInfo).then(function (response) {
                _this.isLoading = false;
                _this.showCreateNewModal = false;
                _this.refreshCommentThreads();
            }, function (response) {
                _this.isLoading = false;
                _this.newThreadErrorMessage = response.data.exceptionMessage;
            });
        };
        /**
         * Retrieve the comments from the server for the current thread
         */
        GroupCommentThreadsController.prototype.refreshCommentThreads = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/CommentThread").then(function (response) {
                _this.isLoading = false;
                _this.commentThreads = response.data;
                var markDates = function (c) {
                    c.createDateUtc = moment.utc(c.createDateUtc).toDate();
                    //c.isMyComment = c.authorUserId === this.$rootScope.userInfo.userId;
                };
                // Convert the UTC dates to local dates and mark the user's comments
                _.each(_this.commentThreads, markDates);
                _this.commentThreads = _.sortBy(_this.commentThreads, function (ct) { return ct.createDateUtc; }).reverse();
            }, function (response) {
                _this.isLoading = false;
            });
        };
        GroupCommentThreadsController.$inject = ["$http", "$rootScope", "SiteInfo"];
        return GroupCommentThreadsController;
    }());
    Ally.GroupCommentThreadsController = GroupCommentThreadsController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupCommentThreads", {
    templateUrl: "/ngApp/services/group-comment-threads.html",
    controller: Ally.GroupCommentThreadsController
});

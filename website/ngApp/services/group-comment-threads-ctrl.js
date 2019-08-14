var Ally;
(function (Ally) {
    var CommentThread = /** @class */ (function () {
        function CommentThread() {
        }
        return CommentThread;
    }());
    Ally.CommentThread = CommentThread;
    /**
     * The controller for the discussion threads directive
     */
    var GroupCommentThreadsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupCommentThreadsController($http, $rootScope, siteInfo, $scope) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.isLoading = false;
            this.viewingThread = null;
            this.showCreateNewModal = false;
            this.showBoardOnly = false;
            this.archivedThreads = null;
            this.canCreateThreads = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupCommentThreadsController.prototype.$onInit = function () {
            var _this = this;
            if (!this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads || this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads === "everyone")
                this.canCreateThreads = true;
            else if (this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads === "board")
                this.canCreateThreads = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;
            this.showBoardOnly = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;
            this.editComment = {
                commentText: "",
                replyToCommentId: null
            };
            this.$scope.$on("refreshCommentThreadList", function (event, data) { return _this.refreshCommentThreads(false); });
            this.refreshCommentThreads(false);
        };
        GroupCommentThreadsController.prototype.setDisplayCreateModal = function (shouldShow) {
            this.showCreateNewModal = shouldShow;
            this.newThreadTitle = "";
            this.newThreadBody = "";
            this.newThreadIsBoardOnly = false;
            this.newThreadIsReadOnly = false;
            this.shouldSendNoticeForNewThread = true;
            this.newThreadErrorMessage = "";
            // If we're displaying the modal, focus on the title text box
            if (shouldShow)
                setTimeout(function () { return $("#new-thread-title-text-box").focus(); }, 100);
        };
        GroupCommentThreadsController.prototype.displayDiscussModal = function (thread) {
            this.viewingThread = thread;
        };
        GroupCommentThreadsController.prototype.hideDiscussModal = function () {
            this.viewingThread = null;
        };
        /**
         * Occurs when the user clicks the pin to toggle a thread's pinned status
         * @param thread
         */
        GroupCommentThreadsController.prototype.onClickPin = function (thread) {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/CommentThread/TogglePinned/" + thread.commentThreadId, null).then(function (response) {
                _this.isLoading = false;
                _this.refreshCommentThreads();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to toggle: " + response.data.exceptionMessage);
            });
        };
        GroupCommentThreadsController.prototype.createNewThread = function () {
            var _this = this;
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
            this.$http.post("/api/CommentThread", createInfo).then(function (response) {
                _this.isLoading = false;
                _this.showCreateNewModal = false;
                _this.refreshCommentThreads(false);
            }, function (response) {
                _this.isLoading = false;
                _this.newThreadErrorMessage = response.data.exceptionMessage;
            });
        };
        /**
         * Retrieve the comments from the server for the current thread
         */
        GroupCommentThreadsController.prototype.refreshCommentThreads = function (retrieveArchived) {
            var _this = this;
            if (retrieveArchived === void 0) { retrieveArchived = false; }
            this.isLoading = true;
            var getUri = "/api/CommentThread";
            if (retrieveArchived)
                getUri += "/Archived";
            if (this.committeeId)
                getUri += "?committeeId=" + this.committeeId;
            this.$http.get(getUri).then(function (response) {
                _this.isLoading = false;
                // Sort by comment date, put unpinned threads 100 years in the past so pinned always show up on top
                response.data = _.sortBy(response.data, function (ct) { return ct.pinnedDateUtc ? ct.pinnedDateUtc : moment(ct.lastCommentDateUtc).subtract("years", 100).toDate(); }).reverse();
                if (retrieveArchived)
                    _this.archivedThreads = response.data;
                else {
                    _this.commentThreads = response.data;
                    _this.archivedThreads = null;
                }
            }, function (response) {
                _this.isLoading = false;
            });
        };
        GroupCommentThreadsController.$inject = ["$http", "$rootScope", "SiteInfo", "$scope"];
        return GroupCommentThreadsController;
    }());
    Ally.GroupCommentThreadsController = GroupCommentThreadsController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupCommentThreads", {
    bindings: {
        committeeId: "<?"
    },
    templateUrl: "/ngApp/services/group-comment-threads.html",
    controller: Ally.GroupCommentThreadsController
});

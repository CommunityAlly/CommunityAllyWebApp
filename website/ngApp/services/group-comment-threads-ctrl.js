var Ally;
(function (Ally) {
    class CommentThread {
    }
    Ally.CommentThread = CommentThread;
    /**
     * The controller for the discussion threads directive
     */
    class GroupCommentThreadsController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo, $scope, fellowResidents, $timeout) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.fellowResidents = fellowResidents;
            this.$timeout = $timeout;
            this.isLoading = false;
            this.viewingThread = null;
            this.showCreateNewModal = false;
            this.showBoardOnly = false;
            this.archivedThreads = null;
            this.canCreateThreads = false;
            this.isDiscussionEmailEnabled = true;
            this.isPremiumPlanActive = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.canCreateThreads = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            if (!this.canCreateThreads) {
                if (this.committeeId) {
                    // Make sure committee members can manage their data
                    this.fellowResidents.isCommitteeMember(this.committeeId).then(isCommitteeMember => this.canCreateThreads = isCommitteeMember);
                }
                else {
                    if (!this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads || this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads === "everyone")
                        this.canCreateThreads = true;
                    else if (this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads === "board")
                        this.canCreateThreads = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;
                }
            }
            this.showBoardOnly = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;
            this.editComment = {
                commentText: "",
                replyToCommentId: null
            };
            this.$scope.$on("refreshCommentThreadList", (event, data) => this.refreshCommentThreads(false));
            this.refreshCommentThreads(false);
        }
        setDisplayCreateModal(shouldShow) {
            this.showCreateNewModal = shouldShow;
            this.newThreadTitle = "";
            this.newThreadIsBoardOnly = false;
            this.newThreadIsReadOnly = false;
            this.shouldSendNoticeForNewThread = true;
            this.newThreadErrorMessage = "";
            Ally.HtmlUtil2.initTinyMce("new-thread-body-rte", 200, Ally.GroupCommentThreadViewController.TinyMceSettings).then(e => this.newBodyMceEditor = e);
            // If we're displaying the modal, focus on the title text box
            if (shouldShow)
                setTimeout(() => $("#new-thread-title-text-box").focus(), 100);
        }
        displayDiscussModal(thread) {
            this.viewingThread = thread;
        }
        hideDiscussModal() {
            this.viewingThread = null;
        }
        /**
         * Occurs when the user clicks the pin to toggle a thread's pinned status
         * @param thread
         */
        onClickPin(thread) {
            this.isLoading = true;
            this.$http.put("/api/CommentThread/TogglePinned/" + thread.commentThreadId, null).then((response) => {
                this.isLoading = false;
                this.refreshCommentThreads();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to toggle: " + response.data.exceptionMessage);
            });
        }
        createNewThread() {
            console.log("In createNewThread");
            this.isLoading = true;
            this.newThreadErrorMessage = null;
            //const createInfo = {
            //    title: this.newThreadTitle,
            //    body: this.newBodyMceEditor.getContent(),
            //    isBoardOnly: this.newThreadIsBoardOnly,
            //    isReadOnly: this.newThreadIsReadOnly,
            //    shouldSendNotice: this.shouldSendNoticeForNewThread,
            //    committeeId: this.committeeId
            //};
            const newThreadFormData = new FormData();
            newThreadFormData.append("title", this.newThreadTitle);
            newThreadFormData.append("body", this.newBodyMceEditor.getContent());
            newThreadFormData.append("isBoardOnly", this.newThreadIsBoardOnly.toString());
            newThreadFormData.append("isReadOnly", this.newThreadIsReadOnly.toString());
            newThreadFormData.append("shouldSendNotice", this.shouldSendNoticeForNewThread.toString());
            if (this.committeeId)
                newThreadFormData.append("committeeId", this.committeeId.toString());
            if (this.attachmentFile)
                newThreadFormData.append("attachedFile", this.attachmentFile);
            const postHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            this.$http.post("/api/CommentThread/CreateThreadFromForm", newThreadFormData, postHeaders).then(() => {
                this.isLoading = false;
                this.showCreateNewModal = false;
                this.removeAttachment();
                this.refreshCommentThreads(false);
            }, (response) => {
                this.isLoading = false;
                this.newThreadErrorMessage = response.data.exceptionMessage;
            });
        }
        /**
         * Retrieve the comments from the server for the current thread
         */
        refreshCommentThreads(retrieveArchived = false) {
            this.isLoading = true;
            let getUri = "/api/CommentThread";
            if (retrieveArchived)
                getUri += "/Archived";
            if (this.committeeId)
                getUri += "?committeeId=" + this.committeeId;
            this.$http.get(getUri).then((response) => {
                this.isLoading = false;
                // Sort by comment date, put unpinned threads 100 years in the past so pinned always show up on top
                response.data = _.sortBy(response.data, ct => ct.pinnedDateUtc ? ct.pinnedDateUtc : moment(ct.lastCommentDateUtc).subtract(100, "years").toDate()).reverse();
                if (retrieveArchived)
                    this.archivedThreads = response.data;
                else {
                    this.commentThreads = response.data;
                    this.archivedThreads = null;
                    // If we should automatically open a discussion thread
                    if (this.autoOpenThreadId) {
                        const autoOpenThread = _.find(this.commentThreads, t => t.commentThreadId === this.autoOpenThreadId);
                        if (autoOpenThread)
                            this.$timeout(() => this.displayDiscussModal(autoOpenThread), 125);
                        // Don't open again
                        this.autoOpenThreadId = null;
                    }
                }
            }, (response) => {
                this.isLoading = false;
            });
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
    }
    GroupCommentThreadsController.$inject = ["$http", "$rootScope", "SiteInfo", "$scope", "fellowResidents", "$timeout"];
    Ally.GroupCommentThreadsController = GroupCommentThreadsController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupCommentThreads", {
    bindings: {
        committeeId: "<?",
        autoOpenThreadId: "<?"
    },
    templateUrl: "/ngApp/services/group-comment-threads.html",
    controller: Ally.GroupCommentThreadsController
});

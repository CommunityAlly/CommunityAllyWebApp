var Ally;
(function (Ally) {
    class DiscussionThread {
    }
    Ally.DiscussionThread = DiscussionThread;
    /**
     * The controller for the page that lets users unsubscribe from discussions
     */
    class DiscussionManageController {
        /**
         * The constructor for the class
         */
        constructor($http, $routeParams) {
            this.$http = $http;
            this.$routeParams = $routeParams;
            this.isLoading = false;
            this.activeView = "loading";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.unsubscribeUser();
        }
        /**
        * Load the discussion details
        */
        loadDiscussion() {
            const idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            this.$http.get("/Discussion/" + idVal).then((httpResponse) => {
                this.isLoading = false;
                this.discussion = httpResponse.data;
            }, (httpResponse) => {
                this.isLoading = false;
                this.errorMessage = "Failed to find the discussion details. Please contact support to alert them to the issue.";
                console.log("Failed to load discussion", httpResponse.data);
            });
        }
        /**
         * Unsubscribe the user from the discussion
         */
        unsubscribeUser() {
            const idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            this.activeView = "loading";
            this.$http.put("/api/Discussion/Unsubscribe/" + idVal, null).then((httpResponse) => {
                this.isLoading = false;
                this.activeView = "unsubscribed";
                this.discussion = httpResponse.data;
            }, (httpResponse) => {
                this.isLoading = false;
                this.activeView = "error";
                this.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
                console.log("Failed to unsubscribe", httpResponse.data);
            });
        }
        /**
         * Resubscribe the user to a discussion
         */
        resubscribeUser() {
            const idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            this.activeView = "loading";
            this.$http.put("/api/Discussion/Resubscribe/" + idVal, null).then(() => {
                this.isLoading = false;
                this.activeView = "resubscribed";
            }, (httpResponse) => {
                this.isLoading = false;
                this.activeView = "error";
                this.errorMessage = "Failed to resubscribe you to the discussion due to a server error.";
                console.log("Failed to resubscribe", httpResponse.data);
            });
        }
    }
    DiscussionManageController.$inject = ["$http", "$routeParams"];
    Ally.DiscussionManageController = DiscussionManageController;
})(Ally || (Ally = {}));
CA.angularApp.component("discussionManage", {
    templateUrl: "/ngApp/chtn/public/discussion-manage.html",
    controller: Ally.DiscussionManageController
});

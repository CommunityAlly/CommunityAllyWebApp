/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
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
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/Discussion/" + idVal).then((httpResponse) => {
                innerThis.isLoading = false;
                innerThis.discussion = httpResponse.data;
            }, (httpResponse) => {
                innerThis.isLoading = false;
                innerThis.errorMessage = "Failed to find the discussion details. Please contact support to alert them to the issue.";
            });
        }
        /**
         * Unsubscribe the user from the discussion
         */
        unsubscribeUser() {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            this.activeView = "loading";
            var innerThis = this;
            this.$http.put("/api/Discussion/Unsubscribe/" + idVal, null).then((httpResponse) => {
                innerThis.isLoading = false;
                innerThis.activeView = "unsubscribed";
                innerThis.discussion = httpResponse.data;
            }, (httpResponse) => {
                innerThis.isLoading = false;
                innerThis.activeView = "error";
                innerThis.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
            });
        }
        /**
         * Resubscribe the user to a discussion
         */
        resubscribeUser() {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            this.activeView = "loading";
            var innerThis = this;
            this.$http.put("/api/Discussion/Resubscribe/" + idVal, null).then((httpResponse) => {
                innerThis.isLoading = false;
                innerThis.activeView = "resubscribed";
            }, (httpResponse) => {
                innerThis.isLoading = false;
                innerThis.activeView = "error";
                innerThis.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
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

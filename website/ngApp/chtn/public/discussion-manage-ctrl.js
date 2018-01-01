/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    var DiscussionThread = /** @class */ (function () {
        function DiscussionThread() {
        }
        return DiscussionThread;
    }());
    Ally.DiscussionThread = DiscussionThread;
    /**
     * The controller for the page that lets users unsubscribe from discussions
     */
    var DiscussionManageController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function DiscussionManageController($http, $routeParams) {
            this.$http = $http;
            this.$routeParams = $routeParams;
            this.isLoading = false;
            this.activeView = "loading";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        DiscussionManageController.prototype.$onInit = function () {
            this.unsubscribeUser();
        };
        /**
        * Load the discussion details
        */
        DiscussionManageController.prototype.loadDiscussion = function () {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/Discussion/" + idVal).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.discussion = httpResponse.data;
            }, function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.errorMessage = "Failed to find the discussion details. Please contact support to alert them to the issue.";
            });
        };
        /**
         * Unsubscribe the user from the discussion
         */
        DiscussionManageController.prototype.unsubscribeUser = function () {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            this.activeView = "loading";
            var innerThis = this;
            this.$http.put("/api/Discussion/Unsubscribe/" + idVal, null).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.activeView = "unsubscribed";
                innerThis.discussion = httpResponse.data;
            }, function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.activeView = "error";
                innerThis.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
            });
        };
        /**
         * Resubscribe the user to a discussion
         */
        DiscussionManageController.prototype.resubscribeUser = function () {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            this.activeView = "loading";
            var innerThis = this;
            this.$http.put("/api/Discussion/Resubscribe/" + idVal, null).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.activeView = "resubscribed";
            }, function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.activeView = "error";
                innerThis.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
            });
        };
        DiscussionManageController.$inject = ["$http", "$routeParams"];
        return DiscussionManageController;
    }());
    Ally.DiscussionManageController = DiscussionManageController;
})(Ally || (Ally = {}));
CA.angularApp.component("discussionManage", {
    templateUrl: "/ngApp/chtn/public/discussion-manage.html",
    controller: Ally.DiscussionManageController
});

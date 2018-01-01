/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
/// <reference path="../chtn/manager/manage-committees-ctrl.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the committee parent view
     */
    var CommitteeParentController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function CommitteeParentController($http, siteInfo, $routeParams) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$routeParams = $routeParams;
            this.canManage = false;
            this.selectedView = "home";
            this.isLoading = false;
            this.committeeId = this.$routeParams.committeeId;
            this.selectedView = this.$routeParams.viewName || "home";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        CommitteeParentController.prototype.$onInit = function () {
            this.canManage = this.siteInfo.userInfo.isSiteManager;
            this.retrieveCommittee();
        };
        /*
         * Retreive the committee data
         */
        CommitteeParentController.prototype.retrieveCommittee = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Committee/" + this.committeeId).success(function (committee) {
                innerThis.isLoading = false;
                innerThis.committee = committee;
            }).error(function (exc) {
                innerThis.isLoading = false;
                alert("Failed to load committee: " + exc.exceptionMessage);
            });
        };
        /*
         * Called after the user edits the committee name
         */
        CommitteeParentController.prototype.onUpdateCommitteeName = function () {
            this.isLoading = true;
            var putUri = "/api/Committee/" + this.committeeId + "?newName=" + this.committee.name;
            var innerThis = this;
            this.$http.put(putUri, null).success(function () {
                innerThis.isLoading = false;
            }).error(function (exc) {
                innerThis.isLoading = false;
                alert("Failed to update the committee name: " + exc.exceptionMessage);
            });
        };
        CommitteeParentController.$inject = ["$http", "SiteInfo", "$routeParams"];
        return CommitteeParentController;
    }());
    Ally.CommitteeParentController = CommitteeParentController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeParent", {
    templateUrl: "/ngApp/committee/committee-parent.html",
    controller: Ally.CommitteeParentController
});

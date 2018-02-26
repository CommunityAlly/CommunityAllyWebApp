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
        function CommitteeParentController($http, siteInfo, $routeParams, $cacheFactory) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$routeParams = $routeParams;
            this.$cacheFactory = $cacheFactory;
            this.canManage = false;
            this.initialView = "Home";
            this.selectedView = null;
            this.isLoading = false;
            this.committeeId = this.$routeParams.committeeId;
            this.initialView = this.$routeParams.viewName || "Home";
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
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Committee/" + this.committeeId, { cache: true }).then(function (response) {
                _this.isLoading = false;
                _this.committee = response.data;
                _this.selectedView = _this.initialView;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to load committee: " + response.data.exceptionMessage);
            });
        };
        /*
         * Called after the user edits the committee name
         */
        CommitteeParentController.prototype.onUpdateCommitteeName = function () {
            var _this = this;
            this.isLoading = true;
            var putUri = "/api/Committee/" + this.committeeId + "?newName=" + this.committee.name;
            this.$http.put(putUri, null).then(function () {
                _this.isLoading = false;
                _this.$cacheFactory.get('$http').remove("/api/Committee/" + _this.committeeId);
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to update the committee name: " + response.data.exceptionMessage);
            });
        };
        CommitteeParentController.$inject = ["$http", "SiteInfo", "$routeParams", "$cacheFactory"];
        return CommitteeParentController;
    }());
    Ally.CommitteeParentController = CommitteeParentController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeParent", {
    templateUrl: "/ngApp/committee/committee-parent.html",
    controller: Ally.CommitteeParentController
});

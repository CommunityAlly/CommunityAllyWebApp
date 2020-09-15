/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    var CommitteeHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function CommitteeHomeController(siteInfo, fellowResidents, $routeParams) {
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.$routeParams = $routeParams;
            this.canManage = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        CommitteeHomeController.prototype.$onInit = function () {
            var _this = this;
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId, this.siteInfo.userInfo.userId).then(function (isCommitteeMember) { return _this.canManage = isCommitteeMember; });
            if (this.$routeParams && HtmlUtil.isNumericString(this.$routeParams.discussionThreadId))
                this.autoOpenDiscussionThreadId = parseInt(this.$routeParams.discussionThreadId);
        };
        CommitteeHomeController.$inject = ["SiteInfo", "fellowResidents", "$routeParams"];
        return CommitteeHomeController;
    }());
    Ally.CommitteeHomeController = CommitteeHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeHome", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/committee/committee-home.html",
    controller: Ally.CommitteeHomeController
});

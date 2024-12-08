var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    class CommitteeHomeController {
        /**
         * The constructor for the class
         */
        constructor(siteInfo, fellowResidents, $routeParams) {
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.$routeParams = $routeParams;
            this.canManage = false;
            this.shouldShowBulletinBoard = true;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId).then(isCommitteeMember => this.canManage = isCommitteeMember);
            if (this.$routeParams && HtmlUtil.isNumericString(this.$routeParams.discussionThreadId))
                this.autoOpenDiscussionThreadId = parseInt(this.$routeParams.discussionThreadId);
            const homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType || "";
            if (this.siteInfo.privateSiteInfo.creationDate > Ally.SiteInfoService.AlwaysDiscussDate) {
                if (this.siteInfo.privateSiteInfo.creationDate > Ally.SiteInfoService.AlwaysBulletinBoardDate)
                    this.shouldShowBulletinBoard = true;
                else
                    this.shouldShowBulletinBoard = homeRightColumnType.indexOf("bulletinboard") > -1;
            }
            else
                this.shouldShowBulletinBoard = homeRightColumnType.indexOf("bulletinboard") > -1;
        }
    }
    CommitteeHomeController.$inject = ["SiteInfo", "fellowResidents", "$routeParams"];
    Ally.CommitteeHomeController = CommitteeHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeHome", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/committee/committee-home.html",
    controller: Ally.CommitteeHomeController
});

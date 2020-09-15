var Ally;
(function (Ally) {
    /**
     * The controller for the group site home page
     */
    var ChtnHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ChtnHomeController($http, $rootScope, siteInfo, $timeout, $scope, $routeParams) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.$routeParams = $routeParams;
            this.showDiscussionThreads = false;
            this.showLocalNews = false;
            this.testPay_ShouldShow = false;
            this.testPay_isValid = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ChtnHomeController.prototype.$onInit = function () {
            var _this = this;
            this.testPay_ShouldShow = false; //this.siteInfo.publicSiteInfo.shortName === "qa" || this.siteInfo.publicSiteInfo.shortName === "localtest";
            if (this.testPay_ShouldShow) {
                this.testPay_ReturnUrl = window.location.href;
                this.testPay_IpnUrl = this.siteInfo.publicSiteInfo.baseUrl + "/api/PayPalIpn";
                this.testPay_UserFirst = this.siteInfo.userInfo.firstName;
                this.testPay_UserLast = this.siteInfo.userInfo.lastName;
                this.testPay_Description = "Assessment for " + this.siteInfo.publicSiteInfo.fullName;
            }
            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.canMakePayment = this.siteInfo.privateSiteInfo.isPaymentEnabled && !this.siteInfo.userInfo.isRenter;
            this.isFirstVisit = this.siteInfo.userInfo.lastLoginDateUtc === null;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showFirstVisitModal = this.isFirstVisit && !this.$rootScope.hasClosedFirstVisitModal && this.siteInfo.privateSiteInfo.siteLaunchedDateUtc === null;
            this.allyAppName = AppConfig.appName;
            this.homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType;
            if (!this.homeRightColumnType && this.homeRightColumnType !== "")
                this.homeRightColumnType = "localnews";
            if (this.siteInfo.privateSiteInfo.creationDate > Ally.SiteInfoService.AlwaysDiscussDate) {
                this.showDiscussionThreads = true;
                this.showLocalNews = this.homeRightColumnType.indexOf("localnews") > -1;
            }
            else {
                this.showDiscussionThreads = this.homeRightColumnType.indexOf("chatwall") > -1;
                this.showLocalNews = this.homeRightColumnType.indexOf("localnews") > -1;
            }
            if (this.showDiscussionThreads && this.$routeParams && HtmlUtil.isNumericString(this.$routeParams.discussionThreadId))
                this.autoOpenDiscussionThreadId = parseInt(this.$routeParams.discussionThreadId);
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            var innerThis = this;
            this.$scope.$on("homeHasActivePolls", function () { return innerThis.shouldShowAlertSection = true; });
            this.$http.get("/api/Committee/MyCommittees", { cache: true }).then(function (response) {
                _this.usersCommittees = response.data;
                if (_this.usersCommittees)
                    _this.usersCommittees = _.sortBy(_this.usersCommittees, function (c) { return c.name.toLowerCase(); });
            });
        };
        ChtnHomeController.prototype.onTestPayAmtChange = function () {
            this.testPay_isValid = this.testPay_Amt > 5 && this.testPay_Amt < 5000;
        };
        ChtnHomeController.prototype.hideFirstVisit = function () {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        };
        ChtnHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "$scope", "$routeParams"];
        return ChtnHomeController;
    }());
    Ally.ChtnHomeController = ChtnHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("chtnHome", {
    templateUrl: "/ngApp/chtn/member/chtn-home.html",
    controller: Ally.ChtnHomeController
});

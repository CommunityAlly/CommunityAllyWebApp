var Ally;
(function (Ally) {
    /**
     * The controller for the group site home page
     */
    class ChtnHomeController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo, $timeout, $scope, $routeParams, $sce) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.$routeParams = $routeParams;
            this.$sce = $sce;
            this.showDiscussionThreads = false;
            this.showLocalNews = false;
            this.testPay_ShouldShow = false;
            this.testPay_isValid = false;
            this.shouldShowOwnerFinanceTxn = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.testPay_ShouldShow = false; //this.siteInfo.publicSiteInfo.shortName === "qa" || this.siteInfo.publicSiteInfo.shortName === "localtest";
            if (this.testPay_ShouldShow) {
                this.testPay_ReturnUrl = window.location.href;
                this.testPay_IpnUrl = this.siteInfo.publicSiteInfo.baseUrl + "/api/PayPalIpn";
                this.testPay_UserFirst = this.siteInfo.userInfo.firstName;
                this.testPay_UserLast = this.siteInfo.userInfo.lastName;
                this.testPay_Description = "Assessment for " + this.siteInfo.publicSiteInfo.fullName;
            }
            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.isWelcomeMessageHtml = this.welcomeMessage && this.welcomeMessage.indexOf("<") > -1;
            if (this.isWelcomeMessageHtml) {
                this.welcomeMessage = this.$sce.trustAsHtml(this.welcomeMessage);
                Ally.RichTextHelper.makeLinksOpenNewTab("welcome-message-panel");
            }
            this.canMakePayment = this.siteInfo.privateSiteInfo.isPaymentEnabled && !this.siteInfo.userInfo.isRenter;
            this.shouldShowOwnerFinanceTxn = this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn && !this.siteInfo.userInfo.isRenter;
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
            var innerThis = this;
            this.$scope.$on("homeHasActivePolls", () => innerThis.shouldShowAlertSection = true);
            this.$http.get("/api/Committee/MyCommittees", { cache: true }).then((response) => {
                this.usersCommittees = response.data;
                if (this.usersCommittees)
                    this.usersCommittees = _.sortBy(this.usersCommittees, c => c.name.toLowerCase());
            });
            // Delay the survey check since it's low priority and it lets the other parts of the page load faster
            if (AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa")
                this.$timeout(() => this.checkForSurveys(), 250);
        }
        /**
        * See if there's any surveys waiting to be completed for the current group+user
        */
        checkForSurveys() {
            this.$http.get("/api/AllySurvey/AnySurvey").then((response) => {
                this.allySurvey = response.data;
            }, (errorResponse) => {
                console.log("Failed to load ally survey", errorResponse.data.exceptionMessage);
            });
            this.allySurvey = null;
        }
        onTestPayAmtChange() {
            this.testPay_isValid = this.testPay_Amt > 5 && this.testPay_Amt < 5000;
        }
        hideFirstVisit() {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        }
    }
    ChtnHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "$scope", "$routeParams", "$sce"];
    Ally.ChtnHomeController = ChtnHomeController;
    class AllySurveyInfo {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("chtnHome", {
    templateUrl: "/ngApp/chtn/member/chtn-home.html",
    controller: Ally.ChtnHomeController
});

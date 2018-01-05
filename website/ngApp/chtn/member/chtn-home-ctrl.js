var Ally;
(function (Ally) {
    /**
     * The controller for the group site home page
     */
    var ChtnHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ChtnHomeController($http, $rootScope, siteInfo, $timeout, $scope) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$scope = $scope;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ChtnHomeController.prototype.$onInit = function () {
            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.canMakePayment = this.siteInfo.privateSiteInfo.isPaymentEnabled && !this.siteInfo.userInfo.isRenter;
            this.isFirstVisit = this.siteInfo.userInfo.lastLoginDateUtc === null;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showFirstVisitModal = this.isFirstVisit && !this.$rootScope.hasClosedFirstVisitModal && this.siteInfo.privateSiteInfo.siteLaunchedDateUtc === null;
            this.allyAppName = AppConfig.appName;
            this.homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType;
            if (!this.homeRightColumnType)
                this.homeRightColumnType = "localnews";
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            var innerThis = this;
            this.$scope.$on("homeHasActivePolls", function () { return innerThis.shouldShowAlertSection = true; });
        };
        ChtnHomeController.prototype.hideFirstVisit = function () {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        };
        ChtnHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "$scope"];
        return ChtnHomeController;
    }());
    Ally.ChtnHomeController = ChtnHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("chtnHome", {
    templateUrl: "/ngApp/chtn/member/chtn-home.html",
    controller: Ally.ChtnHomeController
});

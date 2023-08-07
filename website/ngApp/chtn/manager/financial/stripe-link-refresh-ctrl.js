var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    var StripeLinkRefreshController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function StripeLinkRefreshController($http, siteInfo, appCacheService, $location) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.$location = $location;
            this.isLoading = false;
            this.statusMessage = "Refreshing Stripe Connection...";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        StripeLinkRefreshController.prototype.$onInit = function () {
            this.refreshLink();
        };
        /**
        * Retrieve the report data
        */
        StripeLinkRefreshController.prototype.refreshLink = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/StripePayments/StartSignUp").then(function (response) {
                _this.statusMessage = "Refreshed, redirecting to Stripe now...";
                window.location.href = response.data;
            }, function (response) {
                _this.isLoading = false;
                _this.statusMessage = "Failed to restart Stripe sign-up, please refresh the page or contact support (Error: " + response.data.exceptionMessage + ")";
                alert(_this.statusMessage);
            });
        };
        StripeLinkRefreshController.$inject = ["$http", "SiteInfo", "appCacheService", "$location"];
        return StripeLinkRefreshController;
    }());
    Ally.StripeLinkRefreshController = StripeLinkRefreshController;
})(Ally || (Ally = {}));
CA.angularApp.component("stripeLinkRefresh", {
    templateUrl: "/ngApp/chtn/manager/financial/stripe-link-refresh.html",
    controller: Ally.StripeLinkRefreshController
});

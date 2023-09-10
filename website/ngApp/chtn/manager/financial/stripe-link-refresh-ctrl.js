var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    class StripeLinkRefreshController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, appCacheService, $location) {
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
        $onInit() {
            this.refreshLink();
        }
        /**
        * Retrieve the report data
        */
        refreshLink() {
            this.isLoading = true;
            this.$http.get("/api/StripePayments/StartSignUp").then((response) => {
                this.statusMessage = `Refreshed, redirecting to Stripe now...`;
                window.location.href = response.data;
            }, (response) => {
                this.isLoading = false;
                this.statusMessage = `Failed to restart Stripe sign-up, please refresh the page or contact support (Error: ${response.data.exceptionMessage})`;
                alert(this.statusMessage);
            });
        }
    }
    StripeLinkRefreshController.$inject = ["$http", "SiteInfo", "appCacheService", "$location"];
    Ally.StripeLinkRefreshController = StripeLinkRefreshController;
})(Ally || (Ally = {}));
CA.angularApp.component("stripeLinkRefresh", {
    templateUrl: "/ngApp/chtn/manager/financial/stripe-link-refresh.html",
    controller: Ally.StripeLinkRefreshController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to view group premium plan settings
     */
    var PremiumPlanSettingsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PremiumPlanSettingsController($http, siteInfo, $timeout, $scope, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.$rootScope = $rootScope;
            this.settings = new Ally.ChtnSiteSettings();
            this.originalSettings = new Ally.ChtnSiteSettings();
            this.isLoading = false;
            this.shouldShowPremiumPlanSection = true;
            this.shouldShowPremiumPlanSection = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            this.homeNamePlural = AppConfig.homeName.toLowerCase() + "s";
        }
        ;
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        PremiumPlanSettingsController.prototype.$onInit = function () {
            this.refreshData();
        };
        /**
         * Occurs when the user clicks the button to cancel the premium plan auto-renewal
         */
        PremiumPlanSettingsController.prototype.cancelPremiumAutoRenew = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/Settings/CancelPremium", null).then(function (response) {
                _this.isLoading = false;
                _this.settings.premiumPlanIsAutoRenewed = false;
            }, function () {
                _this.isLoading = false;
                alert("Failed to cancel the premium plan. Refresh the page and try again or contact support if the problem persists.");
            });
        };
        /**
         * Occurs when the user clicks the button to enable premium plan auto-renewal
         */
        PremiumPlanSettingsController.prototype.activatePremiumRenewal = function () {
            //if( this.numPaperLettersToSend === 0 )
            //{
            //    if( this.numEmailsToSend === 0 )
            //        alert( "No e-mails or paper letters selected to send." );
            //    else
            //        this.submitFullMailingAfterCharge();
            var _this = this;
            //    return;
            //}
            this.isLoading = true;
            this.$http.put("/api/Settings/ActivatePremium", null).then(function (response) {
                _this.isLoading = false;
                _this.settings.premiumPlanIsAutoRenewed = true;
            }, function () {
                _this.isLoading = false;
                alert("Failed to cancel the premium plan. Refresh the page and try again or contact support if the problem persists.");
            });
            return;
            //let stripeKey = "pk_test_FqHruhswHdrYCl4t0zLrUHXK";
            var stripeKey = "pk_live_fV2yERkfAyzoO9oWSfORh5iH";
            var checkoutHandler = StripeCheckout.configure({
                key: stripeKey,
                image: '/assets/images/icons/Icon-144.png',
                locale: 'auto',
                email: this.siteInfo.userInfo.emailAddress,
                token: function (token) {
                    // You can access the token ID with `token.id`.
                    // Get the token ID to your server-side code for use.
                    //this.fullMailingInfo.stripeToken = token.id;
                    //this.submitFullMailingAfterCharge();
                }
            });
            this.isLoading = true;
            // Open Checkout with further options:
            checkoutHandler.open({
                name: 'Community Ally',
                description: "Premium Plan",
                zipCode: true,
                amount: this.settings.premiumPlanCostDollars * 100 // Stripe uses cents
            });
            // Close Checkout on page navigation:
            window.addEventListener('popstate', function () {
                checkoutHandler.close();
            });
        };
        /**
         * Populate the page from the server
         */
        PremiumPlanSettingsController.prototype.refreshData = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Settings").then(function (response) {
                _this.isLoading = false;
                _this.settings = response.data;
                _this.originalSettings = _.clone(response.data);
                _this.isPremiumPlanActive = _this.siteInfo.privateSiteInfo.isPremiumPlanActive;
                _this.premiumPlanRenewDate = new Date();
                _this.premiumPlanRenewDate.setDate(_this.settings.premiumPlanExpirationDate.getDate() + 1);
            });
        };
        PremiumPlanSettingsController.$inject = ["$http", "SiteInfo", "$timeout", "$scope", "$rootScope"];
        return PremiumPlanSettingsController;
    }());
    Ally.PremiumPlanSettingsController = PremiumPlanSettingsController;
})(Ally || (Ally = {}));
CA.angularApp.component("premiumPlanSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/premium-plan-settings.html",
    controller: Ally.PremiumPlanSettingsController
});

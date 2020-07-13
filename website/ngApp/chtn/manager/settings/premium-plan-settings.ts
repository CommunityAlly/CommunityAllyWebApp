declare var appVer: number;


namespace Ally
{
    /**
     * The controller for the page to view group premium plan settings
     */
    export class PremiumPlanSettingsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$timeout", "$scope", "$rootScope"];

        settings: ChtnSiteSettings = new ChtnSiteSettings();
        originalSettings: ChtnSiteSettings = new ChtnSiteSettings();
        isLoading: boolean = false;;
        shouldShowPremiumPlanSection: boolean = true;
        homeNamePlural: string;
        isPremiumPlanActive: boolean;
        premiumPlanRenewDate: Date;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private $timeout: ng.ITimeoutService,
            private $scope: ng.IScope,
            private $rootScope: ng.IRootScopeService )
        {
            this.shouldShowPremiumPlanSection = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            this.homeNamePlural = AppConfig.homeName.toLowerCase() + "s";
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            this.refreshData();
        }


        /**
         * Occurs when the user clicks the button to cancel the premium plan auto-renewal
         */
        cancelPremiumAutoRenew()
        {
            this.isLoading = true;

            this.$http.put( "/api/Settings/CancelPremium", null ).then(
                ( response: ng.IHttpPromiseCallbackArg<ChtnSiteSettings> ) =>
                {
                    this.isLoading = false;
                    this.settings.premiumPlanIsAutoRenewed = false;
                },
                () =>
                {
                    this.isLoading = false;
                    alert( "Failed to cancel the premium plan. Refresh the page and try again or contact support if the problem persists." );
                }
            );
        }


        /**
         * Occurs when the user clicks the button to enable premium plan auto-renewal
         */
        activatePremiumRenewal()
        {
            //if( this.numPaperLettersToSend === 0 )
            //{
            //    if( this.numEmailsToSend === 0 )
            //        alert( "No e-mails or paper letters selected to send." );
            //    else
            //        this.submitFullMailingAfterCharge();

            //    return;
            //}

            this.isLoading = true;

            this.$http.put( "/api/Settings/ActivatePremium", null ).then(
                ( response: ng.IHttpPromiseCallbackArg<ChtnSiteSettings> ) =>
                {
                    this.isLoading = false;
                    this.settings.premiumPlanIsAutoRenewed = true;
                },
                () =>
                {
                    this.isLoading = false;
                    alert( "Failed to cancel the premium plan. Refresh the page and try again or contact support if the problem persists." );
                }
            );

            return;

            //let stripeKey = "pk_test_FqHruhswHdrYCl4t0zLrUHXK";
            let stripeKey = "pk_live_fV2yERkfAyzoO9oWSfORh5iH";

            let checkoutHandler = StripeCheckout.configure( {
                key: stripeKey,
                image: '/assets/images/icons/Icon-144.png',
                locale: 'auto',
                email: this.siteInfo.userInfo.emailAddress,
                token: ( token: any ) =>
                {
                    // You can access the token ID with `token.id`.
                    // Get the token ID to your server-side code for use.
                    //this.fullMailingInfo.stripeToken = token.id;

                    //this.submitFullMailingAfterCharge();
                }
            } );

            this.isLoading = true;

            // Open Checkout with further options:
            checkoutHandler.open( {
                name: 'Community Ally',
                description: `Premium Plan`,
                zipCode: true,
                amount: this.settings.premiumPlanCostDollars * 100 // Stripe uses cents
            } );

            // Close Checkout on page navigation:
            window.addEventListener( 'popstate', function()
            {
                checkoutHandler.close();
            } );
        }


        /**
         * Populate the page from the server
         */
        refreshData()
        {
            this.isLoading = true;

            this.$http.get( "/api/Settings" ).then( ( response: ng.IHttpPromiseCallbackArg<ChtnSiteSettings> ) =>
            {
                this.isLoading = false;
                this.settings = response.data;
                this.originalSettings = _.clone( response.data );

                this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
                this.premiumPlanRenewDate = new Date();
                this.premiumPlanRenewDate.setDate( this.settings.premiumPlanExpirationDate.getDate() + 1 );
            } );
        }
    }
}


CA.angularApp.component( "premiumPlanSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/premium-plan-settings.html",
    controller: Ally.PremiumPlanSettingsController
} );
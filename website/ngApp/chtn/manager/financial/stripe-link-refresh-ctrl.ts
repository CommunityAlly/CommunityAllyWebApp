namespace Ally
{
    /**
     * The controller for the page to track group spending
     */
    export class StripeLinkRefreshController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "appCacheService", "$location"];

        isLoading: boolean = false;
        statusMessage = "Refreshing Stripe Connection...";

        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private appCacheService: AppCacheService,
            private $location: ng.ILocationService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.refreshLink();
        }


        /**
        * Retrieve the report data
        */
        refreshLink()
        {
            this.isLoading = true;

            this.$http.get( "/api/StripePayments/StartSignUp" ).then(
                ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    this.statusMessage = `Refreshed, redirecting to Stripe now...`;
                    window.location.href = response.data;
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    this.statusMessage = `Failed to restart Stripe sign-up, please refresh the page or contact support (Error: ${response.data.exceptionMessage})`;
                    alert( this.statusMessage );
                }
            );
        }
    }
}


CA.angularApp.component( "stripeLinkRefresh", {
    templateUrl: "/ngApp/chtn/manager/financial/stripe-link-refresh.html",
    controller: Ally.StripeLinkRefreshController
} );

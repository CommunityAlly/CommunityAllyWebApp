namespace Ally
{
    /**
     * The controller for the widget that shows news headlines for the local area
     */
    export class LocalNewsFeedController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$timeout"];

        isLoading: boolean = false;
        localNewStories: any[];


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $timeout: ng.ITimeoutService )
        {
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            // Load the news with a slight delay to help the page load faster
            this.isLoading = true;
            this.$timeout( () => this.loadNewsStories(), 200 );
        }


        /**
         * Refresh the local news feed
         */
        loadNewsStories()
        {
            //window.location.host is subdomain.domain.com
            const subDomain = HtmlUtil.getSubdomain( window.location.host );

            // A little test to help the automated tests run faster
            let isTestSubdomain = subDomain === "qa" || subDomain === "localtest";
            isTestSubdomain = false; // Allow on test sites for now
            if( isTestSubdomain )
                return;

            this.isLoading = true;

            let localNewsUri;
            let queryParams;

            if( this.siteInfo.privateSiteInfo.country === "US" )
            {
                localNewsUri = "https://localnewsally.azurewebsites.net/api/LocalNews";

                queryParams = {
                    clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                    chicagoWard: this.siteInfo.privateSiteInfo.chicagoWard,
                    zipCode: this.siteInfo.privateSiteInfo.zipCode,
                    cityNeighborhood: this.siteInfo.privateSiteInfo.localNewsNeighborhoodQuery,
                    city: this.siteInfo.privateSiteInfo.groupAddress.city,
                    state2Char: this.siteInfo.privateSiteInfo.groupAddress.state
                };
            }
            else
            {
                localNewsUri = "https://localnewsally.azurewebsites.net/api/LocalNews/International/MajorCity";

                queryParams = {
                    clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                    countryCode: this.siteInfo.privateSiteInfo.country,
                    city: this.siteInfo.privateSiteInfo.groupAddress.city
                };
            }

            this.$http.get( localNewsUri, {
                cache: true,
                params: queryParams
            } ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<any[]> ) =>
            {
                this.isLoading = false;
                this.localNewStories = httpResponse.data;
            } );
        }
    }
}


CA.angularApp.component( "localNewsFeed", {
    templateUrl: "/ngApp/common/local-news-feed.html",
    controller: Ally.LocalNewsFeedController
} );
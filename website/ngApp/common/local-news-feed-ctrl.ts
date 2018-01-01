namespace Ally
{
    /**
     * The controller for the widget that lets members send e-mails to the group
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
            var innerThis = this;
            this.$timeout( () => innerThis.loadNewsStories(), 200 );
        }


        /**
         * Refresh the local news feed
         */
        loadNewsStories()
        {
            //window.location.host is subdomain.domain.com
            var subDomain = HtmlUtil.getSubdomain( window.location.host );

            // A little test to help the automated tests run faster
            var isTestSubdomain = subDomain === "qa" || subDomain === "localtest";
            isTestSubdomain = false;
            if( isTestSubdomain )
                return;

            this.isLoading = true;

            var localNewsUri;
            var queryParams;

            if( this.siteInfo.privateSiteInfo.country === "US" )
            {
                localNewsUri = "https://localnewsally.org/api/LocalNews";

                queryParams = {
                    clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                    chicagoWard: this.siteInfo.publicSiteInfo.chicagoWard,
                    zipCode: this.siteInfo.publicSiteInfo.zipCode,
                    cityNeighborhood: this.siteInfo.publicSiteInfo.localNewsNeighborhoodQuery
                };
            }
            else
            {
                localNewsUri = "https://localnewsally.org/api/LocalNews/International/MajorCity";

                queryParams = {
                    clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                    countryCode: this.siteInfo.privateSiteInfo.country,
                    city: this.siteInfo.privateSiteInfo.groupAddress.city
                };
            }

            var innerThis = this;
            this.$http.get( localNewsUri, {
                cache: true,
                params: queryParams
            } ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<any[]> )
            {
                innerThis.isLoading = false;
                innerThis.localNewStories = httpResponse.data;
            } );
        }
    }
}


CA.angularApp.component( "localNewsFeed", {
    templateUrl: "/ngApp/common/local-news-feed.html",
    controller: Ally.LocalNewsFeedController
} );
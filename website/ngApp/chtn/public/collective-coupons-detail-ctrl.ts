namespace Ally
{
    /**
     * The controller for the page to view a collective coupon
     */
    export class CollectiveCouponDetailController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$cacheFactory"];
        isLoading = false;
        collectiveCouponId = "123";
        whereMap: google.maps.Map;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            const mapOptions = {
                center: new google.maps.LatLng( 39.883, -104.7848 ),
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.SATELLITE
            };

            const mapElem = document.getElementById( "google-map-panel" );

            this.whereMap = new google.maps.Map( mapElem, mapOptions );

            const communityCoords = [
                { lat: 39.9000325, lng: -104.7805823 },
                { lat: 39.8999667, lng: -104.8014391 },
                { lat: 39.8954231, lng: -104.8052157 },
                { lat: 39.895489, lng: -104.8095072 },
                { lat: 39.8916037, lng: -104.8091639 },
                { lat: 39.8856765, lng: -104.7981776 },
                { lat: 39.8797489, lng: -104.7968043 },
                { lat: 39.8711199, lng: -104.7849596 },
                { lat: 39.8705929, lng: -104.7732867 },
                { lat: 39.8927891, lng: -104.7738017 },
                { lat: 39.9000325, lng: -104.7805823 }
            ];

            const communityPoly = new google.maps.Polygon( {
                paths: communityCoords,
                strokeColor: "#0000FF",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: "#0000FF",
                fillOpacity: 0.25,
            } );

            communityPoly.setMap( this.whereMap );
        }
    }
}


CA.angularApp.component( "collectiveCouponDetail", {
    templateUrl: "/ngApp/chtn/public/collective-coupon-detail.html",
    controller: Ally.CollectiveCouponDetailController
} );
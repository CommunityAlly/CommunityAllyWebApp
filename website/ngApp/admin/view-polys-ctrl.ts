namespace Ally
{
    /**
     * The controller for the admin-only page to polygon data
     */
    export class ViewPolysController implements ng.IController
    {
        static $inject = ["$http", "$q"];
        isLoading: boolean = false;
        polys: any[];
        neighborhoods: any[];
        neighborhoodPolys: any[];
        mapCenter: any;


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
            this.refreshAddresses();
        }
        

        findCenter( polys: any[] )
        {
            var currentCenter = {
                lat: 0,
                lng: 0
            };

            for( var polyIndex = 0; polyIndex < polys.length; ++polyIndex )
            {
                var curPoly = polys[polyIndex];
                if( !curPoly )
                    continue;

                var polyCenter = {
                    lat: 0,
                    lng: 0
                };

                for( var vertexIndex = 0; vertexIndex < curPoly.vertices.length; ++vertexIndex )
                {
                    var vertex = curPoly.vertices[vertexIndex];
                    polyCenter.lat += vertex.lat;
                    polyCenter.lng += vertex.lng;
                }

                polyCenter.lat /= curPoly.vertices.length;
                polyCenter.lng /= curPoly.vertices.length;

                currentCenter.lat += polyCenter.lat;
                currentCenter.lng += polyCenter.lng;
            }

            currentCenter.lat /= polys.length;
            currentCenter.lng /= polys.length;

            return currentCenter;
        }

        // Get the polygons to display
        refreshAddresses()
        {
            this.isLoading = true;

            this.neighborhoodPolys = [];

            var innerThis = this;
            this.$http.get( "/api/Neighborhood" ).then( ( httpResponse:ng.IHttpPromiseCallbackArg<any> ) =>
            {
                innerThis.isLoading = false;

                innerThis.neighborhoods = httpResponse.data;

                innerThis.neighborhoodPolys = _.select( innerThis.neighborhoods, function( n ) { return n.Bounds; } );

                innerThis.mapCenter = innerThis.findCenter( this.neighborhoodPolys );

            }, ( httpResponse:ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                innerThis.isLoading = false;

                alert( "Failed to retrieve neighborhoods: " + httpResponse.data.exceptionMessage );
            } );
        };
    }
}


CA.angularApp.component( "viewPolys", {
    templateUrl: "/ngApp/admin/view-polys.html",
    controller: Ally.ViewPolysController
} );
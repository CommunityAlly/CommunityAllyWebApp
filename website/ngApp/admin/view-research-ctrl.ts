﻿namespace Ally
{
    /**
     * The controller for the admin-only page to view address research data
     */
    export class ViewResearchController implements ng.IController
    {
        static $inject = ["$http"];

        mapCenter: any;
        isLoading: boolean = false;
        cells: any[];
        selectedCell: any;
        buildings: any[];
        buildingPoints: any[];
        selectedAddress: any;
        selectedGpsPoly: any;


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
            this.mapCenter = { lat: 41.99114, lng: -87.690425 };

            // Initialize the UI
            this.refreshCells();
        }



        addLine( map: any, minLat: number, minLon: number, maxLat: number, maxLon: number )
        {
            const lineCoordinates = [
                { lat: minLat, lng: minLon },
                { lat: maxLat, lng: maxLon }
            ];

            const linePath = new google.maps.Polyline( {
                path: lineCoordinates,
                geodesic: false,
                strokeColor: '#FF0000',
                strokeOpacity: 1.0,
                strokeWeight: 2
            } );

            linePath.setMap( map );
        }


        //onBuildingSelected( building: any )
        //{
        //}


        onCellSelected( cell: any )
        {
            cell.gpsBounds.mapShapeObject.setOptions( { fillOpacity: 0.1 } );

            if( this.selectedCell )
            {
                this.selectedCell.gpsBounds.mapShapeObject.setOptions( { fillOpacity: 0.35 } );
            }

            this.selectedCell = cell;

            _.each( this.selectedCell.streets, function( s: any )
            {
                if( s.minLat != 0 )
                    this.addLine( cell.gpsBounds.mapShapeObject.map, s.minLat, s.minLon, s.maxLat, s.maxLon );
            } );
        }

        // Get the addresses that are missing bounding polys
        refreshCells()
        {
            this.isLoading = true;

            this.$http.get( "/api/ResearchMap" ).then(
                ( response: ng.IHttpPromiseCallbackArg<any[]> ) =>
                {
                    this.isLoading = false;

                    this.cells = response.data;

                    //this.cellPolys = _.map( this.cells, function ( c )
                    //{
                    //    var result = c.gpsBounds;
                    //    result.ownerCell = c;

                    //    result.onClick = function ()
                    //    {
                    //        this.onCellSelected( result.ownerCell );
                    //    };

                    //    return result;
                    //} );

                    this.isLoading = true;

                    this.$http.get( "/api/ResearchMap/Buildings" ).then(
                        ( httpResponse: ng.IHttpPromiseCallbackArg<any[]> ) =>
                        {
                            this.isLoading = false;

                            this.buildings = httpResponse.data;

                            //this.cellPolys = _.map( this.buildings, function ( b )
                            //{
                            //    var result = b.footprintPolygon;
                            //    result.ownerBuilding = b;

                            //    result.onClick = function ()
                            //    {
                            //        this.onBuildingSelected( result.ownerBuilding );
                            //    };

                            //    return result;
                            //} );

                            this.buildingPoints = _.map( this.buildings, function( b: any )
                            {
                                const result = b.addressPos;
                                result.ownerBuilding = b;

                                result.onClick = function()
                                {
                                    //this.onBuildingSelected( result.ownerBuilding );
                                };

                                return result;
                            } );
                        }
                    );
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve cells: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        // Occurs when the user clicks an address
        onAddressSelected( address: any )
        {
            //if ( address.gpsPos )
            //    this.mapInstance.setCenter( { lat: address.gpsPos.lat, lng: address.gpsPos.lon } );

            this.selectedAddress = address;

            // Ensure we have a valid array to work with
            if( !this.selectedAddress.gpsBounds )
                this.selectedAddress.gpsBounds = { vertices: [] };
            if( !this.selectedAddress.gpsBounds.vertices )
                this.selectedAddress.gpsBounds.vertices = [];

            // If the array is empty then create a default rectangle
            if( this.selectedAddress.gpsBounds.vertices.length == 0 && address.gpsPos )
            {
                //const southWest = new google.maps.LatLng( address.gpsPos.lat, address.gpsPos.lon );
                //const northEast = new google.maps.LatLng( address.gpsPos.lat + 0.001, address.gpsPos.lon + 0.001 );

                address.gpsBounds.vertices = [
                    { lat: address.gpsPos.lat, lon: address.gpsPos.lon },
                    { lat: address.gpsPos.lat + 0.001, lon: address.gpsPos.lon },
                    { lat: address.gpsPos.lat + 0.001, lon: address.gpsPos.lon + 0.001 },
                    { lat: address.gpsPos.lat, lon: address.gpsPos.lon + 0.001 }
                ];
            }

            this.selectedGpsPoly = address.gpsBounds;
            //createPolygon( this.mapInstance, address.gpsBounds.vertices );
        }

        //google.maps.event.addDomListener( window, 'load', initialize );
        //google.maps.event.addListener( this.mapInstance, 'click', function (mouseEvent)
        //{
        //    console.log( "Creating shape" );

        //    var southWest = new google.maps.LatLng( mouseEvent.latLng.lat(), mouseEvent.latLng.lng() );
        //    var northEast = new google.maps.LatLng( mouseEvent.latLng.lat() + 0.41, mouseEvent.latLng.lng() + 0.41 );

        //    var vertices = [
        //        southWest,
        //        new google.maps.LatLng( northEast.lat(), southWest.lng() ),
        //        northEast,
        //        new google.maps.LatLng( southWest.lat(), northEast.lng() )
        //    ];

        //    var newShape = createPolygon( this.mapInstance, vertices );

        //    newShape.myName = "Name" + ( Math.floor( Math.random() * 10000 ) );
        //} );


    }
}


CA.angularApp.component( "viewResearch", {
    templateUrl: "/ngApp/admin/view-research.html",
    controller: Ally.ViewResearchController
} );
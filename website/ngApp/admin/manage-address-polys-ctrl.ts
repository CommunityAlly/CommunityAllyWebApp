namespace Ally
{
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    export class ManageAddressPolysController implements ng.IController
    {
        static $inject = ["$http", "$q"];
        isLoading: boolean = false;
        filterAddresses: string;
        addresses: any[];
        addressPoints: any[];
        selectedAddress: any;
        selectedGpsPoly: any;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private $q: ng.IQService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            // Initialize the UI
            this.refreshAddresses();
        }


        getPolyInfo( url: string, polyType: any )
        {
            var deferred = this.$q.defer();

            this.isLoading = true;

            var innerThis = this;
            this.$http.get( url ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<any> )
            {
                innerThis.isLoading = false;

                var addresses = httpResponse.data;

                // Mark address as opposed to group bounds
                _.each( addresses, function( a:any )
                {
                    a.polyType = polyType;

                    if( polyType == "Group" )
                        a.oneLiner = a.shortName + ", " + a.appName;
                } );

                $.merge( innerThis.addresses, addresses );

                deferred.resolve( innerThis.addresses );

            }, function( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> )
            {
                this.isLoading = false;

                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert( "Failed to retrieve addresses: " + errorMessage );

                deferred.reject();
            } );

            return deferred.promise;
        }


        getGroupBoundPolys()
        {
            return this.getPolyInfo( "/api/AdminMap/GetGroupBounds?filter=" + this.filterAddresses, "Group" );
        }


        getAddressPolys()
        {
            return this.getPolyInfo( "/api/AdminMap?filter=" + this.filterAddresses, "Address" );
        }


        // Get the addresses that are missing bounding polys
        refreshAddresses()
        {
            this.isLoading = true;

            this.addresses = [];

            var innerThis = this;
            this.getAddressPolys().then( () => innerThis.getGroupBoundPolys() ).then( function( addresses: any[] )
            {
                innerThis.addressPoints = [];
                _.each( addresses, function( a )
                {
                    if( a.gpsPos )
                    { 
                        // The GoogleMapPoly directive uses the fullAddress for the marker tooltip
                        a.gpsPos.fullAddress = a.oneLiner;
                        innerThis.addressPoints.push( a.gpsPos );
                    }
                } );
            } );
        }

        onSavePoly()
        {
            this.isLoading = true;

            let serverVerts = { vertices: this.selectedAddress.gpsBounds.vertices };

            var url = this.selectedAddress.polyType === "Address" ? ( "/api/AdminMap?addressId=" + this.selectedAddress.addressId ) : ( "/api/AdminMap?groupId=" + this.selectedAddress.groupId );

            var innerThis = this;
            this.$http.put( url, serverVerts ).then( function()
            {
                innerThis.isLoading = false;

            }, function()
            {
                innerThis.isLoading = false;
            } );
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
                var southWest = new google.maps.LatLng( address.gpsPos.lat, address.gpsPos.lon );
                var northEast = new google.maps.LatLng( address.gpsPos.lat + 0.001, address.gpsPos.lon + 0.001 );

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


CA.angularApp.component( "manageAddressPolys", {
    templateUrl: "/ngApp/admin/manage-address-polys.html",
    controller: Ally.ManageAddressPolysController
} );
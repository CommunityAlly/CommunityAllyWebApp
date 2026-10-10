namespace Ally
{
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    export class ManageAddressPolysController implements ng.IController
    {
        static $inject = ["$http", "$q"];
        isLoading: boolean = false;
        appTypeFilter = "";
        allAddresses: GroupBoundInfo[] = [];
        filteredAddresses: GroupBoundInfo[] = [];
        addressPoints: any[] = [];
        selectedAddress: GroupBoundInfo | null = null;
        selectedGpsPoly: GpsPolygon | null = null;
        zoomedAddresses: GroupBoundInfo[] = [];
        includeAddresses: boolean = false;
        shouldExcludeGroups = false;
        excludeMonthsOld = 6;
        excludeLoginMonthsOld = 2;
        shouldExcludeFreePlan = true;


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


        static AppTypeToUrl( appType: string, shortName: string )
        {
            switch( appType )
            {
                case "Condo":
                    return `https://${shortName}.condoally.com/`;
                case "Hoa":
                    return `https://${shortName}.hoaally.org/`;
                case "Home":
                    return `https://${shortName}.homeally.org/`;
                case "Neighborhood":
                    return `https://${shortName}.NeighborhoodAlly.org/`;
                case "BlockClub":
                    return `https://${shortName}.BlockClubAlly.org/`;
            }

            return null;
        }


        getPolyInfo( url: string, polyType: string )
        {
            const deferred = this.$q.defer<GroupBoundInfo[]>();

            this.isLoading = true;

            this.$http.get<GroupBoundInfo[]>( url ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<GroupBoundInfo[]> ) =>
                {
                    this.isLoading = false;

                    const addresses = httpResponse.data!;

                    // Mark address as opposed to group bounds
                    _.each( addresses, ( a: GroupBoundInfo ) =>
                    {
                        a.polyType = polyType;

                        if( polyType === "Group" )
                        {
                            a.oneLiner = `${a.shortName}, ${a.appName} (ID: ${a.groupId})`;

                            a.visitUrl = ManageAddressPolysController.AppTypeToUrl( a.appName, a.shortName );
                        }
                    } );

                    if(this.includeAddresses)
                        $.merge(this.allAddresses, addresses);
                    else
                        this.allAddresses = addresses;
                    console.log("this.allAddresses.length=" + this.allAddresses.length);

                    this.updateFilteredGroups();
                    deferred.resolve( this.allAddresses );

                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;

                    const errorMessage = httpResponse.data!.exceptionMessage ? httpResponse.data!.exceptionMessage : httpResponse.data;
                    alert( "Failed to retrieve addresses: " + errorMessage );

                    deferred.reject();
                }
            );

            return deferred.promise;
        }


        getGroupBoundPolys()
        {
            return this.getPolyInfo( "/api/AdminMap/GetGroupBounds?filter=" + this.appTypeFilter, "Group" );
        }


        getAddressPolys()
        {
            return this.getPolyInfo( "/api/AdminMap/GetAll?filter=" + this.appTypeFilter, "Address" );
        }


        updateMapMarkers( addresses: GroupBoundInfo[] )
        {
            this.addressPoints = [];
            _.each( addresses, ( a ) =>
            {
                if( a.gpsPos )
                {
                    // The GoogleMapPoly directive uses the fullAddress for the marker tooltip
                    (a.gpsPos as any).fullAddress = a.oneLiner;

                    (a.gpsPos as any).onClick = () => {
                        console.log( "Clicked marker for " + a.oneLiner );
                    };

                    this.addressPoints.push( a.gpsPos );
                }
            } );
        }


        // Get the addresses that are missing bounding polys
        refreshAddresses()
        {
            this.isLoading = true;

            this.allAddresses = [];

            if( this.includeAddresses )
                this.getAddressPolys().then( () => this.getGroupBoundPolys() ).then( addrs => this.updateMapMarkers( addrs ) );
            else
                this.getGroupBoundPolys().then( addrs => this.updateMapMarkers( addrs ) );
        }


        onSavePoly()
        {
            if( !this.selectedAddress || !this.selectedGpsPoly )
                return;

            this.isLoading = true;

            const serverVerts = { vertices: this.selectedAddress.gpsBounds.vertices };

            const url = this.selectedAddress.polyType === "Address" ? ( "/api/AdminMap/UpdateAddress/" + this.selectedAddress.addressId ) : ( "/api/AdminMap/UpdateGroup/" + this.selectedAddress.groupId );

            this.$http.put( url, serverVerts ).then(
                () =>
                {
                    this.isLoading = false;
                },
                () =>
                {
                    this.isLoading = false;
                }
            );
        }


        // Occurs when the user clicks an address link
        onAddressSelected( address: GroupBoundInfo )
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


        updateFilteredGroups()
        {
            this.filteredAddresses = this.allAddresses;

            if( this.shouldExcludeGroups && this.excludeLoginMonthsOld > 0 && this.excludeMonthsOld > 0 )
            {
                this.filteredAddresses = this.filteredAddresses.filter( ( a ) =>
                {
                    if( moment().diff( moment( a.creationDate ), "month" ) < this.excludeMonthsOld )
                        return false;

                    if( !a.lastLoginDateUtc || moment().diff( moment( a.lastLoginDateUtc ), "month" ) > this.excludeLoginMonthsOld )
                        return false;

                    if( this.shouldExcludeFreePlan && !a.isOnPaidPremium )
                        return false;

                    return true;
                } );
            }

            this.updateMapMarkers( this.filteredAddresses );
        }


        onMapViewChange( mapInstance: google.maps.Map )
        {
            const zoomLevel = mapInstance.getZoom();
            //console.log( 'Zoom level changed to: ' + zoomLevel );

            // Find all addresses within the map bounds
            this.zoomedAddresses = [];
            if( zoomLevel > 7 )
            {
                const mapBounds = mapInstance.getBounds();
                this.zoomedAddresses = this.filteredAddresses.filter( ( a ) =>
                {
                    if (!a.gpsPos)
                        return false;

                    const addressLatLng = new google.maps.LatLng( a.gpsPos.lat, a.gpsPos.lon );
                    if( mapBounds.contains( addressLatLng ) )
                        return true;

                    return false;
                } );
            }
                
        }
    }


    interface GroupBoundInfo
    {
        groupId: number;
        shortName: string;
        fullName: string;
        appName: string;
        gpsPos: GpsPoint;
        gpsBounds: GpsPolygon;
        creationDate: Date;
        lastLoginDateUtc: Date | null;
        premiumPlanExpirationDate: Date;
        isOnPaidPremium: boolean;

        // Not from server, used in the UI
        polyType: string;
        oneLiner: string;
        visitUrl: string|null;
        addressId: number;
    }
}


CA.angularApp.component( "manageAddressPolys", {
    templateUrl: "/ngApp/admin/manage-address-polys.html",
    controller: Ally.ManageAddressPolysController
} );

namespace Ally
{
    class WelcomeTip
    {
        itemId: number;
        name: string;
        body: string;
        address: string;
        iconType: string;
        gpsPos: any;
        markerNumber: number;

        // Not from server
        markerIndex: number;
    }


    /**
     * The controller for the page that shows useful info on a map
     */
    export class ChtnMapController implements ng.IController
    {
        static $inject = ["$scope", "$timeout", "$http", "SiteInfo", "appCacheService"];

        editingTip: WelcomeTip = new WelcomeTip();
        hoaHomes: Unit[] = [];
        tips: WelcomeTip[] = [];
        isLoading: boolean = false;
        addressAutocomplete: google.maps.places.Autocomplete;
        isSiteManager: boolean;


        /**
         * The constructor for the class
         */
        constructor( private $scope: ng.IScope, private $timeout: ng.ITimeoutService, private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, public appCacheService : AppCacheService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            
            // If we know our group's position, let's tighten the 
            var autocompleteOptions = undefined;
            if( this.siteInfo.publicSiteInfo.googleGpsPosition )
            {
                var TwentyFiveMilesInMeters = 40234;

                var latLon = {
                    lat: 41.142248,
                    lng: -73.633228
                };
                var circle = new google.maps.Circle( {
                    center: this.siteInfo.publicSiteInfo.googleGpsPosition,
                    radius: TwentyFiveMilesInMeters
                } );

                autocompleteOptions = {
                    bounds: circle.getBounds()
                };
            }

            var addressInput = <HTMLInputElement>document.getElementById( "edit-location-address-text-box" );
            this.addressAutocomplete = new google.maps.places.Autocomplete( addressInput, autocompleteOptions );

            var innerThis = this;
            google.maps.event.addListener( this.addressAutocomplete, 'place_changed', function()
            {
                var place = innerThis.addressAutocomplete.getPlace();
                innerThis.editingTip.address = place.formatted_address;
            } );


            if( AppConfig.appShortName === "hoa" )
                this.retrieveHoaHomes();
            else
                this.refresh();

            var innerThis = this;
            this.$timeout( () => innerThis.getWalkScore(), 1000 );
            MapCtrlMapMgr.Init( this.siteInfo, this.$scope, this );
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the page
        ///////////////////////////////////////////////////////////////////////////////////////////////
        refresh()
        {
            this.isLoading = true;

            this.$http.get( "/api/WelcomeTip" ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.tips = httpResponse.data;

                MapCtrlMapMgr.ClearAllMarkers();

                if( AppConfig.appShortName === "condo" )
                    MapCtrlMapMgr.AddMarker( MapCtrlMapMgr._homeGpsPos.lat(), MapCtrlMapMgr._homeGpsPos.lng(), "Home", MapCtrlMapMgr.MarkerNumber_Home, null );
                
                for( var locationIndex = 0; locationIndex < this.tips.length; ++locationIndex )
                {
                    var curLocation = this.tips[locationIndex];

                    if( curLocation.gpsPos === null )
                        continue;

                    curLocation.markerIndex = MapCtrlMapMgr.AddMarker( curLocation.gpsPos.lat, curLocation.gpsPos.lon, curLocation.name, curLocation.markerNumber, null );
                }

                // Add HOA homes
                _.each( this.hoaHomes, ( home ) =>
                {
                    if( home.fullAddress && home.fullAddress.gpsPos )
                    {
                        var markerIcon = MapCtrlMapMgr.MarkerNumber_Home;
                        var markerText = home.name;

                        if( _.any( this.siteInfo.userInfo.usersUnits, u => u.unitId === home.unitId ) )
                        {
                            markerIcon = MapCtrlMapMgr.MarkerNumber_MyHome;
                            markerText = "Your home: " + markerText;
                        }

                        MapCtrlMapMgr.AddMarker( home.fullAddress.gpsPos.lat, home.fullAddress.gpsPos.lon, markerText, markerIcon, home.unitId );
                    }
                } );

                MapCtrlMapMgr.OnMarkersReady();

                this.isLoading = false;
            } );
        }

        
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to edit a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onEditTip( tip: any )
        {
            this.editingTip = jQuery.extend( {}, tip );
            window.scrollTo( 0, document.body.scrollHeight );
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to move a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onMoveMarker( tip: any )
        {
            MapCtrlMapMgr.SetMarkerDraggable( tip.markerIndex, true );
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to delete a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onDeleteTip( tip: any )
        {
            if( !confirm( 'Are you sure you want to delete this item?' ) )
                return;

            this.isLoading = true;
            
            this.$http.delete( "/api/WelcomeTip/" + tip.itemId ).then( () =>
            {
                this.isLoading = false;
                this.refresh();
            } );
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to add a new tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onSaveTip()
        {
            if( this.editingTip === null )
                return;

            //$( "#new-item-form" ).validate();
            //if ( !$( "#new-item-form" ).valid() )
            //    return;
            
            var onSave = () =>
            {
                this.isLoading = false;
                this.editingTip = new WelcomeTip();
                this.refresh();
            };

            var onFailure = ( response:ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to save item: " + response.data.exceptionMessage );
            };

            this.isLoading = true;

            // If we're editing an existing item
            if( this.editingTip.itemId )
                this.$http.put( "/api/WelcomeTip", this.editingTip ).then( onSave, onFailure );
            // Otherwise create a new one
            else
                this.$http.post( "/api/WelcomeTip", this.editingTip ).then( onSave, onFailure );
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Used by the ng-repeats to filter locations vs tips
        ///////////////////////////////////////////////////////////////////////////////////////////////
        isLocationTip( tip: any )
        {
            return tip.gpsPos !== null;
        }


        isNotLocationTip( tip: any )
        {
            return tip.gpsPos === null;
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the URL to the image for a specific marker
        ///////////////////////////////////////////////////////////////////////////////////////////////
        getMarkerIconUrl( markerNumber: number )
        {
            var MarkerNumber_Home = -2;
            var MarkerNumber_Hospital = -3;
            var MarkerNumber_PostOffice = -4;

            var retPath = "/assets/images/MapMarkers/";
            if( markerNumber >= 1 && markerNumber <= 10 )
                retPath += "green_" + markerNumber;
            else if( markerNumber === MarkerNumber_Home )
                retPath += "MapMarker_Home";
            else if( markerNumber === MarkerNumber_Hospital )
                retPath += "MapMarker_Hospital";
            else if( markerNumber === MarkerNumber_PostOffice )
                retPath += "MapMarker_PostOffice";

            retPath += ".png";

            return retPath;
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Move a marker's position
        ///////////////////////////////////////////////////////////////////////////////////////////////
        updateItemGpsLocation( markerIndex: number, lat: number, lon: number )
        {
            var tip = _.find( this.tips, function( t ) { return t.markerIndex === markerIndex; } );

            var updateInfo = {
                itemId: tip.itemId,
                newLat: lat,
                newLon: lon
            };

            this.isLoading = true;

            var innerThis = this;
            this.$http.put( "/api/WelcomeTip/UpdateGpsLocation", updateInfo ).then( function()
            {
                innerThis.isLoading = false;
            } );
        }


        /**
         * Set the walkscore info
         */
        getWalkScore()
        {
            var handleWalkScoreResult = function( httpResponse: ng.IHttpPromiseCallbackArg<any> )
            {
                if( !httpResponse || !httpResponse.data || httpResponse.data === "Error" )
                {
                    $( "#WalkScorePanel" ).html( "Failed to load Walk Score." );
                    $( "#WalkScorePanel" ).hide();
                }
                else
                    $( "#WalkScorePanel" ).html( httpResponse.data );
            };

            this.$http.get( "/api/WelcomeTip/GetWalkScore" ).then( handleWalkScoreResult, handleWalkScoreResult );
        }


        /**
        * Load the houses onto the map
        */
        retrieveHoaHomes()
        {
            this.$http.get( "/api/BuildingResidents/FullUnits" ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<Unit[]> ) =>
            {
                this.hoaHomes = httpResponse.data;

                this.refresh();

            }, () =>
            {
                this.refresh();
            } );
        }
    }
}


CA.angularApp.component( "chtnMap", {
    templateUrl: "/ngApp/chtn/member/chtn-map.html",
    controller: Ally.ChtnMapController
} );


class MapCtrlMapMgr
{
    //onMapApiLoaded: function ()
    //{
    //    MapCtrlMapMgr.Init();
    //},

    /*
    * The map displaying the area around the building
    * @type {google.maps.Map}
    */
    static _mainMap: any = null;

    /*
    * The position of our home building
    * @type {google.maps.LatLng}
    */
    static _homeGpsPos: any = null;

    static _groupGpsBounds: any = null;
    static _groupBoundsShape: any = null;

    /*
    * The array of markers on the map. We keep track in case the map wasn't created yet when
    * AddMarker was called.
    * @type {Array.<google.maps.Marker>}
    */
    static _markers: any[] = [];

    /**
    * The marker number that indicates the home marker icon
    * @type {Number}
    * @const
    */
    static MarkerNumber_Home = -2;

    /**
    * The marker number that indicates the home marker icon for the user's home
    * @type {Number}
    * @const
    */
    static MarkerNumber_MyHome = -5;

    /**
    * The marker number that indicates the hospital marker icon
    * @type {Number}
    * @const
    */
    static MarkerNumber_Hospital = -3;

    /**
    * The marker number that indicates the post office marker icon
    * @type {Number}
    * @const
    */
    static MarkerNumber_PostOffice = -4;

    static _isMapReady: boolean = false;
    static _areMarkersReady: boolean = false;
    static _tempMarkers: any[] = [];
    static ngScope: ng.IScope = null;
    static mapCtrl: Ally.ChtnMapController = null;
    
    /**
    * Called when the DOM structure is ready
    */
    static Init( siteInfo: Ally.SiteInfoService, scope: ng.IScope, mapCtrl: Ally.ChtnMapController )
    {
        MapCtrlMapMgr.ngScope = scope;
        MapCtrlMapMgr.mapCtrl = mapCtrl;

        if( typeof(google) === "undefined" )
            return;

        // Store our home position
        MapCtrlMapMgr._homeGpsPos = siteInfo.publicSiteInfo.googleGpsPosition;
        MapCtrlMapMgr._groupGpsBounds = siteInfo.publicSiteInfo.gpsBounds;

        // Create the map centered at our home
        var myOptions = {
            center: MapCtrlMapMgr._homeGpsPos,
            zoom: 25,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        MapCtrlMapMgr._mainMap = new google.maps.Map( document.getElementById( "map_canvas" ), myOptions );

        // Add our home marker
        if( AppConfig.appShortName === "condo" )
            MapCtrlMapMgr.AddMarker( MapCtrlMapMgr._homeGpsPos.lat(), MapCtrlMapMgr._homeGpsPos.lng(), "Home", MapCtrlMapMgr.MarkerNumber_Home, null );

        MapCtrlMapMgr.OnMapReady();
        
        // Add any markers that already exist to this map
        //for( var markerIndex = 0; markerIndex < MapCtrlMapMgr._markers.length; ++markerIndex )
        //{
        //    if( !MapCtrlMapMgr._markers[markerIndex].getMap() )
        //        MapCtrlMapMgr._markers[markerIndex].setMap( MapCtrlMapMgr._mainMap );
        //}
    }


    static OnMapReady()
    {
        MapCtrlMapMgr._isMapReady = true;

        if( MapCtrlMapMgr._areMarkersReady )
            MapCtrlMapMgr.OnMapAndMarkersReady();
    }

    static OnMarkersReady()
    {
        MapCtrlMapMgr._areMarkersReady = true;

        if( MapCtrlMapMgr._isMapReady )
            MapCtrlMapMgr.OnMapAndMarkersReady();
    }

    static OnMapAndMarkersReady()
    {
        for( var markerIndex = 0; markerIndex < MapCtrlMapMgr._tempMarkers.length; ++markerIndex )
        {
            var tempMarker = MapCtrlMapMgr._tempMarkers[markerIndex];

            var markerImageUrl = null;

            if( tempMarker.markerNumber >= 1 && tempMarker.markerNumber <= 10 )
                markerImageUrl = "/assets/images/MapMarkers/green_" + tempMarker.markerNumber + ".png";
            else if( tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_Home )
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_Home.png";
            else if( tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_Hospital )
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_Hospital.png";
            else if( tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_PostOffice )
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_PostOffice.png";
            else if( tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_MyHome )
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_MyHome.png";

            var marker = new google.maps.Marker(
                {
                    position: new google.maps.LatLng( tempMarker.lat, tempMarker.lon ),
                    map: MapCtrlMapMgr._mainMap,
                    animation: google.maps.Animation.DROP,
                    title: tempMarker.name,
                    icon: markerImageUrl
                } );
            (marker as any).markerIndex = markerIndex;
            
            google.maps.event.addListener( marker, 'dragend', function()
            {
                var marker = this;

                var gpsPos = marker.getPosition();

                MapCtrlMapMgr.ngScope.$apply( function()
                {
                    MapCtrlMapMgr.mapCtrl.updateItemGpsLocation( marker.markerIndex, gpsPos.lat(), gpsPos.lng() );
                } );
                
            } );

            if( AppConfig.appShortName === "hoa" && tempMarker.unitId )
            {
                (marker as any).unitId = tempMarker.unitId;

                marker.addListener( 'click', function( innerMarker )
                {
                    return function()
                    {
                        MapCtrlMapMgr.mapCtrl.appCacheService.set( "scrollToUnitId", (innerMarker as any).unitId.toString() );
                        window.location.hash = "#!/BuildingResidents";
                    }
                }( marker ) );
            }

            MapCtrlMapMgr._markers.push( marker );
        }

        // We've processed all of the temp markes so clear the array
        MapCtrlMapMgr._tempMarkers = [];
                
        if( MapCtrlMapMgr._groupGpsBounds )
        {
            var groupBoundsPath = Ally.MapUtil.gpsBoundsToGooglePoly( MapCtrlMapMgr._groupGpsBounds );

            var groupBoundsPolylineOptions = {
                paths: groupBoundsPath,
                map: MapCtrlMapMgr._mainMap,
                strokeColor: '#0000FF',
                strokeOpacity: 0.5,
                strokeWeight: 1,
                fillColor: '#0000FF',
                fillOpacity: 0.15,
                zIndex: -1
            };

            MapCtrlMapMgr._groupBoundsShape = new google.maps.Polygon( groupBoundsPolylineOptions );
        }

        MapCtrlMapMgr.ZoomMapToFitMarkers();
    }


    /**
    * Add a marker to the map
    */
    static ClearAllMarkers()
    {
        for( var i = 0; i < MapCtrlMapMgr._markers.length; i++ )
            MapCtrlMapMgr._markers[i].setMap( null );
        
        MapCtrlMapMgr._markers = [];
    }


    /**
    * Make a marker draggable or not
    */
    static SetMarkerDraggable( markerIndex: number, isDraggable: boolean )
    {
        MapCtrlMapMgr._markers[markerIndex].setDraggable( isDraggable );
    }


    /**
    * Add a marker to the map and return the index of that new marker
    */
    static AddMarker( lat: number, lon: number, name: string, markerNumber: number, unitId: number )
    {
        MapCtrlMapMgr._tempMarkers.push(
            {
                lat: lat,
                lon: lon,
                name: name,
                markerNumber: markerNumber,
                unitId: unitId
            } );

        return MapCtrlMapMgr._tempMarkers.length - 1;
    }


    /**
    * Set the map zoom so all markers are visible
    */
    static ZoomMapToFitMarkers()
    {
        //  Create a new viewpoint bound
        var bounds = new google.maps.LatLngBounds();

        //  Go through each marker and make the bounds extend to fit it
        for( var markerIndex = 0; markerIndex < MapCtrlMapMgr._markers.length; ++markerIndex )
            bounds.extend( MapCtrlMapMgr._markers[markerIndex].getPosition() );

        if( MapCtrlMapMgr._groupBoundsShape )
        {
            var path = MapCtrlMapMgr._groupBoundsShape.getPath();

            for( var i = 0; i < path.getLength(); ++i )
                bounds.extend( path.getAt(i) );
        }

        //  Fit these bounds to the map
        MapCtrlMapMgr._mainMap.fitBounds( bounds );
    }    
}
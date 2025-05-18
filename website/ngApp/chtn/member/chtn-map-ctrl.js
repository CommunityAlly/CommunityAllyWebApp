var Ally;
(function (Ally) {
    class WelcomeTip {
    }
    /**
     * The controller for the page that shows useful info on a map
     */
    class ChtnMapController {
        /**
         * The constructor for the class
         */
        constructor($scope, $timeout, $http, siteInfo, appCacheService) {
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.editingTip = new WelcomeTip();
            this.hoaHomes = [];
            this.tips = [];
            this.isLoading = false;
            this.isMovingHomes = false;
            this.shouldListHomes = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            // If we know our group's position, let's tighten the 
            let autocompleteOptions = undefined;
            if (this.siteInfo.privateSiteInfo.googleGpsPosition) {
                const TwentyFiveMilesInMeters = 40234;
                const circle = new google.maps.Circle({
                    center: this.siteInfo.privateSiteInfo.googleGpsPosition,
                    radius: TwentyFiveMilesInMeters
                });
                autocompleteOptions = {
                    bounds: circle.getBounds()
                };
            }
            const addressInput = document.getElementById("edit-location-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            google.maps.event.addListener(this.addressAutocomplete, 'place_changed', () => {
                const place = this.addressAutocomplete.getPlace();
                this.editingTip.address = place.formatted_address;
            });
            this.shouldListHomes = AppConfig.appShortName === "hoa" || (AppConfig.appShortName === NeighborhoodAppConfig.appShortName && this.siteInfo.privateSiteInfo.shouldUseFamiliarNeighborUi);
            this.retrieveHoaHomes();
            //this.$timeout( () => this.getWalkScore(), 1000 );
            MapCtrlMapMgr.Init(this.siteInfo, this.$scope, this);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the page
        ///////////////////////////////////////////////////////////////////////////////////////////////
        refresh() {
            this.isLoading = true;
            this.$http.get("/api/WelcomeTip").then((httpResponse) => {
                this.tips = httpResponse.data;
                this.populateAllMarkers();
                this.isLoading = false;
            });
        }
        populateAllMarkers() {
            MapCtrlMapMgr.ClearAllMarkers();
            if (AppConfig.appShortName === "condo")
                MapCtrlMapMgr.AddMarker(MapCtrlMapMgr._homeGpsPos.lat(), MapCtrlMapMgr._homeGpsPos.lng(), "Home", MapCtrlMapMgr.MarkerNumber_Home, ChtnMapController.HomeMarkerUnitId);
            if (!this.isMovingHomes) {
                for (let locationIndex = 0; locationIndex < this.tips.length; ++locationIndex) {
                    const curLocation = this.tips[locationIndex];
                    if (curLocation.gpsPos === null)
                        continue;
                    curLocation.markerIndex = MapCtrlMapMgr.AddMarker(curLocation.gpsPos.lat, curLocation.gpsPos.lon, curLocation.name, curLocation.markerNumber, null);
                }
            }
            // Add HOA homes
            if (this.hoaHomes && this.hoaHomes.length > 0 && this.shouldListHomes) {
                _.each(this.hoaHomes, (home) => {
                    if (home.fullAddress && home.fullAddress.gpsPos) {
                        let markerIcon = MapCtrlMapMgr.MarkerNumber_Home;
                        let markerText = home.name;
                        if (_.any(this.siteInfo.userInfo.usersUnits, u => u.unitId === home.unitId)) {
                            markerIcon = MapCtrlMapMgr.MarkerNumber_MyHome;
                            markerText = "Your home: " + markerText;
                        }
                        MapCtrlMapMgr.AddMarker(home.fullAddress.gpsPos.lat, home.fullAddress.gpsPos.lon, markerText, markerIcon, home.unitId);
                    }
                });
            }
            MapCtrlMapMgr.OnMarkersReady();
            if (this.isMovingHomes) {
                for (let i = 0; i < MapCtrlMapMgr._markers.length; ++i)
                    MapCtrlMapMgr.SetMarkerDraggable(i, true);
            }
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to edit a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onEditTip(tip) {
            this.editingTip = jQuery.extend({}, tip);
            window.scrollTo(0, document.body.scrollHeight);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to move a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onMoveMarker(tip) {
            MapCtrlMapMgr.SetMarkerDraggable(tip.markerIndex, true);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to delete a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onDeleteTip(tip) {
            if (!confirm('Are you sure you want to delete this item?'))
                return;
            this.isLoading = true;
            this.$http.delete("/api/WelcomeTip/" + tip.itemId).then(() => {
                this.isLoading = false;
                this.refresh();
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to add a new tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onSaveTip() {
            if (this.editingTip === null)
                return;
            //$( "#new-item-form" ).validate();
            //if ( !$( "#new-item-form" ).valid() )
            //    return;
            const onSave = () => {
                this.isLoading = false;
                this.editingTip = new WelcomeTip();
                this.refresh();
            };
            const onFailure = (response) => {
                this.isLoading = false;
                alert("Failed to save item: " + response.data.exceptionMessage);
            };
            this.isLoading = true;
            // If we're editing an existing item
            if (this.editingTip.itemId)
                this.$http.put("/api/WelcomeTip", this.editingTip).then(onSave, onFailure);
            // Otherwise create a new one
            else
                this.$http.post("/api/WelcomeTip", this.editingTip).then(onSave, onFailure);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Used by the ng-repeats to filter locations vs tips
        ///////////////////////////////////////////////////////////////////////////////////////////////
        isLocationTip(tip) {
            return tip.gpsPos !== null;
        }
        isNotLocationTip(tip) {
            return tip.gpsPos === null;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the URL to the image for a specific marker
        ///////////////////////////////////////////////////////////////////////////////////////////////
        getMarkerIconUrl(markerNumber) {
            const MarkerNumber_Home = -2;
            const MarkerNumber_Hospital = -3;
            const MarkerNumber_PostOffice = -4;
            let retPath = "/assets/images/MapMarkers/";
            if (markerNumber >= 1 && markerNumber <= 10)
                retPath += "green_" + markerNumber;
            else if (markerNumber === MarkerNumber_Home)
                retPath += "MapMarker_Home";
            else if (markerNumber === MarkerNumber_Hospital)
                retPath += "MapMarker_Hospital";
            else if (markerNumber === MarkerNumber_PostOffice)
                retPath += "MapMarker_PostOffice";
            else
                retPath += "green_blank";
            retPath += ".png";
            return retPath;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Move a marker's position
        ///////////////////////////////////////////////////////////////////////////////////////////////
        updateItemGpsLocation(marker, lat, lon) {
            const markerIndex = marker.markerIndex;
            let updateInfo;
            let putUri;
            if (this.isMovingHomes) {
                const unitId = marker.unitId;
                if (unitId) {
                    let fullAddressId;
                    // If the user moved the home marker, update the group address
                    if (unitId === ChtnMapController.HomeMarkerUnitId)
                        fullAddressId = this.siteInfo.privateSiteInfo.groupAddress.addressId;
                    else {
                        const home = this.hoaHomes.find(h => h.unitId === unitId);
                        if (home)
                            fullAddressId = home.addressId;
                    }
                    if (fullAddressId) {
                        putUri = "/api/WelcomeTip/UpdateHomeGpsLocation";
                        updateInfo = {
                            itemId: fullAddressId,
                            newLat: lat,
                            newLon: lon
                        };
                    }
                }
            }
            else {
                const tip = _.find(this.tips, function (t) { return t.markerIndex === markerIndex; });
                if (tip) {
                    putUri = "/api/WelcomeTip/UpdateGpsLocation";
                    updateInfo = {
                        itemId: tip.itemId,
                        newLat: lat,
                        newLon: lon
                    };
                }
            }
            if (!putUri)
                return;
            this.isLoading = true;
            this.$http.put(putUri, updateInfo).then(() => {
                this.isLoading = false;
            });
        }
        /**
         * Set the walkscore info
         */
        getWalkScore() {
            const handleWalkScoreResult = (httpResponse) => {
                if (!httpResponse || !httpResponse.data || httpResponse.data === "Error") {
                    $("#WalkScorePanel").html("Failed to load Walk Score.");
                    $("#WalkScorePanel").hide();
                }
                else
                    $("#WalkScorePanel").html(httpResponse.data);
            };
            this.$http.get("/api/WelcomeTip/GetWalkScore").then(handleWalkScoreResult, handleWalkScoreResult);
        }
        /**
        * Load the houses onto the map
        */
        retrieveHoaHomes() {
            this.$http.get("/api/BuildingResidents/FullUnits").then((httpResponse) => {
                if (httpResponse.data) {
                    if (AppConfig.appShortName === "condo") {
                        // Only show homes if our units have an address other than the condo's address
                        let nonMainAddresses = _.filter(httpResponse.data, u => u.addressId && !!u.fullAddress);
                        nonMainAddresses = _.filter(nonMainAddresses, u => u.fullAddress.oneLiner != this.siteInfo.privateSiteInfo.groupAddress.oneLiner);
                        if (nonMainAddresses.length > 0)
                            this.hoaHomes = httpResponse.data;
                    }
                    else if (this.shouldListHomes)
                        this.hoaHomes = httpResponse.data;
                }
                this.refresh();
            }, () => {
                this.refresh();
            });
        }
        enableMovingHomes(shouldEnable) {
            if (!shouldEnable) {
                window.location.reload();
                return;
            }
            this.isMovingHomes = shouldEnable;
            this.populateAllMarkers();
        }
    }
    ChtnMapController.$inject = ["$scope", "$timeout", "$http", "SiteInfo", "appCacheService"];
    ChtnMapController.HomeMarkerUnitId = -5;
    Ally.ChtnMapController = ChtnMapController;
})(Ally || (Ally = {}));
CA.angularApp.component("chtnMap", {
    templateUrl: "/ngApp/chtn/member/chtn-map.html",
    controller: Ally.ChtnMapController
});
class MapCtrlMapMgr {
    /**
    * Called when the DOM structure is ready
    */
    static Init(siteInfo, scope, mapCtrl) {
        MapCtrlMapMgr.ngScope = scope;
        MapCtrlMapMgr.mapCtrl = mapCtrl;
        if (typeof (google) === "undefined")
            return;
        // Store our home position
        MapCtrlMapMgr._homeGpsPos = siteInfo.privateSiteInfo.googleGpsPosition;
        MapCtrlMapMgr._groupGpsBounds = siteInfo.privateSiteInfo.gpsBounds;
        // Create the map centered at our home
        const mapOptions = {
            center: MapCtrlMapMgr._homeGpsPos,
            zoom: 25,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        MapCtrlMapMgr._mainMap = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
        // Add our home marker
        if (AppConfig.appShortName === "condo")
            MapCtrlMapMgr.AddMarker(MapCtrlMapMgr._homeGpsPos.lat(), MapCtrlMapMgr._homeGpsPos.lng(), "Home", MapCtrlMapMgr.MarkerNumber_Home, null);
        MapCtrlMapMgr.OnMapReady();
    }
    static OnMapReady() {
        MapCtrlMapMgr._isMapReady = true;
        if (MapCtrlMapMgr._areMarkersReady)
            MapCtrlMapMgr.OnMapAndMarkersReady();
    }
    static OnMarkersReady() {
        MapCtrlMapMgr._areMarkersReady = true;
        if (MapCtrlMapMgr._isMapReady)
            MapCtrlMapMgr.OnMapAndMarkersReady();
    }
    static OnMapAndMarkersReady() {
        MapCtrlMapMgr.ClearAllMarkers();
        for (let markerIndex = 0; markerIndex < MapCtrlMapMgr._tempMarkers.length; ++markerIndex) {
            const tempMarker = MapCtrlMapMgr._tempMarkers[markerIndex];
            let markerImageUrl = null;
            if (tempMarker.markerNumber >= 1 && tempMarker.markerNumber <= 10)
                markerImageUrl = "/assets/images/MapMarkers/green_" + tempMarker.markerNumber + ".png";
            else if (tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_Home)
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_Home.png";
            else if (tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_Hospital)
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_Hospital.png";
            else if (tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_PostOffice)
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_PostOffice.png";
            else if (tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_MyHome)
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_MyHome.png";
            else
                markerImageUrl = "/assets/images/MapMarkers/green_blank.png";
            const marker = new google.maps.Marker({
                position: new google.maps.LatLng(tempMarker.lat, tempMarker.lon),
                map: MapCtrlMapMgr._mainMap,
                animation: google.maps.Animation.DROP,
                title: tempMarker.name,
                icon: markerImageUrl
            });
            marker.markerIndex = markerIndex;
            google.maps.event.addListener(marker, 'dragend', function () {
                const gpsPos = this.getPosition();
                MapCtrlMapMgr.ngScope.$apply(() => {
                    MapCtrlMapMgr.mapCtrl.updateItemGpsLocation(this, gpsPos.lat(), gpsPos.lng());
                });
            });
            if (tempMarker.unitId) {
                marker.unitId = tempMarker.unitId;
                // If we're not moving home markers then add a click handler to navigate to the building residents page
                if (MapCtrlMapMgr.mapCtrl && !MapCtrlMapMgr.mapCtrl.isMovingHomes) {
                    marker.addListener('click', function (innerMarker) {
                        return function () {
                            MapCtrlMapMgr.mapCtrl.appCacheService.set("scrollToUnitId", innerMarker.unitId.toString());
                            window.location.hash = "#!/BuildingResidents";
                        };
                    }(marker));
                }
            }
            MapCtrlMapMgr._markers.push(marker);
        }
        // We've processed all of the temp markes so clear the array
        MapCtrlMapMgr._tempMarkers = [];
        if (MapCtrlMapMgr._groupGpsBounds) {
            const groupBoundsPath = Ally.MapUtil.gpsBoundsToGooglePoly(MapCtrlMapMgr._groupGpsBounds);
            const groupBoundsPolylineOptions = {
                paths: groupBoundsPath,
                map: MapCtrlMapMgr._mainMap,
                strokeColor: '#0000FF',
                strokeOpacity: 0.5,
                strokeWeight: 1,
                fillColor: '#0000FF',
                fillOpacity: 0.15,
                zIndex: -1
            };
            MapCtrlMapMgr._groupBoundsShape = new google.maps.Polygon(groupBoundsPolylineOptions);
        }
        MapCtrlMapMgr.ZoomMapToFitMarkers();
    }
    /**
    * Add a marker to the map
    */
    static ClearAllMarkers() {
        for (let i = 0; i < MapCtrlMapMgr._markers.length; i++)
            MapCtrlMapMgr._markers[i].setMap(null);
        MapCtrlMapMgr._markers = [];
    }
    /**
    * Make a marker draggable or not
    */
    static SetMarkerDraggable(markerIndex, isDraggable) {
        MapCtrlMapMgr._markers[markerIndex].setDraggable(isDraggable);
    }
    /**
    * Add a marker to the map and return the index of that new marker
    */
    static AddMarker(lat, lon, name, markerNumber, unitId) {
        MapCtrlMapMgr._tempMarkers.push({
            lat: lat,
            lon: lon,
            name: name,
            markerNumber: markerNumber,
            unitId: unitId
        });
        return MapCtrlMapMgr._tempMarkers.length - 1;
    }
    /**
    * Set the map zoom so all markers are visible
    */
    static ZoomMapToFitMarkers() {
        //  Create a new viewpoint bound
        const bounds = new google.maps.LatLngBounds();
        //  Go through each marker and make the bounds extend to fit it
        for (let markerIndex = 0; markerIndex < MapCtrlMapMgr._markers.length; ++markerIndex)
            bounds.extend(MapCtrlMapMgr._markers[markerIndex].getPosition());
        if (MapCtrlMapMgr._groupBoundsShape) {
            const path = MapCtrlMapMgr._groupBoundsShape.getPath();
            for (let i = 0; i < path.getLength(); ++i)
                bounds.extend(path.getAt(i));
        }
        //  Fit these bounds to the map
        MapCtrlMapMgr._mainMap.fitBounds(bounds);
    }
}
//onMapApiLoaded: function ()
//{
//    MapCtrlMapMgr.Init();
//},
/*
* The map displaying the area around the building
* @type {google.maps.Map}
*/
MapCtrlMapMgr._mainMap = null;
/*
* The position of our home building
* @type {google.maps.LatLng}
*/
MapCtrlMapMgr._homeGpsPos = null;
MapCtrlMapMgr._groupGpsBounds = null;
MapCtrlMapMgr._groupBoundsShape = null;
/*
* The array of markers on the map. We keep track in case the map wasn't created yet when
* AddMarker was called.
* @type {Array.<google.maps.Marker>}
*/
MapCtrlMapMgr._markers = [];
/**
* The marker number that indicates the home marker icon
* @type {Number}
* @const
*/
MapCtrlMapMgr.MarkerNumber_Home = -2;
/**
* The marker number that indicates the home marker icon for the user's home
* @type {Number}
* @const
*/
MapCtrlMapMgr.MarkerNumber_MyHome = -5;
/**
* The marker number that indicates the hospital marker icon
* @type {Number}
* @const
*/
MapCtrlMapMgr.MarkerNumber_Hospital = -3;
/**
* The marker number that indicates the post office marker icon
* @type {Number}
* @const
*/
MapCtrlMapMgr.MarkerNumber_PostOffice = -4;
MapCtrlMapMgr._isMapReady = false;
MapCtrlMapMgr._areMarkersReady = false;
MapCtrlMapMgr._tempMarkers = [];
MapCtrlMapMgr.ngScope = null;
MapCtrlMapMgr.mapCtrl = null;

var Ally;
(function (Ally) {
    /**
     * The controller for the admin-only page to view address research data
     */
    class ViewResearchController {
        /**
        * The constructor for the class
        */
        constructor($http) {
            this.$http = $http;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.mapCenter = { lat: 41.99114, lng: -87.690425 };
            // Initialize the UI
            this.refreshCells();
        }
        addLine(map, minLat, minLon, maxLat, maxLon) {
            var lineCoordinates = [
                { lat: minLat, lng: minLon },
                { lat: maxLat, lng: maxLon }
            ];
            var linePath = new google.maps.Polyline({
                path: lineCoordinates,
                geodesic: false,
                strokeColor: '#FF0000',
                strokeOpacity: 1.0,
                strokeWeight: 2
            });
            linePath.setMap(map);
        }
        onBuildingSelected(building) {
        }
        onCellSelected(cell) {
            cell.gpsBounds.mapShapeObject.setOptions({ fillOpacity: 0.1 });
            if (this.selectedCell) {
                this.selectedCell.gpsBounds.mapShapeObject.setOptions({ fillOpacity: 0.35 });
            }
            this.selectedCell = cell;
            _.each(this.selectedCell.streets, function (s) {
                if (s.minLat != 0)
                    this.addLine(cell.gpsBounds.mapShapeObject.map, s.minLat, s.minLon, s.maxLat, s.maxLon);
            });
        }
        // Get the addresses that are missing bounding polys
        refreshCells() {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/ResearchMap").then((response) => {
                innerThis.isLoading = false;
                innerThis.cells = response.data;
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
                innerThis.isLoading = true;
                innerThis.$http.get("/api/ResearchMap/Buildings").then(function (httpResponse) {
                    innerThis.isLoading = false;
                    innerThis.buildings = httpResponse.data;
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
                    innerThis.buildingPoints = _.map(innerThis.buildings, function (b) {
                        var result = b.addressPos;
                        result.ownerBuilding = b;
                        result.onClick = function () {
                            //this.onBuildingSelected( result.ownerBuilding );
                        };
                        return result;
                    });
                });
            }, function (httpResponse) {
                innerThis.isLoading = false;
                alert("Failed to retrieve cells: " + httpResponse.data.exceptionMessage);
            });
        }
        // Occurs when the user clicks an address
        onAddressSelected(address) {
            //if ( address.gpsPos )
            //    this.mapInstance.setCenter( { lat: address.gpsPos.lat, lng: address.gpsPos.lon } );
            this.selectedAddress = address;
            // Ensure we have a valid array to work with
            if (!this.selectedAddress.gpsBounds)
                this.selectedAddress.gpsBounds = { vertices: [] };
            if (!this.selectedAddress.gpsBounds.vertices)
                this.selectedAddress.gpsBounds.vertices = [];
            // If the array is empty then create a default rectangle
            if (this.selectedAddress.gpsBounds.vertices.length == 0 && address.gpsPos) {
                var southWest = new google.maps.LatLng(address.gpsPos.lat, address.gpsPos.lon);
                var northEast = new google.maps.LatLng(address.gpsPos.lat + 0.001, address.gpsPos.lon + 0.001);
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
    }
    ViewResearchController.$inject = ["$http"];
    Ally.ViewResearchController = ViewResearchController;
})(Ally || (Ally = {}));
CA.angularApp.component("viewResearch", {
    templateUrl: "/ngApp/admin/view-research.html",
    controller: Ally.ViewResearchController
});

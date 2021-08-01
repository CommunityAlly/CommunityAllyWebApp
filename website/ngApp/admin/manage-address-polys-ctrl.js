var Ally;
(function (Ally) {
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    var ManageAddressPolysController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ManageAddressPolysController($http, $q) {
            this.$http = $http;
            this.$q = $q;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageAddressPolysController.prototype.$onInit = function () {
            // Initialize the UI
            this.refreshAddresses();
        };
        ManageAddressPolysController.prototype.getPolyInfo = function (url, polyType) {
            var _this = this;
            var deferred = this.$q.defer();
            this.isLoading = true;
            this.$http.get(url).then(function (httpResponse) {
                _this.isLoading = false;
                var addresses = httpResponse.data;
                // Mark address as opposed to group bounds
                _.each(addresses, function (a) {
                    a.polyType = polyType;
                    if (polyType == "Group")
                        a.oneLiner = a.shortName + ", " + a.appName;
                });
                $.merge(_this.addresses, addresses);
                deferred.resolve(_this.addresses);
            }, function (httpResponse) {
                _this.isLoading = false;
                var errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to retrieve addresses: " + errorMessage);
                deferred.reject();
            });
            return deferred.promise;
        };
        ManageAddressPolysController.prototype.getGroupBoundPolys = function () {
            return this.getPolyInfo("/api/AdminMap/GetGroupBounds?filter=" + this.filterAddresses, "Group");
        };
        ManageAddressPolysController.prototype.getAddressPolys = function () {
            return this.getPolyInfo("/api/AdminMap/GetAll?filter=" + this.filterAddresses, "Address");
        };
        // Get the addresses that are missing bounding polys
        ManageAddressPolysController.prototype.refreshAddresses = function () {
            var _this = this;
            this.isLoading = true;
            this.addresses = [];
            this.getAddressPolys().then(function () { return _this.getGroupBoundPolys(); }).then(function (addresses) {
                _this.addressPoints = [];
                _.each(addresses, function (a) {
                    if (a.gpsPos) {
                        // The GoogleMapPoly directive uses the fullAddress for the marker tooltip
                        a.gpsPos.fullAddress = a.oneLiner;
                        this.addressPoints.push(a.gpsPos);
                    }
                });
            });
        };
        ManageAddressPolysController.prototype.onSavePoly = function () {
            var _this = this;
            this.isLoading = true;
            var serverVerts = { vertices: this.selectedAddress.gpsBounds.vertices };
            var url = this.selectedAddress.polyType === "Address" ? ("/api/AdminMap/UpdateAddress/" + this.selectedAddress.addressId) : ("/api/AdminMap/UpdateGroup/" + this.selectedAddress.groupId);
            this.$http.put(url, serverVerts).then(function () {
                _this.isLoading = false;
            }, function () {
                _this.isLoading = false;
            });
        };
        // Occurs when the user clicks an address
        ManageAddressPolysController.prototype.onAddressSelected = function (address) {
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
        };
        ManageAddressPolysController.$inject = ["$http", "$q"];
        return ManageAddressPolysController;
    }());
    Ally.ManageAddressPolysController = ManageAddressPolysController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageAddressPolys", {
    templateUrl: "/ngApp/admin/manage-address-polys.html",
    controller: Ally.ManageAddressPolysController
});

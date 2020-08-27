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
            var deferred = this.$q.defer();
            this.isLoading = true;
            var innerThis = this;
            this.$http.get(url).then(function (httpResponse) {
                innerThis.isLoading = false;
                var addresses = httpResponse.data;
                // Mark address as opposed to group bounds
                _.each(addresses, function (a) {
                    a.polyType = polyType;
                    if (polyType == "Group")
                        a.oneLiner = a.shortName + ", " + a.appName;
                });
                $.merge(innerThis.addresses, addresses);
                deferred.resolve(innerThis.addresses);
            }, function (httpResponse) {
                this.isLoading = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
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
            this.isLoading = true;
            this.addresses = [];
            var innerThis = this;
            this.getAddressPolys().then(function () { return innerThis.getGroupBoundPolys(); }).then(function (addresses) {
                innerThis.addressPoints = [];
                _.each(addresses, function (a) {
                    if (a.gpsPos) {
                        // The GoogleMapPoly directive uses the fullAddress for the marker tooltip
                        a.gpsPos.fullAddress = a.oneLiner;
                        innerThis.addressPoints.push(a.gpsPos);
                    }
                });
            });
        };
        ManageAddressPolysController.prototype.onSavePoly = function () {
            this.isLoading = true;
            var serverVerts = { vertices: this.selectedAddress.gpsBounds.vertices };
            var url = this.selectedAddress.polyType === "Address" ? ("/api/AdminMap/UpdateAddress/" + this.selectedAddress.addressId) : ("/api/AdminMap/UpdateGroup/" + this.selectedAddress.groupId);
            var innerThis = this;
            this.$http.put(url, serverVerts).then(function () {
                innerThis.isLoading = false;
            }, function () {
                innerThis.isLoading = false;
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

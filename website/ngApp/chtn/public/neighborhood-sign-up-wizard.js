/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    var TempNeighborhoodSignUpInfo = /** @class */ (function () {
        function TempNeighborhoodSignUpInfo() {
            this.fullName = "";
            this.email = "";
            this.address = "";
            this.neighborhoodName = "";
            this.notes = "";
        }
        return TempNeighborhoodSignUpInfo;
    }());
    /**
     * The controller for the HOA Ally sign-up page
     */
    var NeighborhoodSignUpWizardController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function NeighborhoodSignUpWizardController($scope, $http, $timeout, WizardHandler) {
            this.$scope = $scope;
            this.$http = $http;
            this.$timeout = $timeout;
            this.WizardHandler = WizardHandler;
            this.placeWasSelected = false;
            this.shouldCheckAddress = false;
            this.isLoading = false;
            this.map = null;
            this.isLoadingMap = false;
            this.hideWizard = false;
            this.hoaPoly = { vertices: [] };
            this.showMap = false;
            this.tempSignUpInfo = new TempNeighborhoodSignUpInfo();
            // The default sign-up info object
            this.signUpInfo = new Ally.HoaSignUpInfo();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        NeighborhoodSignUpWizardController.prototype.$onInit = function () {
            var _this = this;
            this.$scope.$on('wizard:stepChanged', function (event, args) {
                if (args.index === 1)
                    _this.$timeout(function () { return _this.showMap = true; }, 50);
                else
                    _this.showMap = false;
            });
            setTimeout(function () {
                var addressInput = document.getElementById("signUpAddress");
                if (addressInput)
                    new google.maps.places.Autocomplete(addressInput);
            }, 500);
        };
        /**
         * Submit the
         */
        NeighborhoodSignUpWizardController.prototype.onSubmitTempInfo = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/SignUpWizard/TempNeighborhood", this.tempSignUpInfo).then(function () {
                _this.isLoading = false;
                _this.submitTempResult = "Thank you for your submission. We'll be in touch shortly.";
            }, function (response) {
                _this.isLoading = false;
                _this.submitTempResult = "Submission failed: " + response.data.exceptionMessage + ". Feel free to refresh the page to try again or use the contact form at the bottom of the Community Ally home page.";
            });
        };
        /**
         * Center the Google map on a polygon
         */
        NeighborhoodSignUpWizardController.prototype.centerMap = function (geometry) {
            // If the place has a geometry, then present it on a map.
            if (geometry.viewport) {
                this.map.fitBounds(geometry.viewport);
            }
            else {
                this.map.setCenter(geometry.location);
                this.map.setZoom(17); // Why 17? Because it looks good.
            }
            this.mapMarker.setPosition(geometry.location);
            this.mapMarker.setVisible(true);
        };
        /**
         * Perform initialization to create the map and hook up address autocomplete
         */
        NeighborhoodSignUpWizardController.prototype.initMapStep = function () {
            var _this = this;
            if (typeof (window.analytics) !== "undefined")
                window.analytics.track("condoSignUpStarted");
            this.showMap = true;
            var addressInput = document.getElementById("association-address-text-box");
            if (addressInput) {
                this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput);
                this.addressAutocomplete.bindTo('bounds', this.map);
            }
            this.mapMarker = new google.maps.Marker({
                map: this.map,
                position: null,
                anchorPoint: new google.maps.Point(41.969638, -87.657423),
                icon: "/assets/images/MapMarkers/MapMarker_Home.png"
            });
            // Occurs when the user selects a Google suggested address
            if (this.addressAutocomplete) {
                var onPlaceChanged_1 = function () {
                    _this.setPlaceWasSelected();
                    //infowindow.close();
                    _this.mapMarker.setVisible(false);
                    var place = _this.addressAutocomplete.getPlace();
                    var readableAddress = place.formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    _this.signUpInfo.streetAddress = readableAddress;
                    if (!place.geometry)
                        return;
                    _this.setEditPolyForAddress(place.geometry.location);
                    _this.centerMap(place.geometry);
                };
                this.addressAutocomplete.addListener('place_changed', function () {
                    _this.$scope.$apply(onPlaceChanged_1);
                });
            }
        };
        NeighborhoodSignUpWizardController.prototype.onMapEditorReady = function (mapInstance) {
            this.map = mapInstance;
            this.initMapStep();
        };
        /**
         * Refresh the map to center typed in address
         */
        NeighborhoodSignUpWizardController.prototype.checkAddress = function () {
            if (this.placeWasSelected || !this.shouldCheckAddress)
                return;
            this.shouldCheckAddress = false;
            this.refreshMapForAddress();
        };
        /**
         * Occurs when the user selects an address from the Google suggestions
         */
        NeighborhoodSignUpWizardController.prototype.setPlaceWasSelected = function () {
            var _this = this;
            this.placeWasSelected = true;
            this.shouldCheckAddress = false;
            // Clear the flag in case the user types in a new address
            setTimeout(function () {
                _this.placeWasSelected = true;
            }, 500);
        };
        /**
         * Refresh the map edit box when a place is geocoded
         */
        NeighborhoodSignUpWizardController.prototype.setEditPolyForAddress = function (homePos) {
            var OffsetLat = 0.001;
            var OffsetLon = 0.0014;
            this.hoaPoly = {
                vertices: [
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() + OffsetLon },
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() + OffsetLon }
                ]
            };
        };
        /**
         * Refresh the map to center typed in address
         */
        NeighborhoodSignUpWizardController.prototype.refreshMapForAddress = function () {
            var _this = this;
            this.isLoadingMap = true;
            HtmlUtil.geocodeAddress(this.signUpInfo.streetAddress, function (results, status) {
                // Need to run this in $apply since it's invoked outside of Angular's digest cycle
                _this.$scope.$apply(function () {
                    _this.isLoadingMap = false;
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    var readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    _this.signUpInfo.streetAddress = readableAddress;
                    if (!results[0].geometry)
                        return;
                    _this.setEditPolyForAddress(results[0].geometry.location);
                    _this.centerMap(results[0].geometry);
                });
            });
        };
        /**
         * Called when the user press the button to complete the sign-up process
         */
        NeighborhoodSignUpWizardController.prototype.onFinishedWizard = function () {
            var _this = this;
            this.isLoading = true;
            this.signUpInfo.boundsGpsVertices = this.hoaPoly.vertices;
            this.$http.post("/api/SignUpWizard/Hoa", this.signUpInfo).then(function (httpResponse) {
                _this.isLoading = false;
                var signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    _this.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                }
                // Otherwise create succeeded
                else {
                    if (typeof (window.analytics) !== "undefined")
                        window.analytics.track("condoSignUpComplete");
                    // Log this as a conversion
                    if (typeof (window.goog_report_conversion) !== "undefined")
                        window.goog_report_conversion();
                    // Or if the user created an active signUpResult
                    if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                        window.location.href = signUpResult.createUrl;
                    }
                    // Otherwise the user needs to confirm sign-up via email
                    else {
                        _this.hideWizard = true;
                        _this.resultMessage = "Great work! We just sent you an email with instructions on how access your new site.";
                    }
                }
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to complete sign-up: " + httpResponse.data.exceptionMessage);
            });
        };
        NeighborhoodSignUpWizardController.$inject = ["$scope", "$http", "$timeout", "WizardHandler"];
        return NeighborhoodSignUpWizardController;
    }());
    Ally.NeighborhoodSignUpWizardController = NeighborhoodSignUpWizardController;
})(Ally || (Ally = {}));
CA.angularApp.component("neighborhoodSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/neighborhood-sign-up-wizard.html",
    controller: Ally.NeighborhoodSignUpWizardController
});

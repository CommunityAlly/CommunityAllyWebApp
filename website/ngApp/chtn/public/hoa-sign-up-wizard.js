/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    var HoaSignerUpInfo = /** @class */ (function () {
        function HoaSignerUpInfo() {
            this.boardPositionValue = 1;
        }
        return HoaSignerUpInfo;
    }());
    Ally.HoaSignerUpInfo = HoaSignerUpInfo;
    var HoaSignUpInfo = /** @class */ (function () {
        function HoaSignUpInfo() {
            this.name = "";
            this.streetAddress = "";
            this.isResident = true;
            this.signerUpInfo = new HoaSignerUpInfo();
            this.referralSource = "";
            this.recaptchaKey = "";
        }
        return HoaSignUpInfo;
    }());
    Ally.HoaSignUpInfo = HoaSignUpInfo;
    /**
     * The controller for the HOA Ally sign-up page
     */
    var HoaSignUpWizardController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function HoaSignUpWizardController($scope, $http, $timeout, WizardHandler) {
            this.$scope = $scope;
            this.$http = $http;
            this.$timeout = $timeout;
            this.WizardHandler = WizardHandler;
            this.placeWasSelected = false;
            this.shouldCheckAddress = false;
            this.isLoading = false;
            this.shouldShowCondoMessage = false;
            this.map = null;
            this.isLoadingMap = false;
            this.hideWizard = false;
            this.hoaPoly = { vertices: [] };
            this.showMap = false;
            this.didSignUpForHoaAlert = false;
            // The default sign-up info object
            this.signUpInfo = new Ally.HoaSignUpInfo();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        HoaSignUpWizardController.prototype.$onInit = function () {
            var _this = this;
            this.signUpInfo.referralSource = HtmlUtil.GetQueryStringParameter("utm_sourcecapterra");
            // Normalize anything invalid to null
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.referralSource))
                this.signUpInfo.referralSource = null;
            this.$scope.$on('wizard:stepChanged', function (event, args) {
                if (args.index === 1)
                    _this.$timeout(function () { return _this.showMap = true; }, 50);
                else if (args.index === 2)
                    _this.$timeout(function () { return grecaptcha.render("recaptcha-check-elem"); }, 50);
                else
                    _this.showMap = false;
            });
        };
        /**
         * Occurs as the user presses keys in the HOA name field
         */
        HoaSignUpWizardController.prototype.onHoaNameChanged = function () {
            if (!this.signUpInfo || !this.signUpInfo.name) {
                this.shouldShowCondoMessage = false;
                return;
            }
            var shouldShowCondoMessage = this.signUpInfo.name.toLowerCase().indexOf("condo") !== -1;
            if (shouldShowCondoMessage && !this.shouldShowCondoMessage)
                $("#suggestCondoMessageLabel").css("font-size", "1.3em").css("margin", "25px auto").addClass("alert alert-warning").fadeIn(200).fadeOut(200).fadeIn(200).fadeOut(200).fadeIn(200).fadeIn(200).fadeOut(200).fadeIn(200);
            this.shouldShowCondoMessage = shouldShowCondoMessage;
        };
        /**
         * Center the Google map on a polygon
         */
        HoaSignUpWizardController.prototype.centerMap = function (geometry) {
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
        HoaSignUpWizardController.prototype.initMapStep = function () {
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
                var innerThis = this;
                var onPlaceChanged = function () {
                    innerThis.setPlaceWasSelected();
                    //infowindow.close();
                    innerThis.mapMarker.setVisible(false);
                    var place = innerThis.addressAutocomplete.getPlace();
                    var readableAddress = place.formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    innerThis.signUpInfo.streetAddress = readableAddress;
                    if (!place.geometry)
                        return;
                    innerThis.setEditPolyForAddress(place.geometry.location);
                    innerThis.centerMap(place.geometry);
                };
                this.addressAutocomplete.addListener('place_changed', function () {
                    innerThis.$scope.$apply(onPlaceChanged);
                });
            }
        };
        HoaSignUpWizardController.prototype.onMapEditorReady = function (mapInstance) {
            this.map = mapInstance;
            this.initMapStep();
        };
        /**
         * Refresh the map to center typed in address
         */
        HoaSignUpWizardController.prototype.checkAddress = function () {
            if (this.placeWasSelected || !this.shouldCheckAddress)
                return;
            this.shouldCheckAddress = false;
            this.refreshMapForAddress();
        };
        /**
         * Occurs when the user selects an address from the Google suggestions
         */
        HoaSignUpWizardController.prototype.setPlaceWasSelected = function () {
            this.placeWasSelected = true;
            this.shouldCheckAddress = false;
            // Clear the flag in case the user types in a new address
            var innerThis = this;
            setTimeout(function () {
                innerThis.placeWasSelected = true;
            }, 500);
        };
        /**
         * Refresh the map edit box when a place is geocoded
         */
        HoaSignUpWizardController.prototype.setEditPolyForAddress = function (homePos) {
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
        HoaSignUpWizardController.prototype.refreshMapForAddress = function () {
            this.isLoadingMap = true;
            var innerThis = this;
            HtmlUtil.geocodeAddress(this.signUpInfo.streetAddress, function (results, status) {
                innerThis.$scope.$apply(function () {
                    innerThis.isLoadingMap = false;
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    var readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    innerThis.signUpInfo.streetAddress = readableAddress;
                    if (!results[0].geometry)
                        return;
                    innerThis.setEditPolyForAddress(results[0].geometry.location);
                    innerThis.centerMap(results[0].geometry);
                });
            });
        };
        /**
         * Called when the user press the button to complete the sign-up process
         */
        HoaSignUpWizardController.prototype.onFinishedWizard = function () {
            var _this = this;
            this.signUpInfo.recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.recaptchaKey)) {
                alert("Please complete the reCAPTCHA field");
                return;
            }
            this.isLoading = true;
            this.signUpInfo.boundsGpsVertices = this.hoaPoly.vertices;
            this.$http.post("/api/SignUpWizard/Hoa", this.signUpInfo).then(function (httpResponse) {
                _this.isLoading = false;
                var signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    _this.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                    grecaptcha.reset();
                }
                // Otherwise create succeeded
                else {
                    if (typeof (window.analytics) !== "undefined")
                        window.analytics.track("condoSignUpComplete");
                    // Log this as a conversion
                    if (typeof (window.goog_report_conversion) !== "undefined")
                        window.goog_report_conversion();
                    if (_this.signUpInfo.referralSource && typeof (window.capterra_trackingListener_v2) !== "undefined")
                        window.capterra_trackingListener_v2();
                    // Or if the user created an active signUpResult
                    if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                        // Delay just a bit to let the Capterra tracking log, if needed
                        window.setTimeout(function () { return window.location.href = signUpResult.createUrl; }, 50);
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
                grecaptcha.reset();
            });
        };
        /**
         * Called when the user press the button to submit their email address
         */
        HoaSignUpWizardController.prototype.submitEmailForHoaNotify = function () {
            var _this = this;
            if (HtmlUtil.isNullOrWhitespace(this.hoaAlertEmail)) {
                alert("Please enter a valid email address");
                return;
            }
            this.isLoading = true;
            this.$http.get("/api/PublicEmail/SignUpForHoaAllyAlert?email=" + encodeURIComponent(this.hoaAlertEmail) + "&numHomes=" + encodeURIComponent(this.hoaAlertNumHomes)).then(function (httpResponse) {
                _this.isLoading = false;
                _this.didSignUpForHoaAlert = true;
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to submit: " + httpResponse.data.exceptionMessage);
            });
        };
        HoaSignUpWizardController.$inject = ["$scope", "$http", "$timeout", "WizardHandler"];
        return HoaSignUpWizardController;
    }());
    Ally.HoaSignUpWizardController = HoaSignUpWizardController;
})(Ally || (Ally = {}));
CA.angularApp.component("hoaSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/hoa-sign-up-wizard.html",
    controller: Ally.HoaSignUpWizardController
});

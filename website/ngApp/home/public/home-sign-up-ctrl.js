/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/googlemaps/google.maps.d.ts" />
var Ally;
(function (Ally) {
    var SignerUpInfo = /** @class */ (function () {
        function SignerUpInfo() {
        }
        return SignerUpInfo;
    }());
    var HomeInfo = /** @class */ (function () {
        function HomeInfo() {
        }
        return HomeInfo;
    }());
    Ally.HomeInfo = HomeInfo;
    var SignUpInfo = /** @class */ (function () {
        function SignUpInfo() {
            this.signerUpInfo = new SignerUpInfo();
            this.streetAddress = "";
            this.homeInfo = new HomeInfo();
        }
        return SignUpInfo;
    }());
    var LotSizeType_Acres = "Acres";
    var LotSizeType_SquareFeet = "SquareFeet";
    var SquareFeetPerAcre = 43560;
    /**
     * The controller for the Home Ally sign-up page
     */
    var HomeSignUpController = /** @class */ (function () {
        /**
         * The constructor for the class
         * @param $http The HTTP service object
         * @param $scope The Angular scope object
         */
        function HomeSignUpController($http, $scope, WizardHandler) {
            this.$http = $http;
            this.$scope = $scope;
            this.WizardHandler = WizardHandler;
            this.lotSizeUnit = LotSizeType_Acres;
            this.lotSquareUnits = 0;
            this.signUpInfo = new SignUpInfo();
            this.isLoadingHomeInfo = false;
            this.didLoadHomeInfo = false;
            this.isLoading = false;
            this.hideWizard = false;
            this.hasAlreadyCheckedForHomeInfo = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        HomeSignUpController.prototype.$onInit = function () {
            var _this = this;
            // Listen for step changes
            this.$scope.$on('wizard:stepChanged', function (event, args) {
                // If we're now on the second step
                if (args.index === 1)
                    _this.retrieveHomeInfoForAddress();
            });
            // The controller is ready, but let's wait a bit for the page to be ready
            var innerThis = this;
            setTimeout(function () { _this.initMap(); }, 300);
        };
        /**
         * Retrieve information about the address provided from Zillow
         */
        HomeSignUpController.prototype.retrieveHomeInfoForAddress = function () {
            var _this = this;
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.streetAddress) || this.hasAlreadyCheckedForHomeInfo)
                return;
            this.hasAlreadyCheckedForHomeInfo = true;
            var getUri = "/api/HomeSignUp/HomeInfo?streetAddress=" + encodeURIComponent(this.signUpInfo.streetAddress);
            this.$http.get(getUri, { cache: true }).then(function (response) {
                if (!response.data)
                    return;
                _this.signUpInfo.homeInfo = response.data;
                _this.didLoadHomeInfo = true;
                _this.processLotSizeHint(_this.signUpInfo.homeInfo.lotSquareFeet);
            });
        };
        /**
         * Convert a lot size hint from Zillow into a UI friendly value
         * @param lotSquareFeet
         */
        HomeSignUpController.prototype.processLotSizeHint = function (lotSquareFeet) {
            if (!lotSquareFeet)
                return;
            // Choose a square feet that makes sense
            if (lotSquareFeet > SquareFeetPerAcre) {
                this.lotSizeUnit = LotSizeType_Acres;
                this.lotSquareUnits = lotSquareFeet / SquareFeetPerAcre;
                // Round to nearest .25
                this.lotSquareUnits = parseFloat((Math.round(this.lotSquareUnits * 4) / 4).toFixed(2));
            }
            else {
                this.lotSizeUnit = LotSizeType_SquareFeet;
                this.lotSquareUnits = lotSquareFeet;
            }
        };
        /**
         * Initialize the Google map on the page
         */
        HomeSignUpController.prototype.initMap = function () {
            var mapDiv = document.getElementById("address-map");
            this.map = new google.maps.Map(mapDiv, {
                center: { lat: 41.869638, lng: -87.657423 },
                zoom: 9
            });
            this.mapMarker = new google.maps.Marker({
                map: this.map,
                anchorPoint: new google.maps.Point(41.969638, -87.657423),
                icon: "/assets/images/MapMarkers/MapMarker_Home.png",
                position: null
            });
            var addressInput = document.getElementById("home-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput);
            this.addressAutocomplete.bindTo('bounds', this.map);
            // Occurs when the user selects a Google suggested address
            var innerThis = this;
            this.addressAutocomplete.addListener('place_changed', function () {
                //innerThis.setPlaceWasSelected();
                //infowindow.close();
                innerThis.mapMarker.setVisible(false);
                var place = innerThis.addressAutocomplete.getPlace();
                var readableAddress = place.formatted_address;
                // Remove the trailing country if it's USA
                if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                    readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                innerThis.signUpInfo.streetAddress = readableAddress;
                innerThis.selectedSplitAddress = Ally.MapUtil.parseAddressComponents(place.address_components);
                //innerThis.prepopulateHomeInfo();
                if (place.geometry)
                    innerThis.centerMap(place.geometry);
                $("#association-name-text-box").focus();
            });
        };
        /**
         * Occurs when the user hits enter in the address box
         */
        HomeSignUpController.prototype.goNextStep = function () {
            this.WizardHandler.wizard().next();
        };
        /**
         * Called when the user completes the wizard
         */
        HomeSignUpController.prototype.onFinishedWizard = function () {
            //if( this.lotSizeUnit === LotSizeType_Acres )
            //    this.signUpInfo.homeInfo.lotSquareFeet = this.lotSquareUnits * SquareFeetPerAcre;
            //else
            //    this.signUpInfo.homeInfo.lotSquareFeet = this.lotSquareUnits;
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/HomeSignUp", this.signUpInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                var signUpResult = httpResponse.data;
                // If we successfully created the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    if (signUpResult.stepIndex >= 0)
                        innerThis.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                }
                // Or if the user created an active signUpResult
                else if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                    window.location.href = signUpResult.createUrl;
                }
                // Otherwise the user needs to confirm sign-up via email
                else {
                    innerThis.hideWizard = true;
                    innerThis.resultMessage = "Great work! We just sent you an email with instructions on how access your new site.";
                }
            }, function (httpResponse) {
                innerThis.isLoading = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to complete sign-up: " + errorMessage);
            });
        };
        /**
         * Called when the user types in a new street address
         */
        HomeSignUpController.prototype.onHomeAddressChanged = function () {
            var innerThis = this;
            HtmlUtil.geocodeAddress(this.signUpInfo.streetAddress, function (results, status) {
                innerThis.$scope.$apply(function () {
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    var readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    innerThis.signUpInfo.streetAddress = readableAddress;
                    innerThis.centerMap(results[0].geometry);
                });
            });
        };
        /**
         * Center the map on a position
         * @param geometry The geometry on which to center
         */
        HomeSignUpController.prototype.centerMap = function (geometry) {
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
         * Retrieve the home information from the server
         */
        HomeSignUpController.prototype.prepopulateHomeInfo = function () {
            if (!this.selectedSplitAddress)
                return;
            this.isLoadingHomeInfo = true;
            var getUri = "/api/PropertyResearch/HomeInfo?street=" + encodeURIComponent(this.selectedSplitAddress.street) + "&city=" + encodeURIComponent(this.selectedSplitAddress.city) + "&state=" + this.selectedSplitAddress.state + "&zip=" + this.selectedSplitAddress.zip;
            var innerThis = this;
            this.$http.get(getUri).then(function (httpResponse) {
                innerThis.isLoadingHomeInfo = false;
                var homeInfo = httpResponse.data;
                if (homeInfo) {
                    innerThis.didLoadHomeInfo = true;
                    innerThis.signUpInfo.homeInfo = homeInfo;
                    innerThis.processLotSizeHint(homeInfo.lotSquareFeet);
                }
            }, function () {
                innerThis.isLoadingHomeInfo = false;
            });
        };
        HomeSignUpController.$inject = ["$http", "$scope", "WizardHandler"];
        return HomeSignUpController;
    }());
    Ally.HomeSignUpController = HomeSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component('homeSignUp', {
    templateUrl: "/ngApp/home/public/home-sign-up.html",
    controller: Ally.HomeSignUpController
});

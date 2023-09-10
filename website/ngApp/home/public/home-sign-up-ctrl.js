/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/googlemaps/google.maps.d.ts" />
var Ally;
(function (Ally) {
    class SignerUpInfo {
    }
    class HomeInfo {
    }
    Ally.HomeInfo = HomeInfo;
    class SignUpInfo {
        constructor() {
            this.signerUpInfo = new SignerUpInfo();
            this.streetAddress = "";
            this.homeInfo = new HomeInfo();
        }
    }
    const LotSizeType_Acres = "Acres";
    const LotSizeType_SquareFeet = "SquareFeet";
    const SquareFeetPerAcre = 43560;
    /**
     * The controller for the Home Ally sign-up page
     */
    class HomeSignUpController {
        /**
         * The constructor for the class
         * @param $http The HTTP service object
         * @param $scope The Angular scope object
         */
        constructor($http, $scope, WizardHandler) {
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
        $onInit() {
            // Listen for step changes
            this.$scope.$on('wizard:stepChanged', (event, args) => {
                // If we're now on the second step
                if (args.index === 1)
                    this.retrieveHomeInfoForAddress();
            });
            // The controller is ready, but let's wait a bit for the page to be ready
            var innerThis = this;
            setTimeout(() => { this.initMap(); }, 300);
        }
        /**
         * Retrieve information about the address provided from Zillow
         */
        retrieveHomeInfoForAddress() {
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.streetAddress) || this.hasAlreadyCheckedForHomeInfo)
                return;
            this.hasAlreadyCheckedForHomeInfo = true;
            var getUri = "/api/HomeSignUp/HomeInfo?streetAddress=" + encodeURIComponent(this.signUpInfo.streetAddress);
            this.$http.get(getUri, { cache: true }).then((response) => {
                if (!response.data)
                    return;
                this.signUpInfo.homeInfo = response.data;
                this.didLoadHomeInfo = true;
                this.processLotSizeHint(this.signUpInfo.homeInfo.lotSquareFeet);
            });
        }
        /**
         * Convert a lot size hint from Zillow into a UI friendly value
         * @param lotSquareFeet
         */
        processLotSizeHint(lotSquareFeet) {
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
        }
        /**
         * Initialize the Google map on the page
         */
        initMap() {
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
        }
        /**
         * Occurs when the user hits enter in the address box
         */
        goNextStep() {
            this.WizardHandler.wizard().next();
        }
        /**
         * Called when the user completes the wizard
         */
        onFinishedWizard() {
            //if( this.lotSizeUnit === LotSizeType_Acres )
            //    this.signUpInfo.homeInfo.lotSquareFeet = this.lotSquareUnits * SquareFeetPerAcre;
            //else
            //    this.signUpInfo.homeInfo.lotSquareFeet = this.lotSquareUnits;
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/HomeSignUp", this.signUpInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                let signUpResult = httpResponse.data;
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
        }
        /**
         * Called when the user types in a new street address
         */
        onHomeAddressChanged() {
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
        }
        /**
         * Center the map on a position
         * @param geometry The geometry on which to center
         */
        centerMap(geometry) {
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
        }
        /**
         * Retrieve the home information from the server
         */
        prepopulateHomeInfo() {
            if (!this.selectedSplitAddress)
                return;
            this.isLoadingHomeInfo = true;
            let getUri = `/api/PropertyResearch/HomeInfo?street=${encodeURIComponent(this.selectedSplitAddress.street)}&city=${encodeURIComponent(this.selectedSplitAddress.city)}&state=${this.selectedSplitAddress.state}&zip=${this.selectedSplitAddress.zip}`;
            var innerThis = this;
            this.$http.get(getUri).then((httpResponse) => {
                innerThis.isLoadingHomeInfo = false;
                let homeInfo = httpResponse.data;
                if (homeInfo) {
                    innerThis.didLoadHomeInfo = true;
                    innerThis.signUpInfo.homeInfo = homeInfo;
                    innerThis.processLotSizeHint(homeInfo.lotSquareFeet);
                }
            }, () => {
                innerThis.isLoadingHomeInfo = false;
            });
        }
    }
    HomeSignUpController.$inject = ["$http", "$scope", "WizardHandler"];
    Ally.HomeSignUpController = HomeSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component('homeSignUp', {
    templateUrl: "/ngApp/home/public/home-sign-up.html",
    controller: Ally.HomeSignUpController
});

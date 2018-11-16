var Ally;
(function (Ally) {
    var MemberSignUpInfo = /** @class */ (function () {
        function MemberSignUpInfo() {
        }
        return MemberSignUpInfo;
    }());
    /**
     * The controller for the PTA Ally home page
     */
    var PtaMemberSignUpController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PtaMemberSignUpController($http, $rootScope, siteInfo, $timeout, appCacheService) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.appCacheService = appCacheService;
            this.isLoading = false;
            this.signUpInfo = new MemberSignUpInfo();
            this.showInputForm = true;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        PtaMemberSignUpController.prototype.$onInit = function () {
            var _this = this;
            this.groupName = this.siteInfo.publicSiteInfo.fullName;
            window.setTimeout(function () { return _this.hookupAddressAutocomplete(); }, 300);
        };
        /**
         * Attach the Google Places auto-complete logic to the address text box
         */
        PtaMemberSignUpController.prototype.hookupAddressAutocomplete = function () {
            // If we know our group's position, let's tighten the auto-complete suggestion radius
            var autocompleteOptions = undefined;
            if (this.siteInfo.publicSiteInfo.googleGpsPosition) {
                // Also mask phone numbers for US phones
                var phoneFields = $(".mask-phone");
                phoneFields.mask("(999) 999-9999? x999", { autoclear: false });
                var TwentyFiveMilesInMeters = 40234;
                var circle = new google.maps.Circle({
                    center: this.siteInfo.publicSiteInfo.googleGpsPosition,
                    radius: TwentyFiveMilesInMeters
                });
                autocompleteOptions = {
                    bounds: circle.getBounds()
                };
            }
            var addressInput = document.getElementById("member-home-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            var innerThis = this;
            google.maps.event.addListener(this.addressAutocomplete, "place_changed", function () {
                var place = innerThis.addressAutocomplete.getPlace();
                innerThis.signUpInfo.streetAddress = place.formatted_address;
            });
        };
        PtaMemberSignUpController.prototype.submitInfo = function () {
            var _this = this;
            this.signUpInfo.recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.recaptchaKey)) {
                this.errorMessage = "Please complete the reCAPTCHA field";
                return;
            }
            this.isLoading = true;
            this.errorMessage = null;
            this.$http.post("/api/PublicPta", this.signUpInfo).then(function (response) {
                _this.isLoading = false;
                _this.showInputForm = false;
            }, function (response) {
                _this.isLoading = false;
                _this.errorMessage = "Failed to submit: " + response.data.exceptionMessage;
            });
        };
        PtaMemberSignUpController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
        return PtaMemberSignUpController;
    }());
    Ally.PtaMemberSignUpController = PtaMemberSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component("ptaMemberSignUp", {
    templateUrl: "/ngApp/pta/pta-member-sign-up.html",
    controller: Ally.PtaMemberSignUpController
});

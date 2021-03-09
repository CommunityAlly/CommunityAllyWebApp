var Ally;
(function (Ally) {
    var MemberSignUpInfo = /** @class */ (function () {
        function MemberSignUpInfo() {
        }
        return MemberSignUpInfo;
    }());
    /**
     * The controller for the page that allows anonymous users share their contact info to be
     * invited to the group's site
     */
    var PendingMemberSignUpController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PendingMemberSignUpController($http, $rootScope, siteInfo, $timeout, appCacheService) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.appCacheService = appCacheService;
            this.isLoading = false;
            this.signUpInfo = new MemberSignUpInfo();
            this.showInputForm = true;
            this.showSchoolField = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        PendingMemberSignUpController.prototype.$onInit = function () {
            var _this = this;
            this.groupName = this.siteInfo.publicSiteInfo.fullName;
            this.showSchoolField = AppConfig.appShortName === "pta";
            window.setTimeout(function () { return _this.hookupAddressAutocomplete(); }, 300);
            this.$timeout(function () { return grecaptcha.render("recaptcha-check-elem"); }, 100);
        };
        /**
         * Attach the Google Places auto-complete logic to the address text box
         */
        PendingMemberSignUpController.prototype.hookupAddressAutocomplete = function () {
            // If we know our group's position, let's tighten the auto-complete suggestion radius
            var autocompleteOptions = undefined;
            //if( this.siteInfo.publicSiteInfo.googleGpsPosition )
            //{
            //    // Also mask phone numbers for US phones
            //    var phoneFields: any = $( ".mask-phone" );
            //    phoneFields.mask( "(999) 999-9999? x999", { autoclear: false } );
            //    const TwentyFiveMilesInMeters = 40234;
            //    var circle = new google.maps.Circle( {
            //        center: this.siteInfo.publicSiteInfo.googleGpsPosition,
            //        radius: TwentyFiveMilesInMeters
            //    } );
            //    autocompleteOptions = {
            //        bounds: circle.getBounds()
            //    };
            //}
            var addressInput = document.getElementById("member-home-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            var innerThis = this;
            google.maps.event.addListener(this.addressAutocomplete, "place_changed", function () {
                var place = innerThis.addressAutocomplete.getPlace();
                innerThis.signUpInfo.streetAddress = place.formatted_address;
            });
        };
        PendingMemberSignUpController.prototype.submitInfo = function () {
            var _this = this;
            this.signUpInfo.recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.recaptchaKey)) {
                this.errorMessage = "Please complete the reCAPTCHA field";
                return;
            }
            this.isLoading = true;
            this.errorMessage = null;
            this.$http.post("/api/PublicPendingUser", this.signUpInfo).then(function (response) {
                _this.isLoading = false;
                _this.showInputForm = false;
            }, function (response) {
                _this.isLoading = false;
                _this.errorMessage = "Failed to submit: " + response.data.exceptionMessage;
            });
        };
        PendingMemberSignUpController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
        return PendingMemberSignUpController;
    }());
    Ally.PendingMemberSignUpController = PendingMemberSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component("pendingMemberSignUp", {
    templateUrl: "/ngApp/chtn/public/pending-member-sign-up.html",
    controller: Ally.PendingMemberSignUpController
});

var Ally;
(function (Ally) {
    class MemberSignUpInfo {
    }
    /**
     * The controller for the page that allows anonymous users share their contact info to be
     * invited to the group's site
     */
    class PendingMemberSignUpController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo, $timeout, appCacheService) {
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
        $onInit() {
            this.groupName = this.siteInfo.publicSiteInfo.fullName;
            this.showSchoolField = AppConfig.appShortName === "pta";
            window.setTimeout(() => this.hookupAddressAutocomplete(), 300);
            this.$timeout(() => grecaptcha.render("recaptcha-check-elem"), 100);
        }
        /**
         * Attach the Google Places auto-complete logic to the address text box
         */
        hookupAddressAutocomplete() {
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
        }
        submitInfo() {
            this.signUpInfo.recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.recaptchaKey)) {
                this.errorMessage = "Please complete the reCAPTCHA field";
                return;
            }
            this.isLoading = true;
            this.errorMessage = null;
            this.$http.post("/api/PublicPendingUser", this.signUpInfo).then((response) => {
                this.isLoading = false;
                this.showInputForm = false;
            }, (response) => {
                this.isLoading = false;
                this.errorMessage = "Failed to submit: " + response.data.exceptionMessage;
            });
        }
    }
    PendingMemberSignUpController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
    Ally.PendingMemberSignUpController = PendingMemberSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component("pendingMemberSignUp", {
    templateUrl: "/ngApp/chtn/public/pending-member-sign-up.html",
    controller: Ally.PendingMemberSignUpController
});

var Ally;
(function (Ally) {
    class NewUserSignUpInfo {
    }
    /**
     * The controller for the Neighborhood Ally sign-up page
     */
    class NeighborSignUpController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.signUpInfo = new NewUserSignUpInfo();
            this.resultIsError = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            // Hook up address auto-complete, after the page has loaded
            setTimeout(() => {
                const autocompleteOptions = undefined;
                //if( this.siteInfo.publicSiteInfo.googleGpsPosition )
                //{
                //    var TwentyFiveMilesInMeters = 40234;
                //    var circle = new google.maps.Circle( {
                //        center: this.siteInfo.publicSiteInfo.googleGpsPosition,
                //        radius: TwentyFiveMilesInMeters
                //    } );
                //    autocompleteOptions = {
                //        bounds: circle.getBounds()
                //    };
                //}
                const addressInput = document.getElementById("address-text-box");
                new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            }, 750);
        }
        /**
         * Occurs when the user clicks the button to submit their email address
         */
        onSubmitInfo() {
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.emailAddress)) {
                alert("Please enter an email address");
                return;
            }
            this.signUpInfo.requestFromUrl = window.location.href;
            this.isLoading = true;
            this.$http.post("/api/NeighborSignUp/SignUpNewUser", this.signUpInfo).then(() => {
                this.isLoading = false;
                this.resultIsError = false;
                this.resultMessage = "Your information has been successfully submitted. Look for a welcome email soon.";
            }, () => {
                this.isLoading = false;
                this.resultIsError = true;
                this.resultMessage = "There was an error submitting your information. Please try again.";
            });
        }
        /**
         * Occurs when the user wants to retry submission of their info
         */
        goBack() {
            this.resultMessage = null;
        }
    }
    NeighborSignUpController.$inject = ["$http"];
    Ally.NeighborSignUpController = NeighborSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component("neighborSignUp", {
    templateUrl: "/ngApp/chtn/public/neighbor-sign-up.html",
    controller: Ally.NeighborSignUpController
});

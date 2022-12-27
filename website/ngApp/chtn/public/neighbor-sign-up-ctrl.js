var Ally;
(function (Ally) {
    var NewUserSignUpInfo = /** @class */ (function () {
        function NewUserSignUpInfo() {
        }
        return NewUserSignUpInfo;
    }());
    /**
     * The controller for the Neighborhood Ally sign-up page
     */
    var NeighborSignUpController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function NeighborSignUpController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.signUpInfo = new NewUserSignUpInfo();
            this.resultIsError = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        NeighborSignUpController.prototype.$onInit = function () {
            // Hook up address auto-complete, after the page has loaded
            setTimeout(function () {
                var autocompleteOptions = undefined;
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
                var addressInput = document.getElementById("address-text-box");
                new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            }, 750);
        };
        /**
         * Occurs when the user clicks the button to submit their email address
         */
        NeighborSignUpController.prototype.onSubmitInfo = function () {
            var _this = this;
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.emailAddress)) {
                alert("Please enter an email address");
                return;
            }
            this.isLoading = true;
            this.$http.post("/api/NeighborSignUp/SignUpNewUser", this.signUpInfo).then(function () {
                _this.isLoading = false;
                _this.resultIsError = false;
                _this.resultMessage = "Your information has been successfully submitted. Look for a welcome email soon.";
            }, function () {
                _this.isLoading = false;
                _this.resultIsError = true;
                _this.resultMessage = "There was an error submitting your information. Please try again.";
            });
        };
        /**
         * Occurs when the user wants to retry submission of their info
         */
        NeighborSignUpController.prototype.goBack = function () {
            this.resultMessage = null;
        };
        NeighborSignUpController.$inject = ["$http"];
        return NeighborSignUpController;
    }());
    Ally.NeighborSignUpController = NeighborSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component("neighborSignUp", {
    templateUrl: "/ngApp/chtn/public/neighbor-sign-up.html",
    controller: Ally.NeighborSignUpController
});

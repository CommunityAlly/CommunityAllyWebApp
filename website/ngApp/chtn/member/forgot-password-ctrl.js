var Ally;
(function (Ally) {
    /**
     * The controller for the page that allows users to reset their password
     */
    var ForgotPasswordController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ForgotPasswordController($http, appCacheService) {
            this.$http = $http;
            this.appCacheService = appCacheService;
            this.isLoading = false;
            this.loginInfo = new Ally.LoginInfo();
            this.shouldHideControls = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ForgotPasswordController.prototype.$onInit = function () {
            this.loginInfo.emailAddress = this.appCacheService.getAndClear("forgotEmail");
        };
        /**
         * Occurs when the user clicks the log-in button
         */
        ForgotPasswordController.prototype.onSubmitEmail = function () {
            this.isLoading = true;
            // Retrieve information for the current association
            var innerThis = this;
            this.$http.post("/api/Login/Forgot", this.loginInfo).then(function () {
                innerThis.shouldHideControls = true;
                innerThis.isLoading = false;
                innerThis.resultText = "Please check your e-mail for updated login information.";
                innerThis.resultTextColor = "#00F";
            }, function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.resultText = "Failed to process your request: " + httpResponse.data;
                innerThis.resultTextColor = "#F00";
            });
        };
        ForgotPasswordController.$inject = ["$http", "appCacheService"];
        return ForgotPasswordController;
    }());
    Ally.ForgotPasswordController = ForgotPasswordController;
})(Ally || (Ally = {}));
CA.angularApp.component("forgotPassword", {
    templateUrl: "/ngApp/chtn/member/forgot-password.html",
    controller: Ally.ForgotPasswordController
});

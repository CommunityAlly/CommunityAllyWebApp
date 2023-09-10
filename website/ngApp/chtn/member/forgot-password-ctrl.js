var Ally;
(function (Ally) {
    /**
     * The controller for the page that allows users to reset their password
     */
    class ForgotPasswordController {
        /**
         * The constructor for the class
         */
        constructor($http, appCacheService) {
            this.$http = $http;
            this.appCacheService = appCacheService;
            this.isLoading = false;
            this.loginInfo = new Ally.LoginInfo();
            this.shouldHideControls = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.loginInfo.emailAddress = this.appCacheService.getAndClear("forgotEmail");
        }
        /**
         * Occurs when the user clicks the log-in button
         */
        onSubmitEmail() {
            this.isLoading = true;
            // Retrieve information for the current association
            this.$http.post("/api/Login/Forgot", this.loginInfo).then(() => {
                this.shouldHideControls = true;
                this.isLoading = false;
                this.resultText = "Please check your email for updated login information.";
                this.resultTextColor = "#00F";
            }, (httpResponse) => {
                this.isLoading = false;
                this.resultText = "Failed to process your request: " + httpResponse.data.exceptionMessage;
                this.resultTextColor = "#F00";
            });
        }
    }
    ForgotPasswordController.$inject = ["$http", "appCacheService"];
    Ally.ForgotPasswordController = ForgotPasswordController;
})(Ally || (Ally = {}));
CA.angularApp.component("forgotPassword", {
    templateUrl: "/ngApp/chtn/member/forgot-password.html",
    controller: Ally.ForgotPasswordController
});

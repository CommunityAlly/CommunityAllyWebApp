var Ally;
(function (Ally) {
    /**
     * The controller for the page that shows useful info on a map
     */
    class EmailChangeConfirmController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, appCacheService, $routeParams) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.$routeParams = $routeParams;
            this.isLoading = false;
            this.confirmationResultMessage = "Loading...";
            this.isError = undefined;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.confirmChangeId();
        }
        /**
        * Confirm the email change
        */
        confirmChangeId() {
            this.isLoading = true;
            this.$http.put("/api/MyProfile/ConfirmEmailChange?emailChangeId=" + this.$routeParams.emailChangeId, null).then(() => {
                this.isLoading = false;
                this.confirmationResultMessage = "Email successfully updated.";
                this.isError = false;
            }, (response) => {
                this.isLoading = false;
                this.isError = true;
                if (!response.data)
                    this.confirmationResultMessage = "Invalid URL, please check your email link again.";
                else
                    this.confirmationResultMessage = response.data.exceptionMessage;
            });
        }
    }
    EmailChangeConfirmController.$inject = ["$http", "SiteInfo", "appCacheService", "$routeParams"];
    Ally.EmailChangeConfirmController = EmailChangeConfirmController;
})(Ally || (Ally = {}));
CA.angularApp.component("emailChangeConfirm", {
    templateUrl: "/ngApp/chtn/member/email-change-confirm.html",
    controller: Ally.EmailChangeConfirmController
});

var Ally;
(function (Ally) {
    class HelpSendInfo {
    }
    /**
     * The controller for the page that allows users to submit feedback
     */
    class HelpFormController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.sendInfo = new HelpSendInfo();
            this.isLoading = false;
            this.wasMessageSent = false;
            this.isPageEnabled = null;
            this.shouldShowGroupNameField = false;
            /**
             * Occurs when the user clicks the log-in button
             */
            this.onSendHelp = function () {
                $("#help-form").validate();
                if (!$("#help-form").valid())
                    return;
                this.isLoading = true;
                // Retrieve information for the current association
                this.$http.post("/api/Help", this.sendInfo).then(() => {
                    this.isLoading = false;
                    this.sendInfo = {};
                    this.sendInfo.clientUrl = window.location.href;
                    this.wasMessageSent = true;
                    this.resultStyle.color = "#00F";
                    this.sendResult = "Your message has been sent. We'll do our best to get back to you within 24 hours.";
                }, () => {
                    this.isLoading = false;
                    this.resultStyle.color = "#F00";
                    this.sendResult = "Failed to send message.";
                });
            };
            this.resultStyle = {
                "text-align": "center",
                "font-size": "large",
                "font-weight": "bold"
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.$http.get("/api/PublicAllyAppSettings/IsHelpPageEnabled").then((httpResponse) => this.isPageEnabled = httpResponse.data, (httpResponse) => {
                this.isPageEnabled = true; // Default to true if we can't get the setting
                console.log("Failed to get sign-up enabled status: " + httpResponse.data.exceptionMessage);
            });
            if (this.siteInfo.isLoggedIn)
                this.sendInfo.emailAddress = this.siteInfo.userInfo.emailAddress;
            this.sendInfo.clientUrl = window.location.href;
            this.shouldShowGroupNameField = HtmlUtil.getSubdomain(window.location.host) === "login";
        }
    }
    HelpFormController.$inject = ["$http", "SiteInfo"];
    Ally.HelpFormController = HelpFormController;
})(Ally || (Ally = {}));
CA.angularApp.component("helpForm", {
    templateUrl: "/ngApp/chtn/member/help.html",
    controller: Ally.HelpFormController
});

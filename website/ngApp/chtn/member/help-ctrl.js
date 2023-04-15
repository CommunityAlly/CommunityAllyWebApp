var Ally;
(function (Ally) {
    var HelpSendInfo = /** @class */ (function () {
        function HelpSendInfo() {
        }
        return HelpSendInfo;
    }());
    /**
     * The controller for the page that allows users to submit feedback
     */
    var HelpFormController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HelpFormController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.sendInfo = new HelpSendInfo();
            this.isLoading = false;
            this.wasMessageSent = false;
            this.isPageEnabled = null;
            /**
             * Occurs when the user clicks the log-in button
             */
            this.onSendHelp = function () {
                $("#help-form").validate();
                if (!$("#help-form").valid())
                    return;
                this.isLoading = true;
                // Retrieve information for the current association
                var innerThis = this;
                this.$http.post("/api/Help", this.sendInfo).then(function () {
                    innerThis.isLoading = false;
                    innerThis.sendInfo = {};
                    innerThis.wasMessageSent = true;
                    innerThis.resultStyle.color = "#00F";
                    innerThis.sendResult = "Your message has been sent. We'll do our best to get back to you within 24 hours.";
                }, function () {
                    innerThis.isLoading = false;
                    innerThis.resultStyle.color = "#F00";
                    innerThis.sendResult = "Failed to send message.";
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
        HelpFormController.prototype.$onInit = function () {
            var _this = this;
            this.$http.get("/api/PublicAllyAppSettings/IsHelpPageEnabled").then(function (httpResponse) { return _this.isPageEnabled = httpResponse.data; }, function (httpResponse) {
                _this.isPageEnabled = true; // Default to true if we can't get the setting
                console.log("Failed to get sign-up enabled status: " + httpResponse.data.exceptionMessage);
            });
            if (this.siteInfo.isLoggedIn)
                this.sendInfo.emailAddress = this.siteInfo.userInfo.emailAddress;
        };
        HelpFormController.$inject = ["$http", "SiteInfo"];
        return HelpFormController;
    }());
    Ally.HelpFormController = HelpFormController;
})(Ally || (Ally = {}));
CA.angularApp.component("helpForm", {
    templateUrl: "/ngApp/chtn/member/help.html",
    controller: Ally.HelpFormController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    var SendMessageController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function SendMessageController($rootScope, fellowResidents, siteInfo) {
            this.$rootScope = $rootScope;
            this.fellowResidents = fellowResidents;
            this.shouldShowSendModal = false;
            this.shouldShowButtons = false;
            this.isSending = false;
            this.messageBody = "";
            this.messageSubject = "";
            this.sendResultIsError = false;
            this.messageSubject = siteInfo.userInfo.fullName + " has sent you a message via your " + AppConfig.appName + " site";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        SendMessageController.prototype.$onInit = function () {
        };
        // Display the send modal
        SendMessageController.prototype.showSendModal = function () {
            this.shouldShowSendModal = true;
            this.sendResultMessage = "";
            this.shouldShowButtons = true;
            // Focus on the message box once displayed
            setTimeout(function () { return document.getElementById("message-text-box").focus(); }, 50);
        };
        // Hide the send modal
        SendMessageController.prototype.hideModal = function () {
            this.shouldShowSendModal = false;
            this.messageBody = "";
        };
        // Send the user's message
        SendMessageController.prototype.sendMessage = function () {
            var _this = this;
            this.shouldShowButtons = false;
            this.isSending = true;
            this.sendResultMessage = "";
            this.fellowResidents.sendMessage(this.recipientInfo.userId, this.messageBody, this.messageSubject).then(function (response) {
                _this.isSending = false;
                _this.sendResultIsError = false;
                _this.messageBody = "";
                _this.sendResultMessage = "Message sent successfully!";
            }, function (response) {
                _this.shouldShowButtons = true;
                _this.isSending = false;
                _this.sendResultIsError = true;
                _this.sendResultMessage = "Failed to send: " + response.data.exceptionMessage;
            });
        };
        ;
        SendMessageController.$inject = ["$rootScope", "fellowResidents", "SiteInfo"];
        return SendMessageController;
    }());
    Ally.SendMessageController = SendMessageController;
})(Ally || (Ally = {}));
CA.angularApp.component("sendMessage", {
    bindings: {
        recipientInfo: "="
    },
    templateUrl: "/ngApp/services/send-message.html",
    controller: Ally.SendMessageController
});

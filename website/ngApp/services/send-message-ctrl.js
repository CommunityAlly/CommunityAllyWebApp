var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    class SendMessageController {
        /**
         * The constructor for the class
         */
        constructor($rootScope, fellowResidents, siteInfo, $http) {
            this.$rootScope = $rootScope;
            this.fellowResidents = fellowResidents;
            this.siteInfo = siteInfo;
            this.$http = $http;
            this.shouldShowSendModal = false;
            this.shouldShowButtons = false;
            this.isSending = false;
            this.messageBody = "";
            this.messageSubject = "";
            this.sendResultIsError = false;
            this.isPremiumPlanActive = false;
            this.isSendingToSelf = false;
            this.sendAsOptions = [];
            this.hasCustomizedSubject = false;
            this.messageSubject = `${siteInfo.userInfo.fullName} has sent you a message via your ${AppConfig.appName} site`;
        }
        /// Called on each controller after all the controllers on an element have been constructed
        $onInit() {
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.isSendingToSelf = this.recipientInfo.userId === this.siteInfo.userInfo.userId;
            this.fellowResidents.getEmailSendAsOptions(this.siteInfo.userInfo).then(sendAsOptions => {
                this.sendAsOptions = sendAsOptions;
                this.selectedSendAs = sendAsOptions[0]; // getEmailSendAsOptions is guaranteed to return at least one option
                // If we're sending to the board then don't allow the user to send as anyone else
                const isRecipientWholeBoard = this.recipientInfo.userId === Ally.GroupMembersController.AllBoardUserId;
                if (isRecipientWholeBoard)
                    this.sendAsOptions = [this.sendAsOptions[0]];
            });
        }
        /// Display the send modal
        showSendModal() {
            this.shouldShowSendModal = true;
            this.sendResultMessage = "";
            this.shouldShowButtons = true;
            // Focus on the message box once displayed
            if (this.isPremiumPlanActive)
                setTimeout(() => document.getElementById("message-text-box").focus(), 100);
        }
        /// Hide the send modal
        hideModal() {
            this.shouldShowSendModal = false;
            this.messageBody = "";
        }
        /// Send the user's message
        sendMessage() {
            this.shouldShowButtons = false;
            this.isSending = true;
            this.sendResultMessage = "";
            this.fellowResidents.sendMessage(this.recipientInfo.userId, this.messageBody, this.messageSubject, this.selectedSendAs.isBoardOption, this.selectedSendAs.committee ? this.selectedSendAs.committee.committeeId : null).then((response) => {
                this.isSending = false;
                this.sendResultIsError = false;
                this.messageBody = "";
                this.sendResultMessage = "Message sent successfully!";
            }, (response) => {
                this.shouldShowButtons = true;
                this.isSending = false;
                this.sendResultIsError = true;
                this.sendResultMessage = "Failed to send: " + response.data.exceptionMessage;
            });
        }
        /// Occurs when the user clicks the checkbox to toggle if they're sending as the board
        onSendAsChanged() {
            if (this.hasCustomizedSubject)
                return;
            if (this.selectedSendAs.isBoardOption)
                this.messageSubject = `Your ${this.siteInfo.publicSiteInfo.fullName} board has sent you a message via your ${AppConfig.appName} site`;
            else if (this.selectedSendAs.committee)
                this.messageSubject = `Your ${this.selectedSendAs.committee.name} has sent you a message via your ${AppConfig.appName} site`;
            else
                this.messageSubject = `${this.siteInfo.userInfo.fullName} has sent you a message via your ${AppConfig.appName} site`;
        }
    }
    SendMessageController.$inject = ["$rootScope", "fellowResidents", "SiteInfo", "$http"];
    Ally.SendMessageController = SendMessageController;
})(Ally || (Ally = {}));
CA.angularApp.component("sendMessage", {
    bindings: {
        recipientInfo: "="
    },
    templateUrl: "/ngApp/services/send-message.html",
    controller: Ally.SendMessageController
});

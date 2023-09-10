var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    class SendMessageController {
        /**
         * The constructor for the class
         */
        constructor($rootScope, fellowResidents, siteInfo) {
            this.$rootScope = $rootScope;
            this.fellowResidents = fellowResidents;
            this.siteInfo = siteInfo;
            this.shouldShowSendModal = false;
            this.shouldShowButtons = false;
            this.isSending = false;
            this.messageBody = "";
            this.messageSubject = "";
            this.sendResultIsError = false;
            this.isPremiumPlanActive = false;
            this.isSendingToSelf = false;
            this.shouldShowSendAsBoard = false;
            this.shouldSendAsBoard = false;
            this.messageSubject = `${siteInfo.userInfo.fullName} has sent you a message via your ${AppConfig.appName} site`;
        }
        /// Called on each controller after all the controllers on an element have been constructed
        $onInit() {
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.isSendingToSelf = this.recipientInfo.userId === this.siteInfo.userInfo.userId;
            const isRecipientWholeBoard = this.recipientInfo.userId === Ally.GroupMembersController.AllBoardUserId;
            this.shouldShowSendAsBoard = Ally.FellowResidentsService.isNonPropMgrBoardPosition(this.siteInfo.userInfo.boardPosition) && !isRecipientWholeBoard;
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
            this.fellowResidents.sendMessage(this.recipientInfo.userId, this.messageBody, this.messageSubject, this.shouldSendAsBoard).then((response) => {
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
        onSendAsBoardChanged() {
            if (this.shouldSendAsBoard)
                this.messageSubject = `Your ${this.siteInfo.publicSiteInfo.fullName} board has sent you a message via your ${AppConfig.appName} site`;
            else
                this.messageSubject = `${this.siteInfo.userInfo.fullName} has sent you a message via your ${AppConfig.appName} site`;
        }
    }
    SendMessageController.$inject = ["$rootScope", "fellowResidents", "SiteInfo"];
    Ally.SendMessageController = SendMessageController;
})(Ally || (Ally = {}));
CA.angularApp.component("sendMessage", {
    bindings: {
        recipientInfo: "="
    },
    templateUrl: "/ngApp/services/send-message.html",
    controller: Ally.SendMessageController
});

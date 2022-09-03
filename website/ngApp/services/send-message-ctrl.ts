namespace Ally
{
    /**
     * The controller for the committee home page
     */
    export class SendMessageController implements ng.IController
    {
        static $inject = ["$rootScope", "fellowResidents", "SiteInfo"];
        shouldShowSendModal: boolean = false;
        shouldShowButtons: boolean = false;
        sendResultMessage: string;
        isSending: boolean = false;
        messageBody: string = "";
        messageSubject: string = "";
        sendResultIsError: boolean = false;
        recipientInfo: SimpleUserEntry;
        isPremiumPlanActive: boolean = false;
        isSendingToSelf: boolean = false;
        shouldShowSendAsBoard: boolean = false;
        shouldSendAsBoard: boolean = false;


        /**
         * The constructor for the class
         */
        constructor( private $rootScope: ng.IRootScopeService, private fellowResidents: FellowResidentsService, private siteInfo: SiteInfoService )
        {
            this.messageSubject = `${siteInfo.userInfo.fullName} has sent you a message via your ${AppConfig.appName} site`;
        }


        /// Called on each controller after all the controllers on an element have been constructed
        $onInit()
        {
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.isSendingToSelf = this.recipientInfo.userId === this.siteInfo.userInfo.userId;

            const isRecipientWholeBoard = this.recipientInfo.userId === GroupMembersController.AllBoardUserId;
            this.shouldShowSendAsBoard = FellowResidentsService.isNonPropMgrBoardPosition( this.siteInfo.userInfo.boardPosition ) && !isRecipientWholeBoard;
        }


        /// Display the send modal
        showSendModal()
        {
            this.shouldShowSendModal = true;
            this.sendResultMessage = "";
            this.shouldShowButtons = true;

            // Focus on the message box once displayed
            if( this.isPremiumPlanActive )
                setTimeout( () => document.getElementById( "message-text-box" ).focus(), 100 );
        }


        /// Hide the send modal
        hideModal()
        {
            this.shouldShowSendModal = false;
            this.messageBody = "";
        }


        /// Send the user's message
        sendMessage()
        {
            this.shouldShowButtons = false;
            this.isSending = true;
            this.sendResultMessage = "";

            this.fellowResidents.sendMessage( this.recipientInfo.userId, this.messageBody, this.messageSubject, this.shouldSendAsBoard ).then(
                ( response: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isSending = false;
                    this.sendResultIsError = false;
                    this.messageBody = "";
                    this.sendResultMessage = "Message sent successfully!";

                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.shouldShowButtons = true;
                    this.isSending = false;
                    this.sendResultIsError = true;

                    this.sendResultMessage = "Failed to send: " + response.data.exceptionMessage;
                }
            );
        }


        /// Occurs when the user clicks the checkbox to toggle if they're sending as the board
        onSendAsBoardChanged()
        {
            if( this.shouldSendAsBoard )
                this.messageSubject = `Your ${this.siteInfo.publicSiteInfo.fullName} board has sent you a message via your ${AppConfig.appName} site`;
            else
                this.messageSubject = `${this.siteInfo.userInfo.fullName} has sent you a message via your ${AppConfig.appName} site`;
        }
    }
}


CA.angularApp.component( "sendMessage", {
    bindings: {
        recipientInfo: "="
    },
    templateUrl: "/ngApp/services/send-message.html",
    controller: Ally.SendMessageController
} );
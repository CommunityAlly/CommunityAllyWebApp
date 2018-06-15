namespace Ally
{
    class SendEmailRecpientEntry
    {
        recipientType: string;
        displayName: string;
        sortOrder: number;
    }

    class HomeEmailMessage
    {
        subject: string;
        message: string;
        recipientType: string = "board";
        committeeId: number;
    }


    /**
     * The controller for the widget that lets members send e-mails to the group
     */
    export class GroupSendEmailController implements ng.IController
    {
        static $inject = ["$http", "fellowResidents", "$rootScope", "SiteInfo", "$scope"];

        isLoadingEmail: boolean = false;
        availableEmailGroups: GroupEmailInfo[];
        messageObject: HomeEmailMessage;
        defaultMessageRecipient: string = "board";
        showDiscussionEveryoneWarning: boolean = false;
        showDiscussionLargeWarning: boolean = false;
        showUseDiscussSuggestion: boolean = false;
        showSendConfirmation: boolean = false;
        showEmailForbidden: boolean = false;
        showRestrictedGroupWarning: boolean = false;
        showSendEmail: boolean;
        groupEmailAddress: string;
        committee: Ally.Committee;
        defaultSubject: string = "A message from your neighbor";


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private fellowResidents: Ally.FellowResidentsService, private $rootScope: ng.IRootScopeService, private siteInfo: Ally.SiteInfoService, private $scope: ng.IScope )
        {
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            this.messageObject = new HomeEmailMessage();
            
            this.showSendEmail = true;

            if( !this.committee )
            {
                this.loadGroupEmails();

                // Handle the global message that tells this component to prepare a draft of a message
                // to inquire about assessment inaccuracies
                this.$scope.$on( "prepAssessmentEmailToBoard", ( event: ng.IAngularEvent, data: string ) => this.prepBadAssessmentEmailForBoard( data ) );

                this.defaultSubject = "A message from your neighbor";
            }
            else
            {
                this.messageObject.committeeId = this.committee.committeeId;
                this.defaultSubject = "A message from a committee member";
            }

            this.messageObject.subject = this.defaultSubject;
        }


        /**
         * Populate the group e-mail options
         */
        loadGroupEmails()
        {
            this.isLoadingEmail = true;

            var innerThis = this;
            this.fellowResidents.getGroupEmailObject().then( function( emailList: Ally.GroupEmailInfo[] )
            {
                innerThis.isLoadingEmail = false;
                innerThis.availableEmailGroups = emailList;
                
                if( innerThis.availableEmailGroups.length > 0 )
                {
                    innerThis.defaultMessageRecipient = innerThis.availableEmailGroups[0].recipientType;
                    innerThis.messageObject.recipientType = innerThis.defaultMessageRecipient;
                    innerThis.onSelectEmailGroup();
                }
            } );
        }


        /**
         * Setup an e-mail to be sent to the board for assessment issues
         */
        prepBadAssessmentEmailForBoard( emitEventData: string )
        {
            let emitDataParts = emitEventData.split( "|" );
            let assessmentAmount = emitDataParts[0];

            let nextPaymentText = null;
            if( emitDataParts.length > 1 )
                nextPaymentText = emitDataParts[1];

            // Create a message to the board
            this.messageObject.recipientType = "board";

            this.messageObject.subject = "Question About Assessment Amount";

            if( nextPaymentText )
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my next payment of $" + assessmentAmount + " will cover " + nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my assessment payment is $" + assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $[INSERT PROPER AMOUNT HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;

            document.getElementById( "send-email-panel" ).scrollIntoView();
        }


        /**
         * Occurs when the user presses the button to send an e-mail to members of the building
         */
        onSendEmail()
        {
            $( "#message-form" ).validate(); 
            if( !$( "#message-form" ).valid() )
                return;

            this.isLoadingEmail = true;

            // Set this flag so we don't redirect if sending results in a 403
            this.$rootScope.dontHandle403 = true;

            analytics.track( "sendEmail", {
                recipientId: this.messageObject.recipientType
            } );

            this.$http.post( "/api/Email/v2", this.messageObject ).then( () =>
            {
                this.$rootScope.dontHandle403 = false;
                this.isLoadingEmail = false;

                this.messageObject = new HomeEmailMessage();
                this.messageObject.recipientType = this.defaultMessageRecipient;
                this.messageObject.subject = this.defaultSubject;

                if( this.committee )
                    this.messageObject.committeeId = this.committee.committeeId;

                this.showSendConfirmation = true;
                this.showSendEmail = false;

            }, ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoadingEmail = false;
                this.$rootScope.dontHandle403 = false;

                if( httpResponse.status === 403 )
                {
                    this.showEmailForbidden = true;
                }
                else
                    alert( "Unable to send e-mail, please contact technical support." );
            } );
        }


        /**
         * Occurs when the user selects an e-mail group from the drop-down
         */
        onSelectEmailGroup()
        {
            var shortName = HtmlUtil.getSubdomain( window.location.host ).toLowerCase();
            this.groupEmailAddress = this.messageObject.recipientType + "." + shortName + "@inmail.condoally.com";

            // No need to show this right now as the showRestrictedGroupWarning is more clear
            this.showDiscussionEveryoneWarning = false; // this.messageObject.recipientType === "Everyone";

            var isSendingToOwners = this.messageObject.recipientType.toLowerCase().indexOf( "owners" ) !== -1;
            
            if( !this.showDiscussionEveryoneWarning
                && isSendingToOwners
                && this.siteInfo.privateSiteInfo.numUnits > 30 )
                this.showDiscussionLargeWarning = true;
            else
                this.showDiscussionLargeWarning = false;

            var isSendingToDiscussion = this.messageObject.recipientType.toLowerCase().indexOf( "discussion" ) !== -1;
            var isSendingToBoard = this.messageObject.recipientType.toLowerCase().indexOf( "board" ) !== -1;

            this.showDiscussionEveryoneWarning = false;
            this.showDiscussionLargeWarning = false;
            this.showUseDiscussSuggestion = !isSendingToDiscussion && !isSendingToBoard;

            var groupInfo = _.find( this.availableEmailGroups, ( g: GroupEmailInfo ) => g.recipientType === this.messageObject.recipientType );
            this.showRestrictedGroupWarning = groupInfo.isRestrictedGroup;
        }
    }
}


CA.angularApp.component( "groupSendEmail", {
    bindings: {
        committee: "<?"  
    },
    templateUrl: "/ngApp/common/group-send-email.html",
    controller: Ally.GroupSendEmailController
} );
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
        subject: string = "A message from your neighbor";
        message: string;
        recipientType: string = "board";
    }


    /**
     * The controller for the widget that lets members send e-mails to the group
     */
    export class GroupSendEmailController implements ng.IController
    {
        static $inject = ["$http", "fellowResidents", "$rootScope", "SiteInfo", "$scope"];

        isLoadingEmail: boolean = false;
        availableEmailGroups: GroupEmailInfo[];
        messageObject: HomeEmailMessage = new HomeEmailMessage();
        defaultMessageRecipient: string = "board";
        showDiscussionEveryoneWarning: boolean = false;
        showDiscussionLargeWarning: boolean = false;
        showSendConfirmation: boolean = false;
        showEmailForbidden: boolean = false;
        showSendEmail: boolean;
        groupEmailAddress: string;


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
            // The object that contains a message if the user wants to send one out
            this.messageObject = new HomeEmailMessage();
            this.showSendEmail = true;

            this.loadGroupEmails();

            var innerThis = this;
            this.$scope.$on( "prepAssessmentEmailToBoard", ( event: ng.IAngularEvent, data: string ) => innerThis.prepBadAssessmentEmailForBoard( data ) );
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
            this.$rootScope.dontHandle403 = true;

            analytics.track( "sendEmail", {
                recipientId: this.messageObject.recipientType
            } );

            var innerThis = this;
            this.$http.post( "/api/Email/v2", this.messageObject ).then( function()
            {
                innerThis.$rootScope.dontHandle403 = false;
                innerThis.isLoadingEmail = false;
                innerThis.messageObject = new HomeEmailMessage();
                innerThis.messageObject.recipientType = innerThis.defaultMessageRecipient;
                innerThis.showSendConfirmation = true;
                innerThis.showSendEmail = false;

            }, function( httpResponse )
            {
                innerThis.isLoadingEmail = false;
                innerThis.$rootScope.dontHandle403 = false;

                if( httpResponse.status === 403 )
                {
                    innerThis.showEmailForbidden = true;
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

            this.showDiscussionEveryoneWarning = this.messageObject.recipientType === "everyone";

            var isSendingToOwners = this.messageObject.recipientType.toLowerCase().indexOf( "owners" ) !== -1;

            if( !this.showDiscussionEveryoneWarning
                && isSendingToOwners
                && this.siteInfo.privateSiteInfo.numUnits > 30 )
                this.showDiscussionLargeWarning = true;
            else
                this.showDiscussionLargeWarning = false;
        }
    }
}


CA.angularApp.component( "groupSendEmail", {
    templateUrl: "/ngApp/common/group-send-email.html",
    controller: Ally.GroupSendEmailController
} );
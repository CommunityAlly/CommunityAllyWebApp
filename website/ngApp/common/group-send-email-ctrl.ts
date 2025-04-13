﻿namespace Ally
{
    /**
     * The controller for the widget that lets members send emails to the group
     */
    export class GroupSendEmailController implements ng.IController
    {
        static $inject = ["$http", "fellowResidents", "$rootScope", "SiteInfo", "$scope"];

        isLoadingEmail: boolean = false;
        availableEmailGroups: GroupEmailInfo[];
        selectedRecipient: GroupEmailInfo;
        messageObject: HomeEmailMessage;
        defaultMessageRecipient: GroupEmailInfo;
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
        memberLabel: string = "resident";
        memberPageName: string = "Residents";
        groupEmailDomain: string;
        allSendAsOptions: EmailSendAsOption[] = [];
        filteredSendAsOptions: EmailSendAsOption[] = [];
        selectedSendAs: EmailSendAsOption;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private fellowResidents: Ally.FellowResidentsService,
            private $rootScope: ng.IRootScopeService,
            private siteInfo: Ally.SiteInfoService,
            private $scope: ng.IScope )
        {
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            this.groupEmailDomain = "inmail." + AppConfig.baseTld;
            this.messageObject = new HomeEmailMessage();

            this.showSendEmail = true;

            if( this.committee )
            {
                this.messageObject.committeeId = this.committee.committeeId;
                this.defaultSubject = "A message from a committee member";
            }
            else
            {
                this.loadGroupEmails();

                // Handle the global message that tells this component to prepare a draft of a message
                // to inquire about assessment inaccuracies
                this.$scope.$on( "prepAssessmentEmailToBoard", ( event: ng.IAngularEvent, data: string ) => this.prepBadAssessmentEmailForBoard( data ) );

                if( AppConfig.appShortName === "pta" )
                {
                    this.defaultSubject = "A message from a PTA member";
                    this.memberLabel = "member";
                    this.memberPageName = "Members"
                }
                else
                    this.defaultSubject = "A message from your neighbor";
            }

            this.messageObject.subject = this.defaultSubject;

            this.fellowResidents.getEmailSendAsOptions( this.siteInfo.userInfo ).then( sendAsOptions =>
            {
                this.allSendAsOptions = sendAsOptions;
                this.filteredSendAsOptions = sendAsOptions;
                this.selectedSendAs = sendAsOptions[0]; // getEmailSendAsOptions is guaranteed to return at least one option
            } );
        }


        /**
         * Populate the group email options
         */
        loadGroupEmails()
        {
            this.isLoadingEmail = true;

            this.fellowResidents.getGroupEmailObject().then( ( emailList: Ally.GroupEmailInfo[] ) =>
            {
                this.isLoadingEmail = false;
                this.availableEmailGroups = emailList.filter( e => e.recipientType !== "Treasurer" ); // No need to show treasurer in this list since it's a single person

                if( this.availableEmailGroups.length > 0 )
                {
                    this.defaultMessageRecipient = this.availableEmailGroups[0];
                    this.selectedRecipient = this.availableEmailGroups[0];
                    this.onSelectEmailGroup();
                }
            } );
        }


        /**
         * Setup an email to be sent to the board for assessment issues
         */
        prepBadAssessmentEmailForBoard( emitEventData: string )
        {
            const emitDataParts = emitEventData.split( "|" );
            const assessmentAmount = emitDataParts[0];

            let nextPaymentText = null;
            if( emitDataParts.length > 1 )
                nextPaymentText = emitDataParts[1];

            // Create a message to the board
            this.messageObject.recipientType = "board";

            this.messageObject.subject = "Question About Assessment Amount";

            if( nextPaymentText )
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my next payment of $" + assessmentAmount + " will cover " + nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my assessment payment is $" + assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $INSERT_PROPER_AMOUNT_HERE. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;

            document.getElementById( "send-email-panel" ).scrollIntoView();
        }


        /**
         * Occurs when the user presses the button to send an email to members of the building
         */
        onSendEmailClicked()
        {
            $( "#message-form" ).validate();
            if( !$( "#message-form" ).valid() )
                return;

            this.isLoadingEmail = true;

            // Set this flag so we don't redirect if sending results in a 403
            this.$rootScope.dontHandle403 = true;

            this.messageObject.shouldSendAsBoard = this.selectedSendAs.isBoardOption;
            this.messageObject.shouldSendAsCommitteeId = this.selectedSendAs.committee ? this.selectedSendAs.committee.committeeId : null;

            analytics.track( "sendEmail", {
                recipientId: this.messageObject.recipientType
            } );

            this.$http.post( "/api/Email/v2", this.messageObject ).then(
                () =>
                {
                    this.$rootScope.dontHandle403 = false;
                    this.isLoadingEmail = false;

                    this.messageObject = new HomeEmailMessage();
                    this.selectedRecipient = this.defaultMessageRecipient;
                    this.messageObject.recipientType = this.defaultMessageRecipient.recipientType;
                    this.messageObject.subject = this.defaultSubject;

                    this.onSelectEmailGroup();

                    if( this.committee )
                        this.messageObject.committeeId = this.committee.committeeId;

                    this.showSendConfirmation = true;
                    this.showSendEmail = false;

                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoadingEmail = false;
                    this.$rootScope.dontHandle403 = false;

                    if( httpResponse.status === 403 )
                    {
                        this.showEmailForbidden = true;
                    }
                    else
                        alert( "Unable to send email: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user selects an email group from the drop-down
         */
        onSelectEmailGroup()
        {
            if( !this.selectedRecipient )
                return;

            this.messageObject.recipientType = this.selectedRecipient.recipientType;
            const isCustomRecipientGroup = this.messageObject.recipientType.toUpperCase() === FellowResidentsService.CustomRecipientType;
            this.messageObject.customRecipientShortName = isCustomRecipientGroup ? this.selectedRecipient.recipientTypeName : null;

            this.groupEmailAddress = ( isCustomRecipientGroup ? this.selectedRecipient.recipientTypeName : this.selectedRecipient.recipientType ) + "." + this.siteInfo.publicSiteInfo.shortName + "@inmail." + AppConfig.baseTld;

            // No need to show this right now as the showRestrictedGroupWarning is more clear
            this.showDiscussionEveryoneWarning = false; // this.messageObject.recipientType === "Everyone";

            const isSendingToOwners = this.messageObject.recipientType.toLowerCase().indexOf( "owners" ) !== -1;

            if( !this.showDiscussionEveryoneWarning
                && isSendingToOwners
                && this.siteInfo.privateSiteInfo.numUnits > 30 )
                this.showDiscussionLargeWarning = true;
            else
                this.showDiscussionLargeWarning = false;

            const isSendingToDiscussion = this.messageObject.recipientType.toLowerCase().indexOf( "discussion" ) !== -1;
            const isSendingToBoard = this.messageObject.recipientType.toLowerCase().indexOf( "board" ) !== -1;
            const isSendingToPropMgr = this.messageObject.recipientType.toLowerCase().indexOf( "propertymanagers" ) !== -1;

            this.showDiscussionEveryoneWarning = false;
            this.showDiscussionLargeWarning = false;
            this.showUseDiscussSuggestion = !isSendingToDiscussion && !isSendingToBoard && !isSendingToPropMgr && AppConfig.isChtnSite && !isCustomRecipientGroup;

            this.showRestrictedGroupWarning = this.selectedRecipient.isRestrictedGroup;

            this.filteredSendAsOptions = this.allSendAsOptions;
            if( isSendingToBoard )
            {
                // Users can only send to the board as themselves
                this.filteredSendAsOptions = [this.allSendAsOptions[0]];
                this.selectedSendAs = this.filteredSendAsOptions[0];
            }
        }
    }


    class HomeEmailMessage
    {
        subject: string;
        message: string;
        recipientType: string = "board";
        customRecipientShortName: string;
        committeeId: number;
        shouldSendAsBoard: boolean;
        shouldSendAsCommitteeId: number;
    }
}


CA.angularApp.component( "groupSendEmail", {
    bindings: {
        committee: "<?"
    },
    templateUrl: "/ngApp/common/group-send-email.html",
    controller: Ally.GroupSendEmailController
} );
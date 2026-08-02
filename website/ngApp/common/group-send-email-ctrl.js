var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets members send emails to the group
     */
    class GroupSendEmailController {
        /**
         * The constructor for the class
         */
        constructor($http, fellowResidents, $rootScope, siteInfo, $scope) {
            this.$http = $http;
            this.fellowResidents = fellowResidents;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.isLoadingEmail = false;
            this.messageObject = new HomeEmailMessage();
            this.showDiscussionEveryoneWarning = false;
            this.showDiscussionLargeWarning = false;
            this.showUseDiscussSuggestion = false;
            this.showSendConfirmation = false;
            this.showEmailForbidden = false;
            this.showRestrictedGroupWarning = false;
            this.showSendEmail = true;
            this.groupEmailAddress = "";
            this.defaultSubject = "A message from your neighbor";
            this.memberLabel = "resident";
            this.memberPageName = "Residents";
            this.allSendAsOptions = [];
            this.filteredSendAsOptions = [];
            this.shouldShowGroupMembers = false;
            this.isPremiumPlanActive = false;
            this.isSiteManager = false;
            this.selectedSmsRecipients = [];
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.groupEmailDomain = "inmail." + AppConfig.baseTld;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showSendEmail = true;
            if (this.committee) {
                this.messageObject.committeeId = this.committee.committeeId;
                this.defaultSubject = "A message from a committee member";
            }
            else {
                this.loadGroupEmails();
                // Handle the global message that tells this component to prepare a draft of a message
                // to inquire about assessment inaccuracies
                this.$scope.$on("prepAssessmentEmailToBoard", (event, data) => this.prepBadAssessmentEmailForBoard(data));
                if (AppConfig.appShortName === "pta") {
                    this.defaultSubject = "A message from a PTA member";
                    this.memberLabel = "member";
                    this.memberPageName = "Members";
                }
                else
                    this.defaultSubject = "A message from your neighbor";
            }
            this.messageObject.subject = this.defaultSubject;
            this.fellowResidents.getEmailSendAsOptions(this.siteInfo.userInfo).then(sendAsOptions => {
                this.allSendAsOptions = sendAsOptions;
                this.filteredSendAsOptions = sendAsOptions;
                this.selectedSendAs = sendAsOptions[0]; // getEmailSendAsOptions is guaranteed to return at least one option
            });
        }
        /**
         * Populate the group email options
         */
        loadGroupEmails() {
            this.isLoadingEmail = true;
            this.fellowResidents.getGroupEmailObject().then((emailList) => {
                this.isLoadingEmail = false;
                this.allEmailGroups = emailList;
                this.missingPhoneGroup = this.allEmailGroups.find(g => g.recipientType === Ally.FellowResidentsService.RecipientTypeUnverifiedPhone);
                // No need to show treasurer in this list since it's a single person
                this.availableEmailGroups = emailList.filter(e => e.recipientType !== "Treasurer" && e.shouldShowInHomeWidget);
                if (this.availableEmailGroups.length > 0) {
                    this.defaultMessageRecipient = this.availableEmailGroups[0];
                    this.selectedRecipient = this.availableEmailGroups[0];
                    this.onSelectEmailGroup();
                }
            });
        }
        /**
         * Setup an email to be sent to the board for assessment issues
         */
        prepBadAssessmentEmailForBoard(emitEventData) {
            const emitDataParts = emitEventData.split("|");
            const assessmentAmount = emitDataParts[0];
            let nextPaymentText = null;
            if (emitDataParts.length > 1)
                nextPaymentText = emitDataParts[1];
            // Create a message to the board
            this.messageObject.recipientType = "board";
            this.messageObject.subject = "Question About Assessment Amount";
            if (nextPaymentText)
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my next payment of $" + assessmentAmount + " will cover " + nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my assessment payment is $" + assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $INSERT_PROPER_AMOUNT_HERE. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            document.getElementById("send-email-panel").scrollIntoView();
        }
        /**
         * Occurs when the user presses the button to send an email to members of the building
         */
        onSendEmailClicked() {
            $("#message-form").validate();
            if (!$("#message-form").valid())
                return;
            if (this.messageObject.sendMessageType === "text" && this.selectedSmsRecipients.length === 0) {
                alert("There are no recipients so the message cannot be sent. Please select a different group or change the message type to email.");
                return;
            }
            // Confirm for SMS to be safe
            if (this.messageObject.sendMessageType === "text" && this.selectedSmsRecipients.length > 1) {
                if (!confirm("You are about to send a text message to " + this.selectedSmsRecipients.length + " recipients. Are you sure you want to do this?"))
                    return;
            }
            this.isLoadingEmail = true;
            // Set this flag so we don't redirect if sending results in a 403
            this.$rootScope.dontHandle403 = true;
            this.messageObject.shouldSendAsBoard = this.selectedSendAs.isBoardOption;
            this.messageObject.shouldSendAsCommitteeId = this.selectedSendAs.committee ? this.selectedSendAs.committee.committeeId : null;
            analytics.track("sendEmail", {
                recipientId: this.messageObject.recipientType
            });
            this.$http.post("/api/Email/v2", this.messageObject).then(() => {
                this.$rootScope.dontHandle403 = false;
                this.isLoadingEmail = false;
                this.messageObject = new HomeEmailMessage();
                this.selectedRecipient = this.defaultMessageRecipient;
                this.messageObject.recipientType = this.defaultMessageRecipient.recipientType;
                this.messageObject.subject = this.defaultSubject;
                this.onSelectEmailGroup();
                if (this.committee)
                    this.messageObject.committeeId = this.committee.committeeId;
                this.showSendConfirmation = true;
                this.showSendEmail = false;
            }, (httpResponse) => {
                this.isLoadingEmail = false;
                this.$rootScope.dontHandle403 = false;
                if (httpResponse.status === 403) {
                    alert("There was an error");
                    this.showEmailForbidden = true;
                }
                else
                    alert("Unable to send email: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user selects an email group from the drop-down
         */
        onSelectEmailGroup() {
            if (!this.selectedRecipient)
                return;
            this.messageObject.recipientType = this.selectedRecipient.recipientType;
            const isCustomRecipientGroup = this.messageObject.recipientType.toUpperCase() === Ally.FellowResidentsService.CustomRecipientType;
            this.messageObject.customRecipientShortName = isCustomRecipientGroup ? this.selectedRecipient.recipientTypeName : null;
            this.groupEmailAddress = (isCustomRecipientGroup ? this.selectedRecipient.recipientTypeName : this.selectedRecipient.recipientType) + "." + this.siteInfo.publicSiteInfo.shortName + "@inmail." + AppConfig.baseTld;
            // No need to show this right now as the showRestrictedGroupWarning is more clear
            this.showDiscussionEveryoneWarning = false; // this.messageObject.recipientType === "Everyone";
            const isSendingToOwners = this.messageObject.recipientType.toLowerCase().indexOf("owners") !== -1;
            if (!this.showDiscussionEveryoneWarning
                && isSendingToOwners
                && this.siteInfo.privateSiteInfo.numUnits > 30)
                this.showDiscussionLargeWarning = true;
            else
                this.showDiscussionLargeWarning = false;
            const isSendingToDiscussion = this.messageObject.recipientType.toLowerCase().indexOf("discussion") !== -1;
            const isSendingToBoard = this.messageObject.recipientType.toLowerCase().indexOf("board") !== -1;
            const isSendingToPropMgr = this.messageObject.recipientType.toLowerCase().indexOf("propertymanagers") !== -1;
            const isSendingToUnverifiedPhone = this.messageObject.recipientType === Ally.FellowResidentsService.RecipientTypeUnverifiedPhone;
            this.showDiscussionEveryoneWarning = false;
            this.showDiscussionLargeWarning = false;
            this.showUseDiscussSuggestion = !isSendingToDiscussion && !isSendingToBoard && !isSendingToPropMgr && AppConfig.isChtnSite && !isCustomRecipientGroup && !isSendingToUnverifiedPhone;
            this.showRestrictedGroupWarning = this.selectedRecipient.isRestrictedGroup;
            this.filteredSendAsOptions = this.allSendAsOptions;
            if (isSendingToBoard) {
                // Users can only send to the board as themselves
                this.filteredSendAsOptions = [this.allSendAsOptions[0]];
                this.selectedSendAs = this.filteredSendAsOptions[0];
            }
            // Filter the list of SMS recipients based on the selected email group
            this.fellowResidents.getResidents().then((residents) => {
                const hasCorrectNotificationLevel = (r) => {
                    if (this.messageObject.smsPriority === "emergency")
                        return r.smsReceiveLevel === "emergency";
                    else if (this.messageObject.smsPriority === "notification")
                        return r.smsReceiveLevel === "emergency" || r.smsReceiveLevel === "notification";
                    return false;
                };
                this.selectedSmsRecipients = residents.filter(r => this.selectedRecipient.memberUserIds.includes(r.userId) && r.hasSmsConsent && hasCorrectNotificationLevel(r));
            });
        }
        onSendTypeChange() {
            console.log("onSendTypeChange", this.messageObject.sendMessageType);
            if (this.messageObject.sendMessageType === "text" && !this.messageObject.message) {
                if (AppConfig.appShortName === "condo")
                    this.messageObject.message = "Message from your condo association:\n[ENTER YOUR MESSAGE HERE]\n*Replies are not monitored*";
                else if (AppConfig.appShortName === "hoa")
                    this.messageObject.message = "Message from your HOA:\n[ENTER YOUR MESSAGE HERE]\n*Replies are not monitored*";
                else if (AppConfig.appShortName === "neighborhood")
                    this.messageObject.message = "Message from your neighborhood group:\n[ENTER YOUR MESSAGE HERE]\n*Replies are not monitored*";
            }
        }
        prepopulateMessageForUnverifiedPhone() {
            if (!this.missingPhoneGroup) {
                alert("Unable to find the group for unverified phone numbers. Please contact support.");
                return;
            }
            if (!this.missingPhoneGroup.shouldShowInHomeWidget) {
                this.missingPhoneGroup.shouldShowInHomeWidget = true;
                this.availableEmailGroups.push(this.missingPhoneGroup);
            }
            this.selectedRecipient = this.missingPhoneGroup;
            this.onSelectEmailGroup();
            this.messageObject.sendMessageType = "email";
            this.messageObject.subject = "A message from your board - Consider verifying your phone number";
            this.messageObject.message = `Hello,\n\nYour phone number is not verified in the system so it is not eligible to receive important text messages. Please visit your profile page to verify your phone number: ${this.siteInfo.publicSiteInfo.baseUrl}/#!/MyProfile`;
            this.messageObject.shouldSendAsBoard = true;
            this.selectedSendAs = this.filteredSendAsOptions.find(o => o.isBoardOption);
        }
    }
    GroupSendEmailController.$inject = ["$http", "fellowResidents", "$rootScope", "SiteInfo", "$scope"];
    Ally.GroupSendEmailController = GroupSendEmailController;
    class HomeEmailMessage {
        constructor() {
            this.sendMessageType = "email";
            this.subject = "";
            this.message = "";
            this.recipientType = "board";
            this.customRecipientShortName = "";
            this.committeeId = null;
            this.shouldSendAsBoard = false;
            this.shouldSendAsCommitteeId = null;
            this.smsPriority = "notification";
        }
    }
})(Ally || (Ally = {}));
CA.angularApp.component("groupSendEmail", {
    bindings: {
        committee: "<?"
    },
    templateUrl: "/ngApp/common/group-send-email.html",
    controller: Ally.GroupSendEmailController
});

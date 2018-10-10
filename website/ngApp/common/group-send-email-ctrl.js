var Ally;
(function (Ally) {
    var SendEmailRecpientEntry = /** @class */ (function () {
        function SendEmailRecpientEntry() {
        }
        return SendEmailRecpientEntry;
    }());
    var HomeEmailMessage = /** @class */ (function () {
        function HomeEmailMessage() {
            this.recipientType = "board";
        }
        return HomeEmailMessage;
    }());
    /**
     * The controller for the widget that lets members send e-mails to the group
     */
    var GroupSendEmailController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupSendEmailController($http, fellowResidents, $rootScope, siteInfo, $scope) {
            this.$http = $http;
            this.fellowResidents = fellowResidents;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.isLoadingEmail = false;
            this.defaultMessageRecipient = "board";
            this.showDiscussionEveryoneWarning = false;
            this.showDiscussionLargeWarning = false;
            this.showUseDiscussSuggestion = false;
            this.showSendConfirmation = false;
            this.showEmailForbidden = false;
            this.showRestrictedGroupWarning = false;
            this.defaultSubject = "A message from your neighbor";
            this.memberLabel = "resident";
            this.memberPageName = "Residents";
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        GroupSendEmailController.prototype.$onInit = function () {
            var _this = this;
            this.groupEmailDomain = "inmail." + AppConfig.baseTld;
            this.messageObject = new HomeEmailMessage();
            this.showSendEmail = true;
            if (this.committee) {
                this.messageObject.committeeId = this.committee.committeeId;
                this.defaultSubject = "A message from a committee member";
            }
            else {
                this.loadGroupEmails();
                // Handle the global message that tells this component to prepare a draft of a message
                // to inquire about assessment inaccuracies
                this.$scope.$on("prepAssessmentEmailToBoard", function (event, data) { return _this.prepBadAssessmentEmailForBoard(data); });
                if (AppConfig.appShortName === "pta") {
                    this.defaultSubject = "A message from a PTA member";
                    this.memberLabel = "member";
                    this.memberPageName = "Members";
                }
                else
                    this.defaultSubject = "A message from your neighbor";
            }
            this.messageObject.subject = this.defaultSubject;
        };
        /**
         * Populate the group e-mail options
         */
        GroupSendEmailController.prototype.loadGroupEmails = function () {
            this.isLoadingEmail = true;
            var innerThis = this;
            this.fellowResidents.getGroupEmailObject().then(function (emailList) {
                innerThis.isLoadingEmail = false;
                innerThis.availableEmailGroups = emailList;
                if (innerThis.availableEmailGroups.length > 0) {
                    innerThis.defaultMessageRecipient = innerThis.availableEmailGroups[0].recipientType;
                    innerThis.messageObject.recipientType = innerThis.defaultMessageRecipient;
                    innerThis.onSelectEmailGroup();
                }
            });
        };
        /**
         * Setup an e-mail to be sent to the board for assessment issues
         */
        GroupSendEmailController.prototype.prepBadAssessmentEmailForBoard = function (emitEventData) {
            var emitDataParts = emitEventData.split("|");
            var assessmentAmount = emitDataParts[0];
            var nextPaymentText = null;
            if (emitDataParts.length > 1)
                nextPaymentText = emitDataParts[1];
            // Create a message to the board
            this.messageObject.recipientType = "board";
            this.messageObject.subject = "Question About Assessment Amount";
            if (nextPaymentText)
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my next payment of $" + assessmentAmount + " will cover " + nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my assessment payment is $" + assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $[INSERT PROPER AMOUNT HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            document.getElementById("send-email-panel").scrollIntoView();
        };
        /**
         * Occurs when the user presses the button to send an e-mail to members of the building
         */
        GroupSendEmailController.prototype.onSendEmail = function () {
            var _this = this;
            $("#message-form").validate();
            if (!$("#message-form").valid())
                return;
            this.isLoadingEmail = true;
            // Set this flag so we don't redirect if sending results in a 403
            this.$rootScope.dontHandle403 = true;
            analytics.track("sendEmail", {
                recipientId: this.messageObject.recipientType
            });
            this.$http.post("/api/Email/v2", this.messageObject).then(function () {
                _this.$rootScope.dontHandle403 = false;
                _this.isLoadingEmail = false;
                _this.messageObject = new HomeEmailMessage();
                _this.messageObject.recipientType = _this.defaultMessageRecipient;
                _this.messageObject.subject = _this.defaultSubject;
                if (_this.committee)
                    _this.messageObject.committeeId = _this.committee.committeeId;
                _this.showSendConfirmation = true;
                _this.showSendEmail = false;
            }, function (httpResponse) {
                _this.isLoadingEmail = false;
                _this.$rootScope.dontHandle403 = false;
                if (httpResponse.status === 403) {
                    _this.showEmailForbidden = true;
                }
                else
                    alert("Unable to send e-mail, please contact technical support.");
            });
        };
        /**
         * Occurs when the user selects an e-mail group from the drop-down
         */
        GroupSendEmailController.prototype.onSelectEmailGroup = function () {
            var _this = this;
            var shortName = HtmlUtil.getSubdomain(window.location.host).toLowerCase();
            this.groupEmailAddress = this.messageObject.recipientType + "." + shortName + "@inmail." + AppConfig.baseTld;
            // No need to show this right now as the showRestrictedGroupWarning is more clear
            this.showDiscussionEveryoneWarning = false; // this.messageObject.recipientType === "Everyone";
            var isSendingToOwners = this.messageObject.recipientType.toLowerCase().indexOf("owners") !== -1;
            if (!this.showDiscussionEveryoneWarning
                && isSendingToOwners
                && this.siteInfo.privateSiteInfo.numUnits > 30)
                this.showDiscussionLargeWarning = true;
            else
                this.showDiscussionLargeWarning = false;
            var isSendingToDiscussion = this.messageObject.recipientType.toLowerCase().indexOf("discussion") !== -1;
            var isSendingToBoard = this.messageObject.recipientType.toLowerCase().indexOf("board") !== -1;
            this.showDiscussionEveryoneWarning = false;
            this.showDiscussionLargeWarning = false;
            this.showUseDiscussSuggestion = !isSendingToDiscussion && !isSendingToBoard && AppConfig.isChtnSite;
            var groupInfo = _.find(this.availableEmailGroups, function (g) { return g.recipientType === _this.messageObject.recipientType; });
            this.showRestrictedGroupWarning = groupInfo.isRestrictedGroup;
        };
        GroupSendEmailController.$inject = ["$http", "fellowResidents", "$rootScope", "SiteInfo", "$scope"];
        return GroupSendEmailController;
    }());
    Ally.GroupSendEmailController = GroupSendEmailController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupSendEmail", {
    bindings: {
        committee: "<?"
    },
    templateUrl: "/ngApp/common/group-send-email.html",
    controller: Ally.GroupSendEmailController
});

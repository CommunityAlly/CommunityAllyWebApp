var Ally;
(function (Ally) {
    var SendEmailRecpientEntry = /** @class */ (function () {
        function SendEmailRecpientEntry() {
        }
        return SendEmailRecpientEntry;
    }());
    var HomeEmailMessage = /** @class */ (function () {
        function HomeEmailMessage() {
            this.subject = "A message from your neighbor";
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
            this.messageObject = new HomeEmailMessage();
            this.defaultMessageRecipient = "board";
            this.showDiscussionEveryoneWarning = false;
            this.showDiscussionLargeWarning = false;
            this.showSendConfirmation = false;
            this.showEmailForbidden = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        GroupSendEmailController.prototype.$onInit = function () {
            // The object that contains a message if the user wants to send one out
            this.messageObject = new HomeEmailMessage();
            this.showSendEmail = true;
            this.loadGroupEmails();
            var innerThis = this;
            this.$scope.$on("prepAssessmentEmailToBoard", function (event, data) { return innerThis.prepBadAssessmentEmailForBoard(data); });
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
            $("#message-form").validate();
            if (!$("#message-form").valid())
                return;
            this.isLoadingEmail = true;
            this.$rootScope.dontHandle403 = true;
            analytics.track("sendEmail", {
                recipientId: this.messageObject.recipientType
            });
            var innerThis = this;
            this.$http.post("/api/Email/v2", this.messageObject).then(function () {
                innerThis.$rootScope.dontHandle403 = false;
                innerThis.isLoadingEmail = false;
                innerThis.messageObject = new HomeEmailMessage();
                innerThis.messageObject.recipientType = innerThis.defaultMessageRecipient;
                innerThis.showSendConfirmation = true;
                innerThis.showSendEmail = false;
            }, function (httpResponse) {
                innerThis.isLoadingEmail = false;
                innerThis.$rootScope.dontHandle403 = false;
                if (httpResponse.status === 403) {
                    innerThis.showEmailForbidden = true;
                }
                else
                    alert("Unable to send e-mail, please contact technical support.");
            });
        };
        /**
         * Occurs when the user selects an e-mail group from the drop-down
         */
        GroupSendEmailController.prototype.onSelectEmailGroup = function () {
            var shortName = HtmlUtil.getSubdomain(window.location.host).toLowerCase();
            this.groupEmailAddress = this.messageObject.recipientType + "." + shortName + "@inmail.condoally.com";
            this.showDiscussionEveryoneWarning = this.messageObject.recipientType === "everyone";
            var isSendingToOwners = this.messageObject.recipientType.toLowerCase().indexOf("owners") !== -1;
            if (!this.showDiscussionEveryoneWarning
                && isSendingToOwners
                && this.siteInfo.privateSiteInfo.numUnits > 30)
                this.showDiscussionLargeWarning = true;
            else
                this.showDiscussionLargeWarning = false;
        };
        GroupSendEmailController.$inject = ["$http", "fellowResidents", "$rootScope", "SiteInfo", "$scope"];
        return GroupSendEmailController;
    }());
    Ally.GroupSendEmailController = GroupSendEmailController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupSendEmail", {
    templateUrl: "/ngApp/common/group-send-email.html",
    controller: Ally.GroupSendEmailController
});

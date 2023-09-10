var Ally;
(function (Ally) {
    /**
     * The controller for the PTA Ally home page
     */
    class PtaGroupHomeController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo, $timeout, appCacheService) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.appCacheService = appCacheService;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.isFirstVisit = this.siteInfo.userInfo.lastLoginDateUtc === null;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showFirstVisitModal = this.isFirstVisit && !this.$rootScope.hasClosedFirstVisitModal && this.siteInfo.privateSiteInfo.siteLaunchedDateUtc === null;
            this.homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType;
            if (!this.homeRightColumnType)
                this.homeRightColumnType = "localnews";
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            this.allyAppName = AppConfig.appName;
            // The object that contains a message if the user wants to send one out
            this.messageObject = {};
            // If the user lives in a unit and assessments are enabled
            if (this.siteInfo.privateSiteInfo.assessmentFrequency !== null
                && this.siteInfo.userInfo.usersUnits !== null
                && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.paymentInfo.paymentType = "periodic";
                if (this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                    this.knowsNextPayment = true;
                    this.errorPayInfoText = "Is the amount or date incorrect?";
                    this.nextPaymentText = this.getNextPaymentText([this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue], this.siteInfo.privateSiteInfo.assessmentFrequency);
                    this.updatePaymentText();
                }
            }
        }
        // Refresh the not text for the payment field
        updatePaymentText() {
            if (this.paymentInfo.paymentType === "periodic" && this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                // If we have a next payment string
                if (!HtmlUtil.isNullOrWhitespace(this.nextPaymentText)) {
                    if (this.siteInfo.userInfo.usersUnits[0].includesLateFee)
                        this.paymentInfo.note = "Assessment payment with late fee for ";
                    else
                        this.paymentInfo.note = "Assessment payment for ";
                    this.paymentInfo.note += this.nextPaymentText;
                }
            }
            else {
                this.paymentInfo.note = "";
            }
        }
        onSelectPaymentType(paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType === "periodic" ? this.siteInfo.userInfo.assessmentAmount : 0;
            this.updatePaymentText();
        }
        getNextPaymentText(payPeriods, assessmentFrequency) {
            if (payPeriods === null)
                return "";
            // Ensure the periods is an array
            if (payPeriods.constructor !== Array)
                payPeriods = [payPeriods];
            var paymentText = "";
            var frequencyInfo = FrequencyIdToInfo(assessmentFrequency);
            for (var periodIndex = 0; periodIndex < payPeriods.length; ++periodIndex) {
                var curPeriod = payPeriods[periodIndex];
                if (frequencyInfo.intervalName === "month") {
                    var monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
                    paymentText = monthNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "quarter") {
                    var quarterNames = ["Q1", "Q2", "Q3", "Q4"];
                    paymentText = quarterNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "half-year") {
                    var halfYearNames = ["First Half", "Second Half"];
                    paymentText = halfYearNames[curPeriod.period - 1];
                }
                paymentText += " " + curPeriod.year;
                this.paymentInfo.paysFor = [curPeriod];
            }
            return paymentText;
        }
        hideFirstVisit() {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        }
        onIncorrectPayDetails() {
            // Create a message to the board
            this.messageObject.recipientType = "board";
            if (this.knowsNextPayment)
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " will cover " + this.nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my assessment payment is $" + this.siteInfo.userInfo.assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $[INSERT PROPER AMOUNT HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            document.getElementById("send-email-panel").scrollIntoView();
        }
    }
    PtaGroupHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
    Ally.PtaGroupHomeController = PtaGroupHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("ptaGroupHome", {
    templateUrl: "/ngApp/pta/pta-group-home.html",
    controller: Ally.PtaGroupHomeController
});

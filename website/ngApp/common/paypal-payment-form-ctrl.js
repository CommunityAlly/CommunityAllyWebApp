var Ally;
(function (Ally) {
    class PaymentInfo {
    }
    /**
     * The controller for the widget that lets residents pay their assessments
     */
    class PayPalPaymentFormController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.returnUrl = "https://localtest.mycondoally.com/#!/Home";
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            // Grab the assessment from the user's unit (TODO handle multiple units)
            if (this.siteInfo.userInfo.usersUnits != null && this.siteInfo.userInfo.usersUnits.length > 0)
                this.assessmentAmount = this.siteInfo.userInfo.usersUnits[0].assessment;
            else
                this.assessmentAmount = 0;
            this.errorPayInfoText = "Is the amount incorrect?";
            this.paymentInfo =
                {
                    paymentType: "other",
                    amount: this.assessmentAmount,
                    note: "",
                    fundingType: null,
                    paysFor: null
                };
            const MaxNumRecentPayments = 6;
            this.recentPayments = []; // this.siteInfo.userInfo.recentPayments;
            if (this.recentPayments && this.recentPayments.length > 0) {
                if (this.recentPayments.length > MaxNumRecentPayments)
                    this.recentPayments = this.recentPayments.slice(0, MaxNumRecentPayments);
                // Fill up the list so there's always MaxNumRecentPayments
                while (this.recentPayments.length < MaxNumRecentPayments)
                    this.recentPayments.push({});
            }
            // If the user lives in a unit and assessments are enabled
            if (this.siteInfo.privateSiteInfo.assessmentFrequency != null
                && this.siteInfo.userInfo.usersUnits != null
                && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.paymentInfo.paymentType = "periodic";
                if (this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                    this.knowsNextPayment = true;
                    this.errorPayInfoText = "Is the amount or date incorrect?";
                    this.nextPaymentText = this.getNextPaymentText([this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue], this.siteInfo.privateSiteInfo.assessmentFrequency);
                    this.updatePaymentText();
                }
            }
            setTimeout(() => {
                $('#btn_view_pay_history').click(function () {
                    $('#pm_info').collapse('hide');
                    $('#payment_history').collapse('show');
                });
                $('#btn_view_pay_info').click(function () {
                    $('#payment_history').collapse('hide');
                    $('#pm_info').collapse('show');
                });
                $('.hide').click(function () {
                    $(this).parent().hide('');
                });
            }, 400);
            paypal.Button.render({
                //env: "production",
                env: "sandbox",
                commit: true,
                style: {
                    color: 'gold',
                    size: 'medium'
                },
                client: {
                    sandbox: null,
                    production: "AW51-dH9dRrczrhVVf1kZyavtifN8z23Q0BTJwpWcTJQL6YoqGCTwOb0JfbCHTJIA_usIXAgrxwQ7osQ"
                },
                payment: (data, actions) => {
                    this.isLoading = true;
                    /*
                     * Set up the payment here
                     */
                    return actions.payment.create({
                        payment: {
                            transactions: [
                                {
                                    amount: { total: this.paymentInfo.amount.toString(), currency: 'USD' }
                                }
                            ]
                        }
                    });
                },
                onAuthorize: (data, actions) => {
                    /*
                     * Execute the payment here
                     */
                    return actions.payment.execute().then((payment) => {
                        // The payment is complete!
                        // Tell the server about payment.id with memo
                        const memoInfo = {
                            PayPalCheckoutId: payment.id,
                            Memo: this.paymentInfo.note
                        };
                        this.isLoading = true;
                        this.$http.put("/api/OnlinePayment/SetMemo", memoInfo).then(() => //( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                         {
                            this.isLoading = false;
                        }, (httpResponse) => {
                            this.isLoading = false;
                            alert("Failed to save: " + httpResponse.data.exceptionMessage);
                        });
                        // You can now show a confirmation message to the customer
                    });
                },
                onCancel: (data, actions) => {
                    console.log("PayPal cancel", data, actions);
                    this.isLoading = false;
                    /*
                     * Buyer canceled the payment
                     */
                },
                onError: (err) => {
                    console.log("PayPal error", err);
                    this.isLoading = false;
                    /*
                     * An error occurred during the transaction
                     */
                }
            }, "#paypal-button");
        }
        /**
         * Occurs when the user clicks the helper link to prep an email to inquire the board as to
         * why their records don't line up.
         */
        onIncorrectPayDetails() {
            // Get the friendly looking assessment value (ex: 100, 101, 102.50)
            let amountString = this.assessmentAmount.toString();
            if (Math.round(this.assessmentAmount) != this.assessmentAmount)
                amountString = this.assessmentAmount.toFixed(2);
            // Tell the groupSendEmail component to prep an email for the board
            let prepEventData = amountString;
            if (this.knowsNextPayment && HtmlUtil.isValidString(this.nextPaymentText))
                prepEventData += "|" + this.nextPaymentText;
            this.$rootScope.$broadcast("prepAssessmentEmailToBoard", prepEventData);
        }
        /**
         * Generate the friendly string describing to what the member's next payment applies
         */
        getNextPaymentText(payPeriods, assessmentFrequency) {
            if (payPeriods == null)
                return "";
            // Ensure the periods is an array
            if (payPeriods.constructor !== Array)
                payPeriods = [payPeriods];
            let paymentText = "";
            const frequencyInfo = PaymentFrequencyIdToInfo(assessmentFrequency);
            for (let periodIndex = 0; periodIndex < payPeriods.length; ++periodIndex) {
                const curPeriod = payPeriods[periodIndex];
                if (frequencyInfo.intervalName === "month") {
                    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
                    paymentText = monthNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "quarter") {
                    const periodNames = ["Q1", "Q2", "Q3", "Q4"];
                    paymentText = periodNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "half-year") {
                    const periodNames = ["First Half", "Second Half"];
                    paymentText = periodNames[curPeriod.period - 1];
                }
                paymentText += " " + curPeriod.year;
                this.paymentInfo.paysFor = [curPeriod];
            }
            return paymentText;
        }
        /**
         * Occurs when the user selects a payment type radio button
         */
        onSelectPaymentType(paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType == "periodic" ? this.assessmentAmount : 0;
            this.updatePaymentText();
        }
        /**
         * Refresh the note text for the payment field
         */
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
    }
    PayPalPaymentFormController.$inject = ["$http", "SiteInfo", "$rootScope"];
    Ally.PayPalPaymentFormController = PayPalPaymentFormController;
})(Ally || (Ally = {}));
CA.angularApp.component("paypalPaymentForm", {
    templateUrl: "/ngApp/common/paypal-payment-form.html",
    controller: Ally.PayPalPaymentFormController
});

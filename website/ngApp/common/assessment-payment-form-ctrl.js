var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets residents pay their assessments
     */
    var AssessmentPaymentFormController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function AssessmentPaymentFormController($http, siteInfo, $rootScope, $sce) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$rootScope = $rootScope;
            this.$sce = $sce;
            this.isLoading_Payment = false;
            this.showParagon = false;
            this.showParagonCheckingSignUpModal = false;
            this.showParagonCreditSignUpModal = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        AssessmentPaymentFormController.prototype.$onInit = function () {
            this.showParagon = false; //this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.emailAddress === "president@mycondoally.com";
            this.paragonPaymentParams = "&BillingAddress1=" + encodeURIComponent("900 W Ainslie St") + "&BillingState=Illinois&BillingCity=Chicago&BillingZip=60640&FirstName=" + encodeURIComponent(this.siteInfo.userInfo.firstName) + "&LastName=" + encodeURIComponent(this.siteInfo.userInfo.lastName);
            this.paragonCheckingLast4 = this.siteInfo.userInfo.paragonCheckingLast4;
            this.paragonCardLast4 = this.siteInfo.userInfo.paragonCardLast4;
            this.allyAppName = AppConfig.appName;
            this.isAutoPayActive = this.siteInfo.userInfo.isAutoPayActive;
            this.assessmentCreditCardFeeLabel = this.siteInfo.privateSiteInfo.payerPaysCCFee ? "Service fee applies" : "No service fee";
            this.assessmentAchFeeLabel = this.siteInfo.privateSiteInfo.payerPaysAchFee ? "Service fee applies" : "No service fee";
            this.payerPaysAchFee = this.siteInfo.privateSiteInfo.payerPaysAchFee;
            this.errorPayInfoText = "Is the amount incorrect?";
            this.isWePaySetup = this.siteInfo.privateSiteInfo.isPaymentEnabled;
            this.hasAssessments = this.siteInfo.privateSiteInfo.hasAssessments;
            this.assessmentFrequency = this.siteInfo.privateSiteInfo.assessmentFrequency;
            if (!this.isAutoPayActive && HtmlUtil.isNumericString(HtmlUtil.GetQueryStringParameter("preapproval_id"))) {
                // The user just set up auto-pay and it may take a second
                this.isAutoPayActive = true;
            }
            this.nextAutoPayText = this.siteInfo.userInfo.nextAutoPayText;
            // Grab the assessment from the user's unit (TODO handle multiple units)
            if (this.siteInfo.userInfo.usersUnits != null && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.assessmentAmount = this.siteInfo.userInfo.usersUnits[0].assessment;
            }
            else
                this.assessmentAmount = 0;
            this.paymentInfo =
                {
                    paymentType: "other",
                    amount: this.assessmentAmount,
                    note: "",
                    fundingType: null
                };
            var MaxNumRecentPayments = 6;
            this.recentPayments = this.siteInfo.userInfo.recentPayments;
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
            setTimeout(function () {
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
        };
        /**
         * Display the Paragon payment sign-up modal, with pre-population of data
         */
        AssessmentPaymentFormController.prototype.showParagonSignUp = function () {
            var _this = this;
            this.showParagonCheckingSignUpModal = true;
            if (this.paragonSignUpInfo)
                return;
            // Pre-populate the user's info
            this.isLoading_Payment = true;
            this.$http.get("/api/Paragon/SignUpPrefill").then(function (response) {
                _this.isLoading_Payment = false;
                _this.paragonSignUpInfo = response.data;
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                _this.paragonSignUpInfo = new ParagonPayerSignUpInfo();
            });
        };
        /**
         * Submit the user's Paragon bank account information
         */
        AssessmentPaymentFormController.prototype.showParagonCreditSignUp = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.paragonCardTokenizedUrl = null;
            this.paragonCardTokenizationMessage = "Connecting...";
            this.showParagonCreditSignUpModal = true;
            //this.paragonCardTokenizedUrl = this.$sce.trustAsResourceUrl( "https://login.mycondoally.com/api/PublicParagon/FinishCardTokenization2" );
            //this.isLoading_Payment = false;
            this.$http.get("/api/Paragon/CardTokenizationKey").then(function (response) {
                _this.isLoading_Payment = false;
                _this.paragonCardTokenizedUrl = _this.$sce.trustAsResourceUrl("https://stage.paragonsolutions.com/ws/hosted.aspx?Username=54cE7DU2p%2bBh7h9uwJWW8Q%3d%3d&Password=jYvmN41tt1lz%2bpiazUqQYK9Abl73Z%2bHoBG4vOZImo%2bYlKTbPeNPwOcMB0%2bmIS3%2bs&MerchantKey=1293&InvNum=" + response.data);
                _this.paragonCardTokenizationMessage = null;
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                _this.paragonCardTokenizationMessage = "There was an error connecting to the server. Please close this window and try again. If this has happened more than once please contact support.";
            });
        };
        /**
         * Hide the paragon window, reloading the page if needed
         */
        AssessmentPaymentFormController.prototype.hideParagonCreditSignUp = function () {
            this.showParagonCreditSignUpModal = false;
            // Reload the page to refresh the payment info
            if (this.paragonCardTokenizedUrl)
                window.location.reload();
        };
        /**
         * Submit the user's Paragon bank account information
         */
        AssessmentPaymentFormController.prototype.submitParagonSignUp = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.paragonSignUpError = null;
            this.$http.post("/api/Paragon/CheckPaymentSignUp", this.paragonSignUpInfo).then(function (response) {
                // Reload the page to refresh the payment info. We don't really need to do this,
                // but makes sure the UI is up to date a little better as well updates the
                // siteInfo object.
                window.location.reload();
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                _this.paragonSignUpError = errorResponse.data.exceptionMessage;
            });
        };
        /**
         * Submit the user's Paragon bank account information
         */
        AssessmentPaymentFormController.prototype.submitParagonPayment = function (paySource) {
            var _this = this;
            if (!confirm("This will submit payment."))
                return;
            this.paragonPaymentMessage = null;
            var paymentInfo = new ParagonNewPaymentInfo();
            paymentInfo.notes = this.paymentInfo.note;
            paymentInfo.paymentAmount = this.paymentInfo.amount;
            paymentInfo.paysFor = this.paymentInfo.paysFor;
            paymentInfo.paySource = paySource;
            this.isLoading_Payment = true;
            this.$http.post("/api/Paragon/MakePayment", paymentInfo).then(function (response) {
                _this.isLoading_Payment = false;
                _this.paragonPaymentMessage = "Payment Successfully Processed";
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                _this.paragonPaymentMessage = errorResponse.data.exceptionMessage;
            });
        };
        /**
         * Un-enroll a certain payment source from Paragon payments
         */
        AssessmentPaymentFormController.prototype.unenrollParagonAccount = function (paySource) {
            var _this = this;
            this.isLoading_Payment = true;
            this.$http.get("/api/Paragon/UnenrollPayment?paySource=" + paySource).then(function (response) {
                // Reload the page to see the change
                window.location.reload();
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to un-enroll: " + errorResponse.data.exceptionMessage);
                _this.paragonPaymentMessage = errorResponse.data.exceptionMessage;
            });
        };
        /**
         * Occurs when the user presses the button to make a payment to their organization
         */
        AssessmentPaymentFormController.prototype.makePayment = function (fundingTypeName) {
            this.isLoading_Payment = true;
            this.paymentInfo.fundingType = fundingTypeName;
            // Remove leading dollar signs
            if (HtmlUtil.isValidString(this.paymentInfo.amount) && this.paymentInfo.amount[0] === '$')
                this.paymentInfo.amount = this.paymentInfo.amount.substr(1);
            analytics.track("makePayment", {
                fundingType: fundingTypeName
            });
            var innerThis = this;
            this.$http.post("/api/WePayPayment", this.paymentInfo).then(function (httpResponse) {
                var checkoutInfo = httpResponse.data;
                if (checkoutInfo !== null && typeof (checkoutInfo.checkoutUri) === "string" && checkoutInfo.checkoutUri.length > 0)
                    window.location.href = checkoutInfo.checkoutUri;
                else {
                    innerThis.isLoading_Payment = false;
                    alert("Unable to initiate WePay checkout");
                }
            }, function (httpResponse) {
                innerThis.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the helper link to prep an e-mail to inquire the board as to
         * why their records don't line up.
         */
        AssessmentPaymentFormController.prototype.onIncorrectPayDetails = function () {
            // Get the friendly looking assessment value (ex: 100, 101, 102.50)
            var amountString = this.assessmentAmount.toString();
            if (Math.round(this.assessmentAmount) != this.assessmentAmount)
                amountString = this.assessmentAmount.toFixed(2);
            // Tell the groupSendEmail component to prep an e-mail for the board
            var prepEventData = amountString;
            if (this.knowsNextPayment && HtmlUtil.isValidString(this.nextPaymentText))
                prepEventData += "|" + this.nextPaymentText;
            this.$rootScope.$broadcast("prepAssessmentEmailToBoard", prepEventData);
        };
        /**
         * Refresh the note text for the payment field
         */
        AssessmentPaymentFormController.prototype.updatePaymentText = function () {
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
        };
        /**
         * Occurs when the user selects a payment type radio button
         */
        AssessmentPaymentFormController.prototype.onSelectPaymentType = function (paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType == "periodic" ? this.assessmentAmount : 0;
            this.updatePaymentText();
        };
        /**
         * Generate the friendly string describing to what the member's next payment applies
         */
        AssessmentPaymentFormController.prototype.getNextPaymentText = function (payPeriods, assessmentFrequency) {
            if (payPeriods == null)
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
                    var periodNames = ["Q1", "Q2", "Q3", "Q4"];
                    paymentText = periodNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "half-year") {
                    var periodNames = ["First Half", "Second Half"];
                    paymentText = periodNames[curPeriod.period - 1];
                }
                paymentText += " " + curPeriod.year;
                this.paymentInfo.paysFor = [curPeriod];
            }
            return paymentText;
        };
        /**
         * Occurs when the user presses the button to setup auto-pay for assessments
         */
        AssessmentPaymentFormController.prototype.onSetupAutoPay = function (fundingTypeName) {
            var _this = this;
            this.isLoading_Payment = true;
            this.$http.get("/api/WePayPayment/SetupAutoPay?fundingType=" + fundingTypeName).then(function (httpResponse) {
                var redirectUrl = httpResponse.data;
                if (typeof (redirectUrl) === "string" && redirectUrl.length > 0)
                    window.location.href = redirectUrl;
                else {
                    _this.isLoading_Payment = false;
                    alert("Unable to initiate WePay auto-pay setup");
                }
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the button to disable auto-pay
         */
        AssessmentPaymentFormController.prototype.onDisableAutoPay = function () {
            var _this = this;
            if (!confirm("Just to double check, this will disable your auto-payment. You need to make sure to manually make your regular payments to avoid any late fees your association may enforce."))
                return;
            this.isLoading_Payment = true;
            this.$http.get("/api/WePayPayment/DisableAutoPay").then(function () {
                _this.isLoading_Payment = false;
                _this.isAutoPayActive = false;
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.$inject = ["$http", "SiteInfo", "$rootScope", "$sce"];
        return AssessmentPaymentFormController;
    }());
    Ally.AssessmentPaymentFormController = AssessmentPaymentFormController;
})(Ally || (Ally = {}));
CA.angularApp.component("assessmentPaymentForm", {
    templateUrl: "/ngApp/common/assessment-payment-form.html",
    controller: Ally.AssessmentPaymentFormController
});
var ParagonPayerSignUpInfo = /** @class */ (function () {
    function ParagonPayerSignUpInfo() {
        this.billingAddress = new Ally.FullAddress();
        this.checkType = "PERSONAL";
        this.accountType = "CHECKING";
    }
    return ParagonPayerSignUpInfo;
}());
var ParagonNewPaymentInfo = /** @class */ (function () {
    function ParagonNewPaymentInfo() {
    }
    return ParagonNewPaymentInfo;
}());

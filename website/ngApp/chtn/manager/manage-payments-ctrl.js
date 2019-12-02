var Ally;
(function (Ally) {
    var PaymentPageInfo = /** @class */ (function () {
        function PaymentPageInfo() {
        }
        return PaymentPageInfo;
    }());
    var UpdateAssessmentInfo = /** @class */ (function () {
        function UpdateAssessmentInfo() {
        }
        return UpdateAssessmentInfo;
    }());
    /**
     * The controller for the page to view online payment information
     */
    var ManagePaymentsController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ManagePaymentsController($http, siteInfo, appCacheService) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.PaymentHistory = [];
            this.message = "";
            this.showPaymentPage = true; //AppConfig.appShortName === "condo";
            this.PeriodicPaymentFrequencies = PeriodicPaymentFrequencies;
            this.AssociationPaysAch = true;
            this.AssociationPaysCC = false; // Payer pays credit card fees
            this.lateFeeInfo = {};
            this.hasLoadedPage = false;
            this.isLoading = false;
            this.isLoadingUnits = false;
            this.isLoadingPayment = false;
            this.isLoadingLateFee = false;
            this.isLoadingCheckoutDetails = false;
            this.allowNewWePaySignUp = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManagePaymentsController.prototype.$onInit = function () {
            this.highlightWePayCheckoutId = this.appCacheService.getAndClear("hwpid");
            this.isAssessmentTrackingEnabled = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled;
            // Allow a single HOA to try WePay
            var exemptGroupShortNames = ["tigertrace", "7mthope"];
            this.allowNewWePaySignUp = exemptGroupShortNames.indexOf(this.siteInfo.publicSiteInfo.shortName) > -1;
            this.payments = [
                {
                    Date: "",
                    Unit: "",
                    Resident: "",
                    Amount: "",
                    Status: ""
                }
            ];
            this.testFee = {
                amount: 200
            };
            this.signUpStep = 0;
            this.signUpInfo =
                {
                    hasAssessments: null,
                    assessmentFrequency: 0,
                    allPayTheSame: true,
                    allPayTheSameAmount: null,
                    units: []
                };
            // Populate the page
            this.refresh();
        };
        /**
         * Load all of the data on the page
         */
        ManagePaymentsController.prototype.refresh = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/OnlinePayment").then(function (httpResponse) {
                _this.isLoading = false;
                _this.hasLoadedPage = true;
                _this.hasAssessments = _this.siteInfo.privateSiteInfo.hasAssessments;
                var data = httpResponse.data;
                _this.paymentInfo = data;
                _this.lateFeeInfo =
                    {
                        lateFeeDayOfMonth: data.lateFeeDayOfMonth,
                        lateFeeAmount: data.lateFeeAmount
                    };
                // Prepend flat fee late fees with a $
                if (!HtmlUtil.isNullOrWhitespace(_this.lateFeeInfo.lateFeeAmount)
                    && !HtmlUtil.endsWith(_this.lateFeeInfo.lateFeeAmount, "%"))
                    _this.lateFeeInfo.lateFeeAmount = "$" + _this.lateFeeInfo.lateFeeAmount;
                _this.refreshUnits();
                _this.updateTestFee();
            });
        };
        /**
         * Load all of the untis on the page
         */
        ManagePaymentsController.prototype.refreshUnits = function () {
            // Load the units and assessments
            this.isLoadingUnits = true;
            var innerThis = this;
            this.$http.get("/api/Unit").then(function (httpResponse) {
                innerThis.units = httpResponse.data;
                _.each(innerThis.units, function (u) { if (u.adjustedAssessment === null) {
                    u.adjustedAssessment = u.assessment;
                } });
                innerThis.assessmentSum = _.reduce(innerThis.units, function (memo, u) { return memo + u.assessment; }, 0);
                innerThis.adjustedAssessmentSum = _.reduce(innerThis.units, function (memo, u) { return memo + (u.adjustedAssessment || 0); }, 0);
                innerThis.isLoadingUnits = false;
            });
        };
        ManagePaymentsController.prototype.getLateFeeDateSuper = function () {
            var dayOfMonth = this.lateFeeInfo.lateFeeDayOfMonth;
            if (typeof (dayOfMonth) === "string") {
                if (HtmlUtil.isNullOrWhitespace(dayOfMonth))
                    return "";
                dayOfMonth = parseInt(dayOfMonth);
                this.lateFeeInfo.lateFeeDayOfMonth = dayOfMonth;
            }
            if (dayOfMonth == NaN || dayOfMonth < 1) {
                dayOfMonth = "";
                return "";
            }
            if (dayOfMonth > 31) {
                dayOfMonth = "";
                return "";
            }
            // Teens are a special case
            if (dayOfMonth >= 10 && dayOfMonth <= 20)
                return "th";
            var onesDigit = dayOfMonth % 10;
            if (onesDigit === 1)
                return "st";
            else if (onesDigit === 2)
                return "nd";
            if (onesDigit === 3)
                return "rd";
            return "th";
        };
        /**
         * Allow the user to update their PayPal client ID and client secret
         */
        ManagePaymentsController.prototype.updatePayPalCredentials = function () {
            this.isUpdatingPayPalCredentials = true;
            //this.payPalSignUpClientId = this.paymentInfo.payPalClientId;
            this.payPalSignUpClientSecret = "";
            this.payPalSignUpErrorMessage = "";
        };
        /**
         * Save the allow setting
         */
        ManagePaymentsController.prototype.saveAllowSetting = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/OnlinePayment/SaveAllow?allowPayments=" + this.paymentInfo.areOnlinePaymentsAllowed, null).then(function (httpResponse) {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the button to save the PayPal client ID and secret
         */
        ManagePaymentsController.prototype.enablePayPal = function () {
            var _this = this;
            this.isLoading = true;
            this.payPalSignUpErrorMessage = null;
            var enableInfo = {
                clientId: this.payPalSignUpClientId,
                clientSecret: this.payPalSignUpClientSecret
            };
            this.$http.put("/api/OnlinePayment/EnablePayPal", enableInfo).then(function (httpResponse) {
                _this.payPalSignUpClientId = "";
                _this.payPalSignUpClientSecret = "";
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading = false;
                _this.payPalSignUpErrorMessage = httpResponse.data.exceptionMessage;
            });
        };
        ManagePaymentsController.prototype.selectText = function () {
            // HACK: Timeout needed to fire after x-editable's activation
            setTimeout(function () {
                $('.editable-input').select();
            }, 50);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user presses the button to send money from the WePay account to their
        // association's account
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ManagePaymentsController.prototype.onWithdrawalClick = function () {
            var _this = this;
            this.message = "";
            this.$http.get("/api/OnlinePayment?action=withdrawal").then(function (httpResponse) {
                var withdrawalInfo = httpResponse.data;
                if (withdrawalInfo.redirectUri)
                    window.location.href = withdrawalInfo.redirectUri;
                else
                    _this.message = withdrawalInfo.message;
            }, function (httpResponse) {
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    _this.message = httpResponse.data.exceptionMessage;
            });
        };
        /**
         * Occurs when the user presses the button to edit a unit's assessment
         */
        ManagePaymentsController.prototype.onUnitAssessmentChanged = function (unit) {
            this.isLoadingUnits = true;
            var updateInfo = {
                unitId: unit.unitId,
                assessment: typeof (unit.adjustedAssessment) === "string" ? parseFloat(unit.adjustedAssessment) : unit.adjustedAssessment,
                assessmentNote: unit.adjustedAssessmentReason
            };
            var innerThis = this;
            this.$http.put("/api/Unit/UpdateAssessment", updateInfo).then(function () {
                innerThis.isLoadingUnits = false;
                innerThis.assessmentSum = _.reduce(innerThis.units, function (memo, u) { return memo + u.assessment; }, 0);
                innerThis.adjustedAssessmentSum = _.reduce(innerThis.units, function (memo, u) { return memo + (u.adjustedAssessment || 0); }, 0);
            });
        };
        /**
         * Occurs when the user changes who covers the WePay transaction fee
         */
        ManagePaymentsController.prototype.onChangeFeePayerInfo = function (payTypeUpdated) {
            var _this = this;
            // See if any users have auto-pay setup for this payment type
            var needsFullRefresh = false;
            var needsReloadOfPage = false;
            if (this.paymentInfo.usersWithAutoPay && this.paymentInfo.usersWithAutoPay.length > 0) {
                var AchDBString = "ACH";
                var CreditDBString = "Credit Card";
                var usersAffected = [];
                if (payTypeUpdated === "ach")
                    usersAffected = _.where(this.paymentInfo.usersWithAutoPay, function (u) { return u.wePayAutoPayFundingSource === AchDBString; });
                else if (payTypeUpdated === "cc")
                    usersAffected = _.where(this.paymentInfo.usersWithAutoPay, function (u) { return u.wePayAutoPayFundingSource === CreditDBString; });
                // If users will be affected then display an error message to the user
                if (usersAffected.length > 0) {
                    // We need to reload the site if the user is affected so the home page updates that
                    // the user does not have auto-pay enabled
                    needsReloadOfPage = _.find(usersAffected, function (u) { return u.userId === _this.siteInfo.userInfo.userId; }) !== undefined;
                    needsFullRefresh = true;
                    var message = "Adjusting the fee payer type will cause the follow units to have their auto-pay cancelled and they will be informed by e-mail:\n";
                    _.each(usersAffected, function (u) { return message += u.ownerName + "\n"; });
                    message += "\nDo you want to continue?";
                    if (!confirm(message)) {
                        // Reset the setting
                        if (payTypeUpdated === "ach")
                            this.paymentInfo.payerPaysAchFee = !this.paymentInfo.payerPaysAchFee;
                        else
                            this.paymentInfo.payerPaysCCFee = !this.paymentInfo.payerPaysCCFee;
                        return;
                    }
                }
            }
            this.isLoadingPayment = true;
            var innerThis = this;
            this.$http.put("/api/OnlinePayment", this.paymentInfo).then(function () {
                if (needsReloadOfPage)
                    window.location.reload();
                else {
                    innerThis.isLoadingPayment = false;
                    // We need to refresh our data so we don't pop-up the auto-pay cancel warning again
                    if (needsFullRefresh)
                        innerThis.refresh();
                }
            });
            this.updateTestFee();
        };
        /**
         * Used to show the sum of all assessments
         */
        ManagePaymentsController.prototype.getSignUpSum = function () {
            return _.reduce(this.signUpInfo.units, function (memo, u) { return memo + parseFloat(u.assessment); }, 0);
        };
        /**
         * Occurs when the user changes where the WePay fee payment comes from
         */
        ManagePaymentsController.prototype.signUp_HasAssessments = function (hasAssessments) {
            var _this = this;
            this.signUpInfo.hasAssessments = hasAssessments;
            if (this.signUpInfo.hasAssessments) {
                this.signUpInfo.units = [];
                _.each(this.units, function (u) {
                    _this.signUpInfo.units.push({ unitId: u.unitId, name: u.name, assessment: 0 });
                });
                this.signUpStep = 1;
            }
            else {
                this.signUp_Commit();
            }
        };
        /**
         * Handle the assessment frequency
         */
        ManagePaymentsController.prototype.signUp_AssessmentFrequency = function (frequencyIndex) {
            this.signUpInfo.frequencyIndex = frequencyIndex;
            this.signUpInfo.assessmentFrequency = PeriodicPaymentFrequencies[frequencyIndex].name;
            this.signUpStep = 2;
        };
        /**
         * Save the late fee info
         */
        ManagePaymentsController.prototype.saveLateFee = function () {
            var _this = this;
            this.isLoadingLateFee = true;
            this.$http.put("/api/OnlinePayment/LateFee?dayOfMonth=" + this.lateFeeInfo.lateFeeDayOfMonth + "&lateFeeAmount=" + this.lateFeeInfo.lateFeeAmount, null).then(function (httpResponse) {
                _this.isLoadingLateFee = false;
                var lateFeeResult = httpResponse.data;
                if (!lateFeeResult || !lateFeeResult.feeAmount || lateFeeResult.feeType === 0) {
                    if (_this.lateFeeInfo.lateFeeDayOfMonth !== "")
                        alert("Failed to save the late fee. Please enter only a number for the date (ex. 5) and an amount (ex. 12.34) or percent (ex. 5%) for the fee. To disable late fees, clear the date field and hit save.");
                    _this.lateFeeInfo.lateFeeDayOfMonth = "";
                    _this.lateFeeInfo.lateFeeAmount = null;
                }
                else {
                    _this.lateFeeInfo.lateFeeAmount = lateFeeResult.feeAmount;
                    // feeType of 2 is percent, 1 is flat, and 0 is invalid
                    if (lateFeeResult.feeType === 1)
                        _this.lateFeeInfo.lateFeeAmount = "$" + _this.lateFeeInfo.lateFeeAmount;
                    else if (lateFeeResult.feeType === 2)
                        _this.lateFeeInfo.lateFeeAmount = "" + _this.lateFeeInfo.lateFeeAmount + "%";
                }
            }, function (httpResponse) {
                _this.isLoadingLateFee = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to update late fee: " + errorMessage);
            });
        };
        /**
         * Show the PayPal info for a specific transaction
         */
        ManagePaymentsController.prototype.showPayPalCheckoutInfo = function (payPalCheckoutId) {
            var _this = this;
            this.viewingPayPalCheckoutId = payPalCheckoutId;
            if (!this.viewingPayPalCheckoutId)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/PayPalCheckoutInfo?checkoutId=" + payPalCheckoutId, { cache: true }).then(function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                _this.checkoutInfo = httpResponse.data;
            }, function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Show the WePay info for a specific transaction
         */
        ManagePaymentsController.prototype.showWePayCheckoutInfo = function (wePayCheckoutId) {
            var _this = this;
            this.viewingWePayCheckoutId = wePayCheckoutId;
            if (!this.viewingWePayCheckoutId)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/CheckoutInfo?checkoutId=" + wePayCheckoutId, { cache: true }).then(function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                _this.checkoutInfo = httpResponse.data;
            }, function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Save the sign-up answers
         */
        ManagePaymentsController.prototype.signUp_Commit = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/OnlinePayment/BasicInfo", this.signUpInfo).then(function () {
                _this.isLoading = false;
                // Update the unit assessments
                _this.refreshUnits();
                // Update the assesment flag
                _this.hasAssessments = _this.signUpInfo.hasAssessments;
                _this.siteInfo.privateSiteInfo.hasAssessments = _this.hasAssessments;
            }, function (httpResponse) {
                _this.isLoading = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    _this.message = httpResponse.data.exceptionMessage;
            });
        };
        /**
         * Allow the admin to clear the WePay access token for testing
         */
        ManagePaymentsController.prototype.updateTestFee = function () {
            var numericAmount = parseFloat(this.testFee.amount);
            if (this.paymentInfo.payerPaysAchFee) {
                this.testFee.achResidentPays = numericAmount + 1.5;
                this.testFee.achAssociationReceives = numericAmount;
            }
            else {
                this.testFee.achResidentPays = numericAmount;
                this.testFee.achAssociationReceives = numericAmount - 1.5;
            }
            var ccFee = 1.3 + (numericAmount * 0.029);
            if (this.paymentInfo.payerPaysCCFee) {
                this.testFee.ccResidentPays = numericAmount + ccFee;
                this.testFee.ccAssociationReceives = numericAmount;
            }
            else {
                this.testFee.ccResidentPays = numericAmount;
                this.testFee.ccAssociationReceives = numericAmount - ccFee;
            }
        };
        /**
         * Allow the admin to clear the WePay access token for testing
         */
        ManagePaymentsController.prototype.admin_ClearAccessToken = function () {
            alert("TODO hook this up");
        };
        ManagePaymentsController.$inject = ["$http", "SiteInfo", "appCacheService"];
        return ManagePaymentsController;
    }());
    Ally.ManagePaymentsController = ManagePaymentsController;
})(Ally || (Ally = {}));
CA.angularApp.component("managePayments", {
    templateUrl: "/ngApp/chtn/manager/manage-payments.html",
    controller: Ally.ManagePaymentsController
});

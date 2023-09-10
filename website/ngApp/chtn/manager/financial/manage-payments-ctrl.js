var Ally;
(function (Ally) {
    class ElectronicPayment {
    }
    Ally.ElectronicPayment = ElectronicPayment;
    class WePayBalanceDetail {
    }
    class PaymentPageInfo {
    }
    class UpdateAssessmentInfo {
    }
    /**
     * The controller for the page to view online payment information
     */
    class ManagePaymentsController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, appCacheService, uiGridConstants, $scope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.uiGridConstants = uiGridConstants;
            this.$scope = $scope;
            this.PaymentHistory = [];
            this.errorMessage = "";
            this.showPaymentPage = true; //AppConfig.appShortName === "condo";
            this.periodicPaymentFrequencies = PeriodicPaymentFrequencies;
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
            this.shouldShowDwollaAddAccountModal = false;
            this.shouldShowDwollaModalClose = false;
            this.shouldShowPaymentSignupModal = false;
            this.shouldShowMicroDepositModal = false;
            this.shouldShowPlaidTestSignUpButton = false;
            this.shouldShowStripePrefaceModal = false;
            this.shouldShowNewStripeSignUpMessage = false;
            this.isDwollaIavDone = false;
            this.shouldShowCustomInstructions = false;
            this.hasMultipleProviders = false;
            this.allowStripeSignUp = false;
            this.stripePayoutAccounts = null;
            this.exampleFeeService = "stripe";
            this.isPremiumPlanActive = false;
            this.HistoryPageSize = 50;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.homeName = AppConfig.homeName;
            this.highlightWePayCheckoutId = this.appCacheService.getAndClear("hwpid");
            const tempPayId = this.appCacheService.getAndClear("onpayid");
            if (HtmlUtil.isNumericString(tempPayId))
                this.highlightPaymentsInfoId = parseInt(tempPayId);
            this.isAssessmentTrackingEnabled = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled;
            const StripeEnabledGroups = ["qa", "502wainslie"];
            const createdRecently = moment(new Date(2023, 6, 25)).isBefore(moment(this.siteInfo.privateSiteInfo.creationDate));
            this.allowStripeSignUp = (StripeEnabledGroups.indexOf(this.siteInfo.publicSiteInfo.shortName) !== -1) || createdRecently;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            // Allow a single HOA to try WePay
            const wePayExemptGroupShortNames = ["tigertrace", "7mthope", "qa"];
            this.allowNewWePaySignUp = wePayExemptGroupShortNames.indexOf(this.siteInfo.publicSiteInfo.shortName) > -1;
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
                    assessmentFrequency: PeriodicPaymentFrequencies[0].name,
                    frequencyIndex: 0,
                    allPayTheSame: true,
                    allPayTheSameAmount: 0,
                    units: []
                };
            this.paymentsGridOptions =
                {
                    columnDefs: [
                        { field: 'submitDateUtc', displayName: 'Date', width: 140, type: 'date', cellFilter: "date:'short'" },
                        { field: 'unitName', displayName: this.homeName, width: 80 },
                        { field: 'resident', displayName: 'Resident', width: 160 },
                        { field: 'amount', displayName: 'Amount', width: 100, type: 'number', cellFilter: "currency" },
                        { field: 'status', displayName: 'Status', width: 110 },
                        { field: 'notes', displayName: 'Notes' },
                        { field: 'id', displayName: '', width: 140, cellTemplate: '<div class="ui-grid-cell-contents"><span class="text-link" data-ng-if="row.entity.wePayCheckoutId" data-ng-click="grid.appScope.$ctrl.showWePayCheckoutInfo( row.entity.wePayCheckoutId )">WePay Details</span><span class="text-link" data-ng-if="row.entity.payPalCheckoutId" data-ng-click="grid.appScope.$ctrl.showPayPalCheckoutInfo( row.entity.payPalCheckoutId )">PayPal Details</span><span class="text-link" data-ng-if="row.entity.paragonReferenceNumber" data-ng-click="grid.appScope.$ctrl.showParagonCheckoutInfo( row.entity.paragonReferenceNumber )">Paragon Details</span><span class="text-link" data-ng-if="row.entity.dwollaTransferUri" data-ng-click="grid.appScope.$ctrl.showDwollaTransferInfo( row.entity )">Dwolla Details</span><span class="text-link" data-ng-if="row.entity.stripePaymentIntentId" data-ng-click="grid.appScope.$ctrl.showStripeTransferInfo( row.entity )">Stripe Details</span></div>' }
                    ],
                    enableSorting: true,
                    enableHorizontalScrollbar: window.innerWidth < 996 ? this.uiGridConstants.scrollbars.ALWAYS : this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: true,
                    paginationPageSize: this.HistoryPageSize,
                    paginationPageSizes: [this.HistoryPageSize],
                    enableRowHeaderSelection: false,
                    onRegisterApi: () => {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            // Populate the page
            this.refresh();
        }
        /**
         * Load all of the data on the page
         */
        refresh() {
            this.isLoading = true;
            this.$http.get("/api/OnlinePayment").then((httpResponse) => {
                this.isLoading = false;
                this.hasLoadedPage = true;
                this.hasAssessments = this.siteInfo.privateSiteInfo.hasAssessments;
                if (this.hasAssessments) {
                    const assessmentFrequencyInfo = PeriodicPaymentFrequencies.find(ppf => ppf.id === this.siteInfo.privateSiteInfo.assessmentFrequency);
                    if (assessmentFrequencyInfo)
                        this.assessmentFrequencyLabel = assessmentFrequencyInfo.name;
                }
                const data = httpResponse.data;
                this.paymentInfo = data;
                this.paymentsGridOptions.data = this.paymentInfo.electronicPayments;
                this.paymentsGridOptions.enablePaginationControls = this.paymentInfo.electronicPayments.length > this.HistoryPageSize;
                this.paymentsGridOptions.minRowsToShow = Math.min(this.paymentInfo.electronicPayments.length, this.HistoryPageSize);
                this.paymentsGridOptions.virtualizationThreshold = this.paymentsGridOptions.minRowsToShow;
                let numProviders = 0;
                if (this.paymentInfo.isDwollaSetup)
                    ++numProviders;
                if (this.paymentInfo.isWePaySetup)
                    ++numProviders;
                if (this.paymentInfo.isStripeSetup)
                    ++numProviders;
                this.hasMultipleProviders = numProviders > 1;
                // If the user signed-up for Stripe within the last two days, show them a message on how to add more users to Stripe
                if (httpResponse.data.stripeConnectEnabledDateUtc)
                    this.shouldShowNewStripeSignUpMessage = moment().subtract(2, "days").isBefore(moment(httpResponse.data.stripeConnectEnabledDateUtc));
                this.stripePayoutAccounts = httpResponse.data.stripeConnectExternalAccountHints;
                if (Ally.HtmlUtil2.isValidString(this.paymentInfo.customFinancialInstructions))
                    this.showCustomInstructionsEditor();
                this.lateFeeInfo =
                    {
                        lateFeeDayOfMonth: data.lateFeeDayOfMonth,
                        lateFeeAmount: data.lateFeeAmount
                    };
                // Prepend flat fee late fees with a $
                if (!HtmlUtil.isNullOrWhitespace(this.lateFeeInfo.lateFeeAmount)
                    && !HtmlUtil.endsWith(this.lateFeeInfo.lateFeeAmount, "%"))
                    this.lateFeeInfo.lateFeeAmount = "$" + this.lateFeeInfo.lateFeeAmount;
                this.refreshUnits();
                this.updateTestFee();
                // If we were sent here to pre-open a transaction's details
                if (this.highlightPaymentsInfoId) {
                    const payment = data.electronicPayments.filter(e => e.paymentId === this.highlightPaymentsInfoId);
                    if (payment && payment.length > 0) {
                        if (payment[0].wePayCheckoutId)
                            this.showWePayCheckoutInfo(payment[0].wePayCheckoutId);
                        else if (payment[0].paragonReferenceNumber)
                            this.showParagonCheckoutInfo(payment[0].paragonReferenceNumber);
                        else if (payment[0].dwollaTransferUri)
                            this.showDwollaTransferInfo(payment[0]);
                        else if (payment[0].stripePaymentIntentId)
                            this.showStripeTransferInfo(payment[0]);
                    }
                    this.highlightPaymentsInfoId = null;
                }
            }, (httpResponse) => {
                this.isLoading = false;
                alert(`Failed to load page, please contact technical support. (${httpResponse.data.exceptionMessage})`);
            });
        }
        /**
         * Load all of the units on the page
         */
        refreshUnits() {
            // Load the units and assessments
            this.isLoadingUnits = true;
            this.$http.get("/api/Unit").then((httpResponse) => {
                this.units = httpResponse.data;
                _.each(this.units, function (u) { if (u.adjustedAssessment === null) {
                    u.adjustedAssessment = u.assessment;
                } });
                this.assessmentSum = _.reduce(this.units, function (memo, u) { return memo + u.assessment; }, 0);
                this.adjustedAssessmentSum = _.reduce(this.units, function (memo, u) { return memo + (u.adjustedAssessment || 0); }, 0);
                this.isLoadingUnits = false;
            }, (httpResponse) => {
                this.isLoading = false;
                alert(`Failed to load units, please contact technical support. (${httpResponse.data.exceptionMessage})`);
            });
        }
        getLateFeeDateSuper() {
            let dayOfMonth = this.lateFeeInfo.lateFeeDayOfMonth;
            if (typeof (dayOfMonth) === "string") {
                if (HtmlUtil.isNullOrWhitespace(dayOfMonth))
                    return "";
                dayOfMonth = parseInt(dayOfMonth);
                this.lateFeeInfo.lateFeeDayOfMonth = dayOfMonth;
            }
            if (isNaN(dayOfMonth) || dayOfMonth < 1) {
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
            const onesDigit = dayOfMonth % 10;
            if (onesDigit === 1)
                return "st";
            else if (onesDigit === 2)
                return "nd";
            if (onesDigit === 3)
                return "rd";
            return "th";
        }
        /**
         * Allow the user to update their PayPal client ID and client secret
         */
        updatePayPalCredentials() {
            this.isUpdatingPayPalCredentials = true;
            //this.payPalSignUpClientId = this.paymentInfo.payPalClientId;
            this.payPalSignUpClientSecret = "";
            this.payPalSignUpErrorMessage = "";
        }
        /**
         * Save the allow setting
         */
        saveAllowSetting() {
            this.isLoading = true;
            this.$http.put("/api/OnlinePayment/SaveAllow?allowPayments=" + this.paymentInfo.areOnlinePaymentsAllowed, null).then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user clicks the button to save the PayPal client ID and secret
         */
        enablePayPal() {
            this.isLoading = true;
            this.payPalSignUpErrorMessage = null;
            const enableInfo = {
                clientId: this.payPalSignUpClientId,
                clientSecret: this.payPalSignUpClientSecret
            };
            this.$http.put("/api/OnlinePayment/EnablePayPal", enableInfo).then(() => {
                this.payPalSignUpClientId = "";
                this.payPalSignUpClientSecret = "";
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                this.payPalSignUpErrorMessage = httpResponse.data.exceptionMessage;
            });
        }
        selectText() {
            // HACK: Timeout needed to fire after x-editable's activation
            setTimeout(function () {
                $('.editable-input').select();
            }, 50);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user presses the button to send money from the WePay account to their
        // association's account
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onWithdrawalClick() {
            this.errorMessage = "";
            this.$http.get("/api/OnlinePayment/PerformAction?action=withdrawal").then((httpResponse) => {
                const withdrawalInfo = httpResponse.data;
                if (withdrawalInfo.redirectUri)
                    window.location.href = withdrawalInfo.redirectUri;
                else
                    this.errorMessage = withdrawalInfo.message;
            }, (httpResponse) => {
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    this.errorMessage = httpResponse.data.exceptionMessage;
            });
        }
        /**
         * Occurs when the user presses the button to edit a unit's assessment
         */
        onUnitAssessmentChanged(unit) {
            this.isLoadingUnits = true;
            if (typeof (unit.adjustedAssessment) === "string")
                unit.adjustedAssessment = parseFloat(unit.adjustedAssessment);
            const updateInfo = {
                unitId: unit.unitId,
                assessment: unit.adjustedAssessment,
                assessmentNote: unit.adjustedAssessmentReason
            };
            this.$http.put("/api/Unit/UpdateAssessment", updateInfo).then(() => {
                this.isLoadingUnits = false;
                this.assessmentSum = _.reduce(this.units, function (memo, u) { return memo + u.assessment; }, 0);
                this.adjustedAssessmentSum = _.reduce(this.units, function (memo, u) { return memo + (u.adjustedAssessment || 0); }, 0);
            }, (response) => {
                alert("Failed to update: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user presses the button to set all units to the assessment
         */
        setAllUnitAssessments() {
            if (!this.setAllAssessmentAmount || isNaN(this.setAllAssessmentAmount) || this.setAllAssessmentAmount < 0) {
                alert("Enter a valid assessment amount");
                return;
            }
            this.isLoadingUnits = true;
            const updateInfo = {
                unitId: -1,
                assessment: this.setAllAssessmentAmount,
                assessmentNote: null
            };
            this.$http.put("/api/Unit/SetAllAssessments", updateInfo).then(() => {
                this.isLoadingUnits = false;
                this.refreshUnits();
            }, (response) => {
                alert("Failed to update: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user changes who covers the WePay transaction fee
         */
        onChangeFeePayerInfo(payTypeUpdated) {
            // See if any users have auto-pay setup for this payment type
            let needsFullRefresh = false;
            let needsReloadOfPage = false;
            if (this.paymentInfo.usersWithAutoPay && this.paymentInfo.usersWithAutoPay.length > 0) {
                const AchDBString = "ACH";
                const CreditDBString = "Credit Card";
                let usersAffected = [];
                if (payTypeUpdated === "ach")
                    usersAffected = _.where(this.paymentInfo.usersWithAutoPay, (u) => u.wePayAutoPayFundingSource === AchDBString);
                else if (payTypeUpdated === "cc")
                    usersAffected = _.where(this.paymentInfo.usersWithAutoPay, (u) => u.wePayAutoPayFundingSource === CreditDBString);
                // If users will be affected then display an error message to the user
                if (usersAffected.length > 0) {
                    // We need to reload the site if the user is affected so the home page updates that
                    // the user does not have auto-pay enabled
                    needsReloadOfPage = _.find(usersAffected, (u) => u.userId === this.siteInfo.userInfo.userId) !== undefined;
                    needsFullRefresh = true;
                    let message = "Adjusting the fee payer type will cause the follow units to have their auto-pay canceled and they will be informed by email:\n";
                    _.each(usersAffected, (u) => message += u.ownerName + "\n");
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
            // We always need to full reload the page so the home page payment form reflects the
            // correct fee payer setting
            needsReloadOfPage = true;
            this.$http.put("/api/OnlinePayment", this.paymentInfo).then(() => {
                if (needsReloadOfPage)
                    window.location.reload();
                else {
                    this.isLoadingPayment = false;
                    // We need to refresh our data so we don't pop-up the auto-pay cancel warning again
                    if (needsFullRefresh)
                        this.refresh();
                }
            }, (response) => {
                alert("Failed to update: " + response.data.exceptionMessage);
            });
            this.updateTestFee();
        }
        /**
         * Used to show the sum of all assessments
         */
        getSignUpSum() {
            return _.reduce(this.signUpInfo.units, function (memo, u) { return memo + parseFloat(u.assessment); }, 0);
        }
        /**
         * Occurs when the user clicks the link to indicate if they have regular assessments or not
         */
        signUp_HasAssessments(hasAssessments) {
            this.signUpInfo.hasAssessments = hasAssessments;
            if (this.signUpInfo.hasAssessments) {
                this.signUpInfo.units = [];
                _.each(this.units, (u) => {
                    this.signUpInfo.units.push({ unitId: u.unitId, name: u.name, assessment: 0 });
                });
                this.signUpStep = 1;
            }
            else {
                this.signUp_Commit();
            }
        }
        /**
         * Handle the assessment frequency
         */
        signUp_AssessmentFrequency(frequencyIndex) {
            this.signUpInfo.frequencyIndex = frequencyIndex;
            this.signUpInfo.assessmentFrequency = PeriodicPaymentFrequencies[frequencyIndex].name;
            this.signUpStep = 2;
        }
        /**
         * Save the late fee info
         */
        saveLateFee() {
            this.isLoadingLateFee = true;
            this.$http.put("/api/OnlinePayment/LateFee?dayOfMonth=" + this.lateFeeInfo.lateFeeDayOfMonth + "&lateFeeAmount=" + this.lateFeeInfo.lateFeeAmount, null).then((httpResponse) => {
                this.isLoadingLateFee = false;
                const lateFeeResult = httpResponse.data;
                if (!lateFeeResult || !lateFeeResult.feeAmount || lateFeeResult.feeType === 0) {
                    if (this.lateFeeInfo.lateFeeDayOfMonth !== "")
                        alert("Failed to save the late fee. Please enter only a number for the date (ex. 5) and an amount (ex. 12.34) or percent (ex. 5%) for the fee. To disable late fees, clear the date field and hit save.");
                    this.lateFeeInfo.lateFeeDayOfMonth = "";
                    this.lateFeeInfo.lateFeeAmount = null;
                }
                else {
                    this.lateFeeInfo.lateFeeAmount = lateFeeResult.feeAmount;
                    // feeType of 2 is percent, 1 is flat, and 0 is invalid
                    if (lateFeeResult.feeType === 1)
                        this.lateFeeInfo.lateFeeAmount = "$" + this.lateFeeInfo.lateFeeAmount;
                    else if (lateFeeResult.feeType === 2)
                        this.lateFeeInfo.lateFeeAmount = "" + this.lateFeeInfo.lateFeeAmount + "%";
                }
            }, (httpResponse) => {
                this.isLoadingLateFee = false;
                const errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to update late fee: " + errorMessage);
            });
        }
        /**
         * Show the PayPal info for a specific transaction
         */
        showPayPalCheckoutInfo(payPalCheckoutId) {
            this.viewingPayPalCheckoutId = payPalCheckoutId;
            if (!this.viewingPayPalCheckoutId)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/PayPalCheckoutInfo?checkoutId=" + payPalCheckoutId, { cache: true }).then((httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                this.checkoutInfo = httpResponse.data;
            }, (httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Show the WePay info for a specific transaction
         */
        showWePayCheckoutInfo(wePayCheckoutId) {
            this.viewingWePayCheckoutId = wePayCheckoutId;
            if (!this.viewingWePayCheckoutId)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/WePayCheckoutInfo?checkoutId=" + wePayCheckoutId, { cache: true }).then((httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                this.checkoutInfo = httpResponse.data;
            }, (httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Show the Paragon info for a specific transaction
         */
        showParagonCheckoutInfo(paragonReferenceNumber) {
            this.viewingParagonReferenceNumber = paragonReferenceNumber;
            if (!this.viewingParagonReferenceNumber)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/ParagonCheckoutInfo?paymentReferenceNumber=" + paragonReferenceNumber, { cache: true }).then((httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                this.checkoutInfo = httpResponse.data;
            }, (httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Show the Dwolla info for a specific transaction
         */
        showDwollaTransferInfo(paymentEntry) {
            this.viewingDwollaEntry = paymentEntry;
            if (!this.viewingDwollaEntry)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/DwollaCheckoutInfo/" + paymentEntry.paymentId).then((httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                this.checkoutInfo = httpResponse.data;
                this.checkoutInfo.payerNotes = paymentEntry.notes;
            }, (httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Show the Dwolla info for a specific transaction
         */
        showStripeTransferInfo(paymentEntry) {
            this.viewingStripeEntry = paymentEntry;
            if (!this.viewingStripeEntry)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/StripeCheckoutInfo/" + paymentEntry.paymentId).then((httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                this.checkoutInfo = httpResponse.data;
                this.checkoutInfo.payerNotes = paymentEntry.notes;
                // Sometimes the status updates on checking
                paymentEntry.status = httpResponse.data.status;
            }, (httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Cancel a Dwolla transfer
         */
        cancelDwollaTransfer() {
            if (!this.viewingDwollaEntry)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/Dwolla/CancelTransfer/" + this.viewingDwollaEntry.paymentId).then((httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                this.checkoutInfo = httpResponse.data;
                // Refresh the page to show the updated status
                window.location.reload();
            }, (httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                alert("Failed to cancel transfer: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Save the sign-up answers
         */
        signUp_Commit() {
            this.isLoading = true;
            this.$http.post("/api/OnlinePayment/BasicInfo", this.signUpInfo).then(() => {
                // Update the unit assessments
                this.refreshUnits();
                // Update the assessment flag
                this.hasAssessments = this.signUpInfo.hasAssessments;
                this.siteInfo.privateSiteInfo.hasAssessments = this.hasAssessments;
                // Refresh the site info to reflect the assessment frequency
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    this.errorMessage = httpResponse.data.exceptionMessage;
            });
        }
        /**
         * Allow the admin to clear the WePay access token for testing
         */
        updateTestFee() {
            const numericAmount = parseFloat(this.testFee.amount);
            if (this.exampleFeeService === "wepay") {
                if (this.paymentInfo.payerPaysAchFee) {
                    this.testFee.achResidentPays = numericAmount + 1.5;
                    this.testFee.achAssociationReceives = numericAmount;
                }
                else {
                    this.testFee.achResidentPays = numericAmount;
                    this.testFee.achAssociationReceives = numericAmount - 1.5;
                }
                const ccFee = 1.3 + (numericAmount * 0.029);
                if (this.paymentInfo.payerPaysCCFee) {
                    this.testFee.ccResidentPays = numericAmount + ccFee;
                    this.testFee.ccAssociationReceives = numericAmount;
                }
                else {
                    this.testFee.ccResidentPays = numericAmount;
                    this.testFee.ccAssociationReceives = numericAmount - ccFee;
                }
            }
            else {
                const stripeFeeInfo = Ally.HtmlUtil2.getStripeFeeInfo(numericAmount, this.paymentInfo.payerPaysAchFee, this.siteInfo.privateSiteInfo.isPremiumPlanActive);
                this.testFee.achResidentPays = stripeFeeInfo.totalAmountPaid;
                this.testFee.achAssociationReceives = stripeFeeInfo.groupReceives;
            }
        }
        /**
         * Allow the admin to clear the WePay access token for testing
         */
        clearWePayAccessToken() {
            this.isLoading = true;
            this.$http.get("/api/OnlinePayment/ClearWePayAuthToken").then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to disable WePay: " + httpResponse.data.exceptionMessage);
            });
        }
        showDwollaSignUpModal() {
            this.shouldShowDwollaAddAccountModal = true;
            window.setTimeout(() => {
                grecaptcha.render("recaptcha-check-elem");
            }, 200);
        }
        /**
         * Start the Dwolla IAV process
         */
        startDwollaSignUp() {
            const recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(recaptchaKey)) {
                alert("Please complete the reCAPTCHA field");
                return;
            }
            this.shouldShowDwollaModalClose = false;
            this.isDwollaIavDone = false;
            this.isLoading = true;
            const startDwollaIav = (iavToken) => {
                dwolla.configure(Ally.AppConfigInfo.dwollaEnvironmentName);
                dwolla.iav.start(iavToken, {
                    container: 'dwolla-iav-container',
                    stylesheets: [
                        'https://fonts.googleapis.com/css?family=Lato&subset=latin,latin-ext'
                    ],
                    microDeposits: true,
                    fallbackToMicroDeposits: true
                }, (err, res) => {
                    console.log('Error: ' + JSON.stringify(err) + ' -- Response: ' + JSON.stringify(res));
                    if (res && res._links && res._links["funding-source"] && res._links["funding-source"].href) {
                        const fundingSourceUri = res._links["funding-source"].href;
                        // Tell the server
                        this.$http.put("/api/Dwolla/SetGroupFundingSourceUri", { fundingSourceUri }).then(() => {
                            this.isDwollaIavDone = true;
                        }, (response) => {
                            this.isLoading = false;
                            this.shouldShowDwollaModalClose = true;
                            alert("Failed to complete sign-up: " + response.data.exceptionMessage);
                        });
                    }
                });
            };
            this.$http.get("/api/Dwolla/GroupIavToken?token=" + encodeURIComponent(recaptchaKey)).then((httpResponse) => {
                this.isLoading = false;
                this.dwollaIavToken = httpResponse.data.iavToken;
                startDwollaIav(this.dwollaIavToken);
            }, (httpResponse) => {
                this.isLoading = false;
                this.shouldShowDwollaAddAccountModal = false;
                grecaptcha.reset();
                alert("Failed to start instant account verification: " + httpResponse.data.exceptionMessage);
            });
        }
        hideDwollaAddAccountModal() {
            this.shouldShowDwollaAddAccountModal = false;
            this.dwollaIavToken = null;
            if (this.isDwollaIavDone) {
                this.isLoading = true;
                window.location.reload();
            }
        }
        /**
         * Disconnect the bank account from Dwolla
         */
        disconnectDwolla() {
            if (!confirm("Are you sure you want to disconnect the bank account? Residents will no longer be able to make payments."))
                return;
            this.isLoading = true;
            this.$http.put("/api/Dwolla/DisconnectGroupFundingSource", null).then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to disconnect account" + httpResponse.data.exceptionMessage);
            });
        }
        showMicroDepositModal() {
            this.shouldShowMicroDepositModal = true;
            this.dwollaMicroDepositAmount1String = "0.01";
            this.dwollaMicroDepositAmount2String = "0.01";
        }
        submitDwollaMicroDepositAmounts() {
            this.isLoading = true;
            const postData = {
                amount1String: this.dwollaMicroDepositAmount1String,
                amount2String: this.dwollaMicroDepositAmount2String,
                isForGroup: true
            };
            this.$http.post("/api/Dwolla/VerifyMicroDeposit", postData).then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to verify: " + httpResponse.data.exceptionMessage);
            });
        }
        addDwollaAccountViaPlaid() {
            this.isLoading = true;
            this.$http.post("/api/Dwolla/SignUpGroupFromPlaid/81", null).then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to use Plaid account: " + httpResponse.data.exceptionMessage);
            });
        }
        showCustomInstructionsEditor() {
            this.shouldShowCustomInstructions = true;
            window.setTimeout(() => {
                Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 220, { menubar: false }).then(e => {
                    this.pageContentTinyMce = e;
                    this.pageContentTinyMce.setContent(this.paymentInfo.customFinancialInstructions || "");
                    //this.pageContentTinyMce.on( "change", ( e: any ) =>
                    //{
                    //    // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                    //    this.$scope.$apply( () =>
                    //    {
                    //    } );
                    //} );
                });
            }, 25);
        }
        saveCustomInstructions() {
            this.isLoading = true;
            const putBody = {
                newInstructions: this.pageContentTinyMce.getContent()
            };
            this.$http.put("/api/OnlinePayment/UpdateCustomFinancialInstructions", putBody).then(() => {
                this.isLoading = false;
                if (!putBody.newInstructions)
                    this.shouldShowCustomInstructions = false;
                // Update the local value
                this.siteInfo.privateSiteInfo.customFinancialInstructions = putBody.newInstructions;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        }
        signUpForStripe() {
            this.isLoading = true;
            this.$http.get("/api/StripePayments/StartSignUp").then((response) => {
                // Don't stop the loading indicator, just redirect to Stripe
                //this.isLoading = false;
                //window.open( response.data, "_self" );
                window.location.href = response.data;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to start Stripe sign-up: " + response.data.exceptionMessage);
            });
        }
    }
    ManagePaymentsController.$inject = ["$http", "SiteInfo", "appCacheService", "uiGridConstants", "$scope"];
    Ally.ManagePaymentsController = ManagePaymentsController;
    class ParagonPaymentDetails {
    }
    class DwollaPaymentDetails {
    }
    class StripePaymentDetails {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("managePayments", {
    templateUrl: "/ngApp/chtn/manager/financial/manage-payments.html",
    controller: Ally.ManagePaymentsController
});
class PaymentBasicInfoUnitAssessment {
}
class PaymentBasicInfo {
}

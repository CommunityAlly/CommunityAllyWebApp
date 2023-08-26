var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets residents pay their assessments
     */
    var AssessmentPaymentFormController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function AssessmentPaymentFormController($http, siteInfo, $rootScope, $sce, $timeout, $q, $scope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$rootScope = $rootScope;
            this.$sce = $sce;
            this.$timeout = $timeout;
            this.$q = $q;
            this.$scope = $scope;
            this.isLoading_Payment = false;
            this.isLoadingDwolla = false;
            this.showParagon = false;
            this.showParagonCheckingSignUpModal = false;
            this.showParagonCreditSignUpModal = false;
            this.dwollaSignUpInfo = {
                dateOfBirth: "",
                ssnLast4: "",
                ssnFull: "",
                streetAddress: new Ally.FullAddress()
            };
            this.isWePayPaymentActive = false;
            this.isDwollaEnabledOnGroup = false;
            this.isStripeEnabledOnGroup = false;
            this.isDwollaReadyForPayment = false;
            this.shouldShowDwollaAddAccountModal = false;
            this.shouldShowDwollaModalClose = false;
            this.hasComplexPassword = false;
            this.didAgreeToDwollaTerms = false;
            this.dwollaFeePercent = 0.5;
            this.dwollaStripeMaxFee = 5;
            this.dwollaDocUploadType = "license";
            this.dwollaDocUploadFile = null;
            this.dwollaBalance = -1;
            this.isDwollaIavDone = false;
            this.shouldShowMicroDepositModal = false;
            this.dwollaMicroDepositAmount1String = "0.01";
            this.dwollaMicroDepositAmount2String = "0.01";
            this.shouldShowOwnerFinanceTxn = false;
            this.shouldShowDwollaAutoPayArea = true;
            this.currentDwollaAutoPayAmount = null;
            this.hasMultipleProviders = false;
            this.allowDwollaSignUp = false;
            this.stripePaymentSucceeded = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        AssessmentPaymentFormController.prototype.$onInit = function () {
            var _this = this;
            this.showParagon = false; //this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.emailAddress === "president@mycondoally.com";
            this.paragonPaymentParams = "&BillingAddress1=" + encodeURIComponent("900 W Ainslie St") + "&BillingState=Illinois&BillingCity=Chicago&BillingZip=60640&FirstName=" + encodeURIComponent(this.siteInfo.userInfo.firstName) + "&LastName=" + encodeURIComponent(this.siteInfo.userInfo.lastName);
            this.paragonCheckingLast4 = this.siteInfo.userInfo.paragonCheckingLast4;
            this.paragonCardLast4 = this.siteInfo.userInfo.paragonCardLast4;
            this.isWePayPaymentActive = this.siteInfo.privateSiteInfo.isWePayPaymentActive;
            // Disable to Stripe testing
            if (this.siteInfo.publicSiteInfo.groupId === 28)
                this.isWePayPaymentActive = false;
            var shouldShowDwolla = true; //AppConfigInfo.dwollaPreviewShortNames.indexOf( this.siteInfo.publicSiteInfo.shortName ) > -1;
            if (shouldShowDwolla)
                this.isDwollaEnabledOnGroup = this.siteInfo.privateSiteInfo.isDwollaPaymentActive;
            var isSpecialUser = this.siteInfo.publicSiteInfo.shortName === "mesaridge" && this.siteInfo.userInfo.userId === "8fcc4783-b554-490e-91cc-82f5ddb3d1b7";
            this.isStripeEnabledOnGroup = this.siteInfo.privateSiteInfo.isStripePaymentActive;
            if (this.isStripeEnabledOnGroup || isSpecialUser)
                this.stripeApi = Stripe(StripeApiKey, { stripeAccount: this.siteInfo.privateSiteInfo.stripeConnectAccountId });
            this.dwollaFeePercent = this.siteInfo.privateSiteInfo.isPremiumPlanActive ? 0.5 : 1;
            this.dwollaStripeMaxFee = this.siteInfo.privateSiteInfo.isPremiumPlanActive ? 5 : 10;
            this.shouldShowOwnerFinanceTxn = this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn;
            this.currentDwollaAutoPayAmount = this.siteInfo.userInfo.dwollaAutoPayAmount;
            if (this.siteInfo.privateSiteInfo.customFinancialInstructions)
                this.customFinancialInstructions = this.$sce.trustAsHtml(this.siteInfo.privateSiteInfo.customFinancialInstructions);
            var numProviders = 0;
            if (this.isWePayPaymentActive)
                ++numProviders;
            if (this.isDwollaEnabledOnGroup)
                ++numProviders;
            if (this.isStripeEnabledOnGroup)
                ++numProviders;
            this.hasMultipleProviders = numProviders > 1;
            this.usersStripeBankAccountHint = this.siteInfo.userInfo.stripeBankAccountId ? this.siteInfo.userInfo.stripeBankAccountHint : null;
            if (this.isDwollaEnabledOnGroup) {
                this.isDwollaUserAccountVerified = this.siteInfo.userInfo.isDwollaAccountVerified;
                if (this.isDwollaUserAccountVerified) {
                    this.dwollaUserStatus = "verified";
                    this.hasDwollaFundingSource = Ally.HtmlUtil2.isValidString(this.siteInfo.userInfo.dwollaFundingSourceName);
                    if (!this.hasDwollaFundingSource) {
                        this.$http.get("/api/Dwolla/HasComplexPassword").then(function (response) { return _this.hasComplexPassword = response.data; });
                    }
                    else {
                        this.dwollaFundingSourceName = this.siteInfo.userInfo.dwollaFundingSourceName;
                        this.dwollaFundingSourceIsVerified = this.siteInfo.userInfo.dwollaFundingSourceIsVerified;
                        this.isDwollaReadyForPayment = this.isDwollaUserAccountVerified && this.dwollaFundingSourceIsVerified && this.siteInfo.privateSiteInfo.isDwollaPaymentActive;
                        if (this.isDwollaReadyForPayment) {
                            // Check the user's Dwolla balance, delayed since it's not important
                            this.$timeout(function () {
                                _this.$http.get("/api/Dwolla/DwollaBalance").then(function (response) { return _this.dwollaBalance = response.data.balanceAmount; });
                            }, 1000);
                        }
                    }
                }
                else {
                    this.dwollaUserStatus = "checking";
                    this.userFullName = this.siteInfo.userInfo.fullName;
                    this.userEmail = this.siteInfo.userInfo.emailAddress;
                    //const getDwollaDocUploadToken = () =>
                    //{
                    //    this.$http.get( "/api/Dwolla/DocumentUploadToken" ).then(
                    //        ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                    //        {
                    //            const uploadToken = response.data;
                    //            window.setTimeout( () =>
                    //            {
                    //                dwolla.configure( {
                    //                    environment: AppConfigInfo.dwollaEnvironmentName,
                    //                    styles: "/main.css",
                    //                    token: () =>
                    //                    {
                    //                        const deferred = this.$q.defer();
                    //                        deferred.resolve( uploadToken );
                    //                        return deferred.promise;
                    //                    },
                    //                    //token: () => Promise.resolve( uploadToken ),
                    //                    success: ( res: any ) => alert( res ),
                    //                    error: ( err: any ) => alert( err )
                    //                } );
                    //            }, 200 );
                    //        },
                    //        ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                    //        {
                    //            this.dwollaUserStatus = "error";
                    //            console.log( "DocumentUploadToken failed: " + errorResponse.data.exceptionMessage );
                    //        }
                    //    );
                    //};
                    var checkDwollaStatus_1 = function () {
                        _this.$http.get("/api/Dwolla/MyAccountStatus").then(function (response) {
                            _this.dwollaUserStatus = response.data.status;
                            _this.dwollaSignUpInfo.streetAddress = response.data.streetAddress;
                            //if( this.dwollaUserStatus === "document" )
                            //    getDwollaDocUploadToken();
                        }, function (errorResponse) {
                            _this.dwollaUserStatus = "error";
                            console.log("Failed to get Dwolla account status: " + errorResponse.data.exceptionMessage);
                        });
                    };
                    this.$timeout(function () { return checkDwollaStatus_1(); }, 500);
                }
            }
            this.allyAppName = AppConfig.appName;
            this.isWePayAutoPayActive = this.siteInfo.userInfo.isAutoPayActive;
            this.wePayAssessmentCreditCardFeeLabel = this.siteInfo.privateSiteInfo.payerPaysCCFee ? "Service fee applies" : "No service fee";
            this.wePayAssessmentAchFeeLabel = this.siteInfo.privateSiteInfo.payerPaysAchFee ? "$1.50 service fee applies" : "No service fee";
            this.payerPaysAchFee = this.siteInfo.privateSiteInfo.payerPaysAchFee;
            this.errorPayInfoText = "Is the amount incorrect?";
            this.isWePaySetup = this.siteInfo.privateSiteInfo.isPaymentEnabled;
            this.hasAssessments = this.siteInfo.privateSiteInfo.hasAssessments;
            this.assessmentFrequency = this.siteInfo.privateSiteInfo.assessmentFrequency;
            if (!this.isWePayAutoPayActive && HtmlUtil.isNumericString(HtmlUtil.GetQueryStringParameter("preapproval_id"))) {
                // The user just set up auto-pay and it may take a second
                this.isWePayAutoPayActive = true;
            }
            this.nextAutoPayText = this.siteInfo.userInfo.nextAutoPayText;
            // Grab the assessment from the user's unit (TODO handle multiple units)
            if (this.siteInfo.userInfo.usersUnits != null && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.assessmentAmount = this.siteInfo.userInfo.usersUnits
                    .filter(function (uu) { return !uu.isRenter; })
                    .reduce(function (total, uu) { return total + (uu.assessment || 0); }, 0);
            }
            else
                this.assessmentAmount = 0;
            // Show the Dwolla auto-pay area if the group's Dwolla is setup and
            // assessment frequncy is defined, or if the user already has auto-pay
            this.shouldShowDwollaAutoPayArea = (this.isDwollaReadyForPayment
                && this.siteInfo.privateSiteInfo.assessmentFrequency != null
                && this.assessmentAmount > 0)
                || (typeof this.currentDwollaAutoPayAmount === "number" && !isNaN(this.currentDwollaAutoPayAmount) && this.currentDwollaAutoPayAmount > 1);
            // Temporarily disable while we figure out the contract
            this.shouldShowDwollaAutoPayArea = false;
            if (this.shouldShowDwollaAutoPayArea) {
                this.assessmentFrequencyInfo = PeriodicPaymentFrequencies.find(function (ppf) { return ppf.id === _this.siteInfo.privateSiteInfo.assessmentFrequency; });
            }
            this.paymentInfo =
                {
                    paymentType: "other",
                    amount: this.assessmentAmount,
                    note: "",
                    fundingType: null,
                    paysFor: []
                };
            this.onPaymentAmountChange();
            var MaxNumRecentPayments = 24;
            this.historicPayments = this.siteInfo.userInfo.recentPayments;
            if (this.historicPayments && this.historicPayments.length > 0) {
                if (this.historicPayments.length > MaxNumRecentPayments)
                    this.historicPayments = this.historicPayments.slice(0, MaxNumRecentPayments);
                // Fill up the list so there's always MaxNumRecentPayments
                //while( this.historicPayments.length < MaxNumRecentPayments )
                //    this.historicPayments.push( {} );
            }
            // If the user lives in a unit and assessments are enabled
            if (this.siteInfo.privateSiteInfo.assessmentFrequency != null
                && this.siteInfo.userInfo.usersUnits != null
                && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.paymentInfo.paymentType = "periodic";
                if (this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                    this.knowsNextPayment = true;
                    this.errorPayInfoText = "Is the amount or date incorrect?";
                    this.nextPaymentText = this.getNextPaymentText(this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue, this.siteInfo.privateSiteInfo.assessmentFrequency);
                    this.updatePaymentText();
                }
            }
            //if( this.isStripeEnabledOnGroup )
            //    this.$timeout( () => this.hookUpStripeCheckout(), 300 );
            //setTimeout( () =>
            //{
            //    $( '#btn_view_pay_history' ).click( function()
            //    {
            //        $( '#pm_info' ).collapse( 'hide' );
            //        $( '#payment_history' ).collapse( 'show' );
            //    } );
            //    $( '#btn_view_pay_info' ).click( function()
            //    {
            //        $( '#payment_history' ).collapse( 'hide' );
            //        $( '#pm_info' ).collapse( 'show' );
            //    } );
            //    $( '.hide' ).click( function()
            //    {
            //        $( this ).parent().hide( '' );
            //    } );
            //}, 400 );
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
                console.log("Failed to SignUpPrefill: " + errorResponse.data.exceptionMessage);
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
                console.log("Failed in CardTokenizationKey: " + errorResponse.data.exceptionMessage);
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
            this.$http.post("/api/Paragon/CheckPaymentSignUp", this.paragonSignUpInfo).then(function () {
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
            var paymentInfo = new ParagonPaymentRequest();
            paymentInfo.notes = this.paymentInfo.note;
            paymentInfo.paymentAmount = this.paymentInfo.amount;
            paymentInfo.paysFor = this.paymentInfo.paysFor;
            paymentInfo.paySource = paySource;
            this.isLoading_Payment = true;
            this.$http.post("/api/Paragon/MakePayment", paymentInfo).then(function () {
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
            this.$http.get("/api/Paragon/UnenrollPayment?paySource=" + paySource).then(function () {
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
        AssessmentPaymentFormController.prototype.submitWePayPayment = function (fundingTypeName) {
            var _this = this;
            this.isLoading_Payment = true;
            this.paymentInfo.fundingType = fundingTypeName;
            // Remove leading dollar signs
            var testAmount = this.paymentInfo.amount;
            if (HtmlUtil.isValidString(testAmount) && testAmount[0] === '$')
                this.paymentInfo.amount = parseFloat(testAmount.substr(1));
            analytics.track("makePayment", {
                fundingType: fundingTypeName
            });
            this.$http.post("/api/WePayPayment/MakeNewPayment", this.paymentInfo).then(function (httpResponse) {
                var checkoutInfo = httpResponse.data;
                if (checkoutInfo !== null && typeof (checkoutInfo.checkoutUri) === "string" && checkoutInfo.checkoutUri.length > 0) {
                    //if( checkoutInfo.pendingPaymentAmount )
                    //{
                    //    const pendingDateStr = moment( checkoutInfo.pendingPaymentDateUtc ).format("M/D/YYYY h:mma")
                    //    const pendingMessage = `You already have a pending payment of $${checkoutInfo.pendingPaymentAmount} made on ${pendingDateStr}. Would you still like to continue to a make a new payment?`;
                    //    if( !confirm( pendingMessage ) )
                    //    {
                    //        this.isLoading_Payment = false;
                    //        return;
                    //    }
                    //}
                    window.location.href = checkoutInfo.checkoutUri;
                }
                else {
                    _this.isLoading_Payment = false;
                    alert("Unable to initiate WePay checkout");
                }
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.prototype.getMyRecentPayments = function () {
            var _this = this;
            this.$http.get("/api/WePayPayment/MyRecentPayments").then(function (httpResponse) {
                _this.myRecentPayments = httpResponse.data;
            }, function (httpResponse) {
                console.log("Failed to retrieve recent payments: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the helper link to prep an email to inquire the board as to
         * why their records don't line up.
         */
        AssessmentPaymentFormController.prototype.onIncorrectPayDetails = function () {
            // Get the friendly looking assessment value (ex: 100, 101, 102.50)
            var amountString = this.assessmentAmount.toString();
            if (Math.round(this.assessmentAmount) != this.assessmentAmount)
                amountString = this.assessmentAmount.toFixed(2);
            // Tell the groupSendEmail component to prep an email for the board
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
            this.onPaymentAmountChange();
        };
        /**
         * Generate the friendly string describing to what the member's next payment applies
         */
        AssessmentPaymentFormController.prototype.getNextPaymentText = function (curPeriod, assessmentFrequency) {
            if (!curPeriod)
                return "";
            var paymentText = "";
            var frequencyInfo = FrequencyIdToInfo(assessmentFrequency);
            var periodNames = GetLongPayPeriodNames(frequencyInfo.intervalName);
            if (periodNames)
                paymentText = periodNames[curPeriod.period - 1];
            paymentText += " " + curPeriod.year;
            this.paymentInfo.paysFor = [curPeriod];
            return paymentText;
        };
        /**
         * Occurs when the user presses the button to setup auto-pay for assessments
         */
        AssessmentPaymentFormController.prototype.onSetupWePayAutoPay = function (fundingTypeName) {
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
                _this.isWePayAutoPayActive = false;
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Sign-up a user for Dwolla payments
         */
        AssessmentPaymentFormController.prototype.dwollaSignUp = function () {
            var _this = this;
            if (!this.didAgreeToDwollaTerms) {
                alert("Please agree to Dwolla's terms and privacy policy");
                return;
            }
            this.isLoading_Payment = true;
            this.$http.post("/api/Dwolla/CreatePayer", this.dwollaSignUpInfo).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Begin the Dwolla IAV (instant account verification) process
         */
        AssessmentPaymentFormController.prototype.dwollaStartIAV = function () {
            var _this = this;
            this.shouldShowDwollaAddAccountModal = true;
            this.shouldShowDwollaModalClose = false;
            this.isDwollaIavDone = false;
            this.isLoadingDwolla = true;
            var startIav = function (iavToken) {
                dwolla.configure(Ally.AppConfigInfo.dwollaEnvironmentName);
                dwolla.iav.start(iavToken, {
                    container: 'dwolla-iav-container',
                    stylesheets: [
                        'https://fonts.googleapis.com/css?family=Lato&subset=latin,latin-ext'
                    ],
                    microDeposits: true,
                    fallbackToMicroDeposits: true
                }, function (err, res) {
                    //console.log( 'Error: ' + JSON.stringify( err ) + ' -- Response: ' + JSON.stringify( res ) );
                    if (res && res._links && res._links["funding-source"] && res._links["funding-source"].href) {
                        var fundingSourceUri = res._links["funding-source"].href;
                        // Tell the server
                        _this.$http.put("/api/Dwolla/SetUserFundingSourceUri", { fundingSourceUri: fundingSourceUri }).then(function () {
                            _this.isDwollaIavDone = true;
                        }, function (httpResponse) {
                            _this.isLoadingDwolla = false;
                            _this.shouldShowDwollaModalClose = true;
                            alert("Failed to complete sign-up: " + httpResponse.data.exceptionMessage);
                        });
                    }
                });
            };
            this.$http.get("/api/Dwolla/UserIavToken").then(function (httpResponse) {
                _this.isLoadingDwolla = false;
                window.setTimeout(function () { return startIav(httpResponse.data.iavToken); }, 150);
            }, function (httpResponse) {
                _this.isLoadingDwolla = false;
                alert("Failed to start IAV: " + httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.prototype.hideDwollaAddAccountModal = function () {
            this.shouldShowDwollaAddAccountModal = false;
            if (this.isDwollaIavDone) {
                this.isLoading_Payment = true;
                window.location.reload();
            }
        };
        /**
         * Submit the user's Paragon bank account information
         */
        AssessmentPaymentFormController.prototype.submitDwollaPayment = function () {
            //if( !confirm( "This will submit payment." ) )
            //    return;
            var _this = this;
            this.dwollaPaymentMessage = null;
            this.isLoading_Payment = true;
            this.$http.post("/api/Dwolla/MakePayment", this.paymentInfo).then(function () {
                _this.isLoading_Payment = false;
                _this.dwollaPaymentMessage = "Payment Successfully Processed";
                _this.refreshHistoricPayments();
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                _this.dwollaPaymentMessage = "Payment failed: " + errorResponse.data.exceptionMessage;
            });
        };
        AssessmentPaymentFormController.prototype.refreshHistoricPayments = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.$http.get("/api/MyProfile/RecentPayments").then(function (response) {
                _this.isLoading_Payment = false;
                _this.historicPayments = response.data;
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                console.log("Failed to refresh rescent payments: " + errorResponse.data.exceptionMessage);
            });
        };
        /**
         * Unlink and remove a user's Dwolla funding source
         */
        AssessmentPaymentFormController.prototype.unlinkDwollaFundingSource = function () {
            var _this = this;
            if (!confirm("Are you sure you want to disconnect the bank account? You will no longer be able to make payments."))
                return;
            this.isLoading_Payment = true;
            this.$http.put("/api/Dwolla/DisconnectUserFundingSource", null).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to disconnect account" + httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.prototype.getDwollaFeeAmount = function (amount) {
            // dwollaFeePercent is in display percent, so 0.5 = 0.5% = 0.005 scalar
            // So we only need to divide by 100 to get our rounded fee
            var feeAmount = Math.ceil(amount * this.dwollaFeePercent) / 100;
            // Cap the fee at $5 for premium, $10 for free plan groups
            if (feeAmount > this.dwollaStripeMaxFee)
                feeAmount = this.dwollaStripeMaxFee;
            return feeAmount;
        };
        AssessmentPaymentFormController.prototype.getStripeFeeAmount = function (amount) {
            if (typeof amount === "string")
                amount = parseFloat(amount);
            if (isNaN(amount))
                amount = 0;
            if (!amount)
                return 0;
            var stripeFeeInfo = Ally.HtmlUtil2.getStripeFeeInfo(amount, this.siteInfo.privateSiteInfo.payerPaysAchFee, this.siteInfo.privateSiteInfo.isPremiumPlanActive);
            //let feeAmount: number;
            //if( this.siteInfo.privateSiteInfo.payerPaysAchFee )
            //{
            //    // dwollaFeePercent is in display percent, so 0.8 = 0.8% = 0.008 scalar
            //    // So we only need to divide by 100 to get our rounded fee
            //    const StripeAchFeePercent = 0.008;
            //    let totalWithFeeAmount = Math.round( ( amount * 100 ) / ( 1 - StripeAchFeePercent ) ) / 100;
            //    feeAmount = totalWithFeeAmount - amount;
            //    // Cap the fee at $5 for premium, $10 for free plan groups
            //    const MaxFeeAmount = 5;
            //    const useMaxFee = feeAmount > MaxFeeAmount;
            //    if( useMaxFee )
            //    {
            //        feeAmount = MaxFeeAmount;
            //        totalWithFeeAmount = amount + feeAmount;
            //    }
            //    if( !this.siteInfo.privateSiteInfo.isPremiumPlanActive )
            //    {
            //        if( useMaxFee )
            //            totalWithFeeAmount = amount + ( MaxFeeAmount * 2 );
            //        else
            //            totalWithFeeAmount = Math.round( ( totalWithFeeAmount * 100 ) / ( 1 - StripeAchFeePercent ) ) / 100;
            //        feeAmount = totalWithFeeAmount - amount;
            //        // This can happen at $618.12-$620.61
            //        //console.log( "feeAmount", feeAmount );
            //        if( feeAmount > MaxFeeAmount * 2 )
            //            feeAmount = MaxFeeAmount * 2;
            //    }
            //}
            //// Otherwise the group is paying the fee so the resident doesn not pay extra fee
            //else
            //    feeAmount = 0;
            return stripeFeeInfo.payerFee;
        };
        /**
         * Occurs when the amount to pay changes
         */
        AssessmentPaymentFormController.prototype.onPaymentAmountChange = function () {
            var dwollaFeeAmount = this.getDwollaFeeAmount(this.paymentInfo.amount);
            this.dwollaFeeAmountString = "$" + dwollaFeeAmount.toFixed(2);
            if (this.paymentInfo.amount) {
                var stripeFeeAmount = this.getStripeFeeAmount(this.paymentInfo.amount);
                if (!stripeFeeAmount)
                    this.stripeAchFeeAmountString = "No service fee";
                else
                    this.stripeAchFeeAmountString = "Stripe fee: $" + stripeFeeAmount.toFixed(2);
            }
            else
                this.stripeAchFeeAmountString = "";
        };
        /**
         * Occurs when the user clicks the button to upload their Dwolla identification document
         */
        AssessmentPaymentFormController.prototype.uploadDwollaDoc = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.dwollaDocUploadMessage = null;
            var formData = new FormData();
            formData.append("DocumentFile", this.dwollaDocUploadFile);
            formData.append("DocumentType", this.dwollaDocUploadType);
            var postHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            this.$http.post("/api/Dwolla/UploadCustomerDocument", formData, postHeaders).then(function () {
                _this.isLoading_Payment = false;
                _this.dwollaDocUploadFile = null;
                _this.dwollaDocUploadMessage = "Your document has been successfully uploaded. You will be notified when it is reviewed.";
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to upload document: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user selects a file for upload to Dwolla
         */
        AssessmentPaymentFormController.prototype.onDwollaDocSelected = function (event) {
            if (!event)
                this.dwollaDocUploadFile = null;
            else
                this.dwollaDocUploadFile = event.target.files[0];
        };
        /**
         * Occurs when the user clicks the button to withdraw their Dwolla balance
         */
        AssessmentPaymentFormController.prototype.withdrawDwollaBalance = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.dwollaBalanceMessage = null;
            this.$http.get("/api/Dwolla/WithdrawDwollaBalance").then(function () {
                _this.isLoading_Payment = false;
                _this.dwollaBalanceMessage = "Balance withdraw successfully initiated. Expect the transfer to complete in 1-2 business days.";
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to initiate withdraw: " + httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.prototype.submitDwollaMicroDepositAmounts = function () {
            var _this = this;
            this.isLoading_Payment = true;
            var postData = {
                amount1String: this.dwollaMicroDepositAmount1String,
                amount2String: this.dwollaMicroDepositAmount2String,
                isForGroup: false
            };
            this.$http.post("/api/Dwolla/VerifyMicroDeposit", postData).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to verify: " + httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.prototype.reloadPage = function () {
            this.isLoading_Payment = true;
            window.location.reload();
        };
        AssessmentPaymentFormController.prototype.enableDwollaAutoPay = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.$http.put("/api/Dwolla/EnableAutoPay/" + encodeURIComponent(this.assessmentAmount.toString()), null).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to enable Dwolla auto-pay: " + httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.prototype.disableDwollaAutoPay = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.$http.put("/api/Dwolla/DisableAutoPay", null).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to disable Dwolla auto-pay: " + httpResponse.data.exceptionMessage);
            });
        };
        //hookUpStripeCheckout()
        //{
        //    const style = {
        //        base: {
        //            color: "#32325d",
        //            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        //            fontSmoothing: "antialiased",
        //            fontSize: "16px",
        //            "::placeholder": {
        //                color: "#aab7c4"
        //            }
        //        },
        //        invalid: {
        //            color: "#fa755a",
        //            iconColor: "#fa755a"
        //        }
        //    };
        //    const stripeCheckoutOptions = {
        //        mode: 'payment',
        //        amount: 15 * 100,
        //        currency: 'usd',
        //        // Fully customizable with appearance API.
        //        appearance: {}
        //    };
        //    this.stripeElements = this.stripeApi.elements( stripeCheckoutOptions );
        //    this.stripeCardElement = this.stripeElements.create( "payment" );
        //    this.stripeCardElement.mount( "#stripe-card-element" );
        //    const onCardChange = ( event: any ) =>
        //    {
        //        if( event.error )
        //            this.showStripeError( event.error.message );
        //        else
        //            this.showStripeError( null );
        //    }
        //    this.stripeCardElement.on( 'change', onCardChange );
        //}
        AssessmentPaymentFormController.prototype.showStripeError = function (errorMessage) {
            var displayError = document.getElementById('card-errors');
            if (HtmlUtil.isNullOrWhitespace(errorMessage))
                displayError.textContent = null; //'Unknown Error';
            else
                displayError.textContent = errorMessage;
        };
        AssessmentPaymentFormController.prototype.startStripeCardPayment = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    this.stripeElements.update({ amount: Math.floor(this.paymentInfo.amount * 100) });
                    // Trigger form validation and wallet collection
                    this.stripeElements.submit().then(function () {
                        _this.isLoading_Payment = true;
                        _this.$http.post("/api/StripePayments/StartPaymentIntent", _this.paymentInfo).then(function (response) { return __awaiter(_this, void 0, void 0, function () {
                            var error;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.stripeApi.confirmPayment({
                                            elements: this.stripeElements,
                                            clientSecret: response.data,
                                            confirmParams: {
                                                return_url: this.siteInfo.publicSiteInfo.baseUrl + "/#!/Home",
                                            },
                                        })];
                                    case 1:
                                        error = (_a.sent()).error;
                                        return [2 /*return*/];
                                }
                            });
                        }); }, function (errorResponse) {
                            _this.isLoading_Payment = false;
                            console.log("Failed to SignUpPrefill: " + errorResponse.data.exceptionMessage);
                            alert("Failed to start payment: " + errorResponse.data.exceptionMessage);
                        });
                    }, function (error) {
                        console.log("Stripe error", error);
                    });
                    return [2 /*return*/];
                });
            });
        };
        /**
         * Complete the Stripe-Plaid ACH-linking flow
         */
        AssessmentPaymentFormController.prototype.completePlaidAchConnection = function (accessToken, accountId) {
            var _this = this;
            this.isLoading_Payment = true;
            var postData = {
                accessToken: accessToken,
                selectedAccountIds: [accountId]
            };
            this.$http.post("/api/PlaidMember/ProcessUserStripeAccessToken", postData).then(function () {
                _this.isLoading_Payment = false;
                console.log("Account successfully linked, reloading...");
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to link account: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Start the Stripe-Plaid ACH-linking flow
         */
        AssessmentPaymentFormController.prototype.startPlaidAchConnection = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.$http.get("/api/PlaidMember/StripeLinkToken").then(function (httpResponse) {
                if (!httpResponse.data) {
                    _this.isLoading_Payment = false;
                    alert("Failed to start Plaid connection. Please contact support.");
                    return;
                }
                var plaidConfig = {
                    token: httpResponse.data,
                    onSuccess: function (public_token, metadata) {
                        //console.log( "PlaidMember StripeLinkToken onSuccess", metadata );
                        _this.completePlaidAchConnection(public_token, metadata.account_id);
                    },
                    onLoad: function () {
                        // Need to wrap this in a $scope.using because th Plaid.create call is invoked by vanilla JS, not AngularJS
                        _this.$scope.$apply(function () {
                            _this.isLoading_Payment = false;
                        });
                    },
                    onExit: function (err, metadata) {
                        //console.log( "update onExit.err", err, metadata );
                        // Need to wrap this in a $scope.using because th Plaid.create call is invoked by vanilla JS, not AngularJS
                        _this.$scope.$apply(function () {
                            _this.isLoading_Payment = false;
                        });
                    },
                    onEvent: function (eventName, metadata) {
                        console.log("update onEvent.eventName", eventName, metadata);
                    },
                    receivedRedirectUri: null,
                };
                var plaidHandler = Plaid.create(plaidConfig);
                plaidHandler.open();
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to start Plaid connection: " + httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.prototype.makeStripeAchPayment = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.$http.post("/api/StripePayments/StartPaymentIntent", this.paymentInfo).then(function (response) {
                var intentClientSecret = response.data;
                _this.stripeApi.confirmUsBankAccountPayment(intentClientSecret, {
                    payment_method: _this.siteInfo.userInfo.stripeBankAccountId,
                }).then(function (result) {
                    // Need to wrap this in a $scope.using because the confirmUsBankAccountPayment event is invoked by vanilla JS, not AngularJS
                    _this.$scope.$apply(function () {
                        _this.isLoading_Payment = false;
                        _this.stripePaymentSucceeded = true;
                    });
                    if (result.error) {
                        // Inform the customer that there was an error.
                        console.log(result.error.message);
                    }
                    else {
                        //TODO Success
                        // Handle next step based on PaymentIntent's status.
                        console.log("PaymentIntent ID: " + result.paymentIntent.id);
                        console.log("PaymentIntent status: " + result.paymentIntent.status);
                    }
                }, function (error) {
                    // Need to wrap this in a $scope.using because th confirmUsBankAccountPayment event is invoked by vanilla JS, not Angular
                    _this.$scope.$apply(function () {
                        _this.isLoading_Payment = false;
                    });
                    console.log("Stripe Failed", error);
                    alert("Stripe Failed: " + error);
                });
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                console.log("Failed to SignUpPrefill: " + errorResponse.data.exceptionMessage);
                alert("Failed to start payment: " + errorResponse.data.exceptionMessage);
            });
        };
        /**
         * Unlink and remove a user's Stripe funding source
         */
        AssessmentPaymentFormController.prototype.unlinkStripeFundingSource = function () {
            var _this = this;
            if (!confirm("Are you sure you want to disconnect the bank account? You will no longer be able to make payments."))
                return;
            this.isLoading_Payment = true;
            this.$http.delete("/api/StripePayments/RemoveBankAccount").then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to disconnect account" + httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.$inject = ["$http", "SiteInfo", "$rootScope", "$sce", "$timeout", "$q", "$scope"];
        return AssessmentPaymentFormController;
    }());
    Ally.AssessmentPaymentFormController = AssessmentPaymentFormController;
    var CheckoutRequest = /** @class */ (function () {
        function CheckoutRequest() {
        }
        return CheckoutRequest;
    }());
    var DwollaAccountStatusInfo = /** @class */ (function () {
        function DwollaAccountStatusInfo() {
        }
        return DwollaAccountStatusInfo;
    }());
    var MakePaymentRequest = /** @class */ (function () {
        function MakePaymentRequest() {
        }
        return MakePaymentRequest;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("assessmentPaymentForm", {
    templateUrl: "/ngApp/common/assessment-payment-form.html",
    controller: Ally.AssessmentPaymentFormController
});
var CreateDwollaUser = /** @class */ (function () {
    function CreateDwollaUser() {
    }
    return CreateDwollaUser;
}());
var ParagonPayerSignUpInfo = /** @class */ (function () {
    function ParagonPayerSignUpInfo() {
        this.billingAddress = new Ally.FullAddress();
        this.checkType = "PERSONAL";
        this.accountType = "CHECKING";
    }
    return ParagonPayerSignUpInfo;
}());
var ParagonPaymentRequest = /** @class */ (function () {
    function ParagonPaymentRequest() {
    }
    return ParagonPaymentRequest;
}());

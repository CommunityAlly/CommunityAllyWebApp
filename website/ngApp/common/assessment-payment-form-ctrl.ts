declare var dwolla: any;
declare var PeriodicPaymentFrequencies: Ally.PeriodicPaymentFrequency[];

namespace Ally
{
    /**
     * The controller for the widget that lets residents pay their assessments
     */
    export class AssessmentPaymentFormController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$rootScope", "$sce", "$timeout", "$q"];

        isLoading_Payment: boolean = false;
        isLoadingDwolla: boolean = false;
        assessmentCreditCardFeeLabel: string;
        assessmentAchFeeLabel: string;
        errorPayInfoText: string;
        payerPaysAchFee: boolean;
        isWePaySetup: boolean;
        hasAssessments: boolean;
        assessmentFrequency: number;
        allyAppName: string;
        isWePayAutoPayActive: boolean;
        nextAutoPayText: string;
        autoPayFrequencyLabel: string;
        assessmentFrequencyInfo: PeriodicPaymentFrequency;
        paymentInfo: MakePaymentRequest;
        myRecentPayments: ElectronicPayment[];
        historicPayments: RecentPayment[];
        assessmentAmount: number;
        nextPaymentText: string;
        knowsNextPayment: boolean;
        paragonCheckingLast4: string;
        paragonCardLast4: string;
        paragonPaymentParams: string;
        showParagon: boolean = false;
        showParagonCheckingSignUpModal: boolean = false;
        showParagonCreditSignUpModal: boolean = false;
        paragonSignUpInfo: ParagonPayerSignUpInfo;
        paragonSignUpError: string;
        paragonPaymentMessage: string;
        paragonCardTokenizedUrl: string;
        paragonCardTokenizationMessage: string;
        dwollaSignUpInfo: CreateDwollaUser = {
            dateOfBirth: "",
            ssnLast4: "",
            ssnFull: "",
            streetAddress: new FullAddress()
        };
        isWePayPaymentActive: boolean = false;
        isDwollaEnabledOnGroup: boolean = false;
        isDwollaReadyForPayment: boolean = false;
        isDwollaUserAccountVerified: boolean;
        hasDwollaFundingSource: boolean;
        dwollaUserStatus: string;
        userFullName: string;
        userEmail: string;
        shouldShowDwollaAddAccountModal: boolean = false;
        shouldShowDwollaModalClose: boolean = false;
        dwollaPaymentMessage: string;
        hasComplexPassword: boolean = false;
        didAgreeToDwollaTerms: boolean = false;
        dwollaFundingSourceName: string;
        dwollaFundingSourceIsVerified: boolean;
        dwollaFeePercent: number = 0.5;
        dwollaMaxFee: number = 5;
        dwollaFeeAmountString: string;
        dwollaDocUploadType: string = "license";
        dwollaDocUploadFile: File = null;
        dwollaDocUploadMessage: string;
        dwollaBalance: number = -1;
        dwollaBalanceMessage: string;
        isDwollaIavDone: boolean = false;
        shouldShowMicroDepositModal: boolean = false;
        dwollaMicroDepositAmount1String: string = "0.01";
        dwollaMicroDepositAmount2String: string = "0.01";
        shouldShowOwnerFinanceTxn: boolean = false;
        shouldShowDwollaAutoPayArea: boolean = true;
        currentDwollaAutoPayAmount: number | null = null;
        customFinancialInstructions: string;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private $rootScope: ng.IRootScopeService,
            private $sce: ng.ISCEService,
            private $timeout: ng.ITimeoutService,
            private $q: ng.IQService )
        {
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            this.showParagon = false;//this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.emailAddress === "president@mycondoally.com";
            this.paragonPaymentParams = `&BillingAddress1=${encodeURIComponent( "900 W Ainslie St" )}&BillingState=Illinois&BillingCity=Chicago&BillingZip=60640&FirstName=${encodeURIComponent( this.siteInfo.userInfo.firstName )}&LastName=${encodeURIComponent( this.siteInfo.userInfo.lastName )}`;
            this.paragonCheckingLast4 = this.siteInfo.userInfo.paragonCheckingLast4;
            this.paragonCardLast4 = this.siteInfo.userInfo.paragonCardLast4;

            this.isWePayPaymentActive = this.siteInfo.privateSiteInfo.isWePayPaymentActive;
            const shouldShowDwolla = true; //AppConfigInfo.dwollaPreviewShortNames.indexOf( this.siteInfo.publicSiteInfo.shortName ) > -1;
            if( shouldShowDwolla )
                this.isDwollaEnabledOnGroup = this.siteInfo.privateSiteInfo.isDwollaPaymentActive;
            this.dwollaFeePercent = this.siteInfo.privateSiteInfo.isPremiumPlanActive ? 0.5 : 1;
            this.dwollaMaxFee = this.siteInfo.privateSiteInfo.isPremiumPlanActive ? 5 : 10;
            this.shouldShowOwnerFinanceTxn = this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn;
            this.currentDwollaAutoPayAmount = this.siteInfo.userInfo.dwollaAutoPayAmount;
            if( this.siteInfo.privateSiteInfo.customFinancialInstructions )
                this.customFinancialInstructions = this.$sce.trustAsHtml( this.siteInfo.privateSiteInfo.customFinancialInstructions );

            if( this.isDwollaEnabledOnGroup )
            {
                this.isDwollaUserAccountVerified = this.siteInfo.userInfo.isDwollaAccountVerified;
                if( this.isDwollaUserAccountVerified )
                {
                    this.dwollaUserStatus = "verified";
                    this.hasDwollaFundingSource = HtmlUtil2.isValidString( this.siteInfo.userInfo.dwollaFundingSourceName );

                    if( !this.hasDwollaFundingSource )
                    {
                        this.$http.get( "/api/Dwolla/HasComplexPassword" ).then(
                            ( response: ng.IHttpPromiseCallbackArg<boolean> ) => this.hasComplexPassword = response.data
                        );
                    }
                    else
                    {
                        this.dwollaFundingSourceName = this.siteInfo.userInfo.dwollaFundingSourceName;
                        this.dwollaFundingSourceIsVerified = this.siteInfo.userInfo.dwollaFundingSourceIsVerified;
                        this.isDwollaReadyForPayment = this.isDwollaUserAccountVerified && this.dwollaFundingSourceIsVerified && this.siteInfo.privateSiteInfo.isDwollaPaymentActive;

                        if( this.isDwollaReadyForPayment )
                        {
                            // Check the user's Dwolla balance, delayed since it's not important
                            this.$timeout( () =>
                            {
                                this.$http.get( "/api/Dwolla/DwollaBalance" ).then(
                                    ( response: ng.IHttpPromiseCallbackArg<any> ) => this.dwollaBalance = response.data.balanceAmount
                                );
                            }, 1000 );
                        }

                    }
                }
                else
                {
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

                    const checkDwollaStatus = () =>
                    {
                        this.$http.get( "/api/Dwolla/MyAccountStatus" ).then(
                            ( response: ng.IHttpPromiseCallbackArg<DwollaAccountStatusInfo> ) =>
                            {
                                this.dwollaUserStatus = response.data.status;
                                this.dwollaSignUpInfo.streetAddress = response.data.streetAddress;

                                //if( this.dwollaUserStatus === "document" )
                                //    getDwollaDocUploadToken();
                            },
                            ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                            {
                                this.dwollaUserStatus = "error";
                                console.log( "Failed to get Dwolla account status: " + errorResponse.data.exceptionMessage );
                            }
                        );
                    };

                    this.$timeout( () => checkDwollaStatus(), 500 );
                }
            }

            this.allyAppName = AppConfig.appName;
            this.isWePayAutoPayActive = this.siteInfo.userInfo.isAutoPayActive;
            this.assessmentCreditCardFeeLabel = this.siteInfo.privateSiteInfo.payerPaysCCFee ? "Service fee applies" : "No service fee";
            this.assessmentAchFeeLabel = this.siteInfo.privateSiteInfo.payerPaysAchFee ? "Service fee applies" : "No service fee";
            this.payerPaysAchFee = this.siteInfo.privateSiteInfo.payerPaysAchFee;
            this.errorPayInfoText = "Is the amount incorrect?";
            this.isWePaySetup = this.siteInfo.privateSiteInfo.isPaymentEnabled;
            this.hasAssessments = this.siteInfo.privateSiteInfo.hasAssessments;
            this.assessmentFrequency = this.siteInfo.privateSiteInfo.assessmentFrequency;

            if( !this.isWePayAutoPayActive && HtmlUtil.isNumericString( HtmlUtil.GetQueryStringParameter( "preapproval_id" ) ) )
            {
                // The user just set up auto-pay and it may take a second
                this.isWePayAutoPayActive = true;
            }

            this.nextAutoPayText = this.siteInfo.userInfo.nextAutoPayText;
            
            // Grab the assessment from the user's unit (TODO handle multiple units)
            if( this.siteInfo.userInfo.usersUnits != null && this.siteInfo.userInfo.usersUnits.length > 0 )
            {
                this.assessmentAmount = this.siteInfo.userInfo.usersUnits
                    .filter( uu => !uu.isRenter )
                    .reduce( ( total, uu ) => total + ( uu.assessment || 0 ), 0 );
            }
            else
                this.assessmentAmount = 0;

            // Show the Dwolla auto-pay area if the group's Dwolla is setup and
            // assessment frequncy is defined, or if the user already has auto-pay
            this.shouldShowDwollaAutoPayArea = ( this.isDwollaReadyForPayment
                && this.siteInfo.userInfo.emailAddress === "taylon5@gmail.com"
                && this.siteInfo.privateSiteInfo.assessmentFrequency != null
                && this.assessmentAmount > 0 )
                || ( typeof this.currentDwollaAutoPayAmount === "number" && !isNaN( this.currentDwollaAutoPayAmount ) && this.currentDwollaAutoPayAmount > 1 );

            if( this.shouldShowDwollaAutoPayArea )
            {
                this.assessmentFrequencyInfo = PeriodicPaymentFrequencies.find( ppf => ppf.id === this.siteInfo.privateSiteInfo.assessmentFrequency );
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

            const MaxNumRecentPayments: number = 24;
            this.historicPayments = this.siteInfo.userInfo.recentPayments;
            if( this.historicPayments && this.historicPayments.length > 0 )
            {
                if( this.historicPayments.length > MaxNumRecentPayments )
                    this.historicPayments = this.historicPayments.slice( 0, MaxNumRecentPayments );

                // Fill up the list so there's always MaxNumRecentPayments
                //while( this.historicPayments.length < MaxNumRecentPayments )
                //    this.historicPayments.push( {} );
            }

            // If the user lives in a unit and assessments are enabled
            if( this.siteInfo.privateSiteInfo.assessmentFrequency != null
                && this.siteInfo.userInfo.usersUnits != null
                && this.siteInfo.userInfo.usersUnits.length > 0 )
            {
                this.paymentInfo.paymentType = "periodic";

                if( this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled )
                {
                    this.knowsNextPayment = true;
                    this.errorPayInfoText = "Is the amount or date incorrect?";

                    this.nextPaymentText = this.getNextPaymentText( this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue,
                        this.siteInfo.privateSiteInfo.assessmentFrequency );

                    this.updatePaymentText();
                }
            }

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
        }


        /**
         * Display the Paragon payment sign-up modal, with pre-population of data
         */
        showParagonSignUp()
        {
            this.showParagonCheckingSignUpModal = true;

            if( this.paragonSignUpInfo )
                return;

            // Pre-populate the user's info
            this.isLoading_Payment = true;

            this.$http.get( "/api/Paragon/SignUpPrefill" ).then(
                ( response: ng.IHttpPromiseCallbackArg<ParagonPayerSignUpInfo> ) =>
                {
                    this.isLoading_Payment = false;
                    this.paragonSignUpInfo = response.data;

                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    this.paragonSignUpInfo = new ParagonPayerSignUpInfo();
                    console.log( "Failed to SignUpPrefill: " + errorResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Submit the user's Paragon bank account information
         */
        showParagonCreditSignUp()
        {
            this.isLoading_Payment = true;
            this.paragonCardTokenizedUrl = null;
            this.paragonCardTokenizationMessage = "Connecting...";
            this.showParagonCreditSignUpModal = true;

            //this.paragonCardTokenizedUrl = this.$sce.trustAsResourceUrl( "https://login.mycondoally.com/api/PublicParagon/FinishCardTokenization2" );
            //this.isLoading_Payment = false;


            this.$http.get( "/api/Paragon/CardTokenizationKey" ).then(
                ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    this.isLoading_Payment = false;
                    this.paragonCardTokenizedUrl = this.$sce.trustAsResourceUrl( "https://stage.paragonsolutions.com/ws/hosted.aspx?Username=54cE7DU2p%2bBh7h9uwJWW8Q%3d%3d&Password=jYvmN41tt1lz%2bpiazUqQYK9Abl73Z%2bHoBG4vOZImo%2bYlKTbPeNPwOcMB0%2bmIS3%2bs&MerchantKey=1293&InvNum=" + response.data );
                    this.paragonCardTokenizationMessage = null;

                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    this.paragonCardTokenizationMessage = "There was an error connecting to the server. Please close this window and try again. If this has happened more than once please contact support.";
                    console.log( "Failed in CardTokenizationKey: " + errorResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Hide the paragon window, reloading the page if needed
         */
        hideParagonCreditSignUp()
        {
            this.showParagonCreditSignUpModal = false;

            // Reload the page to refresh the payment info
            if( this.paragonCardTokenizedUrl )
                window.location.reload();
        }


        /**
         * Submit the user's Paragon bank account information
         */
        submitParagonSignUp()
        {
            this.isLoading_Payment = true;
            this.paragonSignUpError = null;

            this.$http.post( "/api/Paragon/CheckPaymentSignUp", this.paragonSignUpInfo ).then(
                () =>
                {
                    // Reload the page to refresh the payment info. We don't really need to do this,
                    // but makes sure the UI is up to date a little better as well updates the
                    // siteInfo object.
                    window.location.reload();

                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    this.paragonSignUpError = errorResponse.data.exceptionMessage;
                }
            );
        }


        /**
         * Submit the user's Paragon bank account information
         */
        submitParagonPayment( paySource: string )
        {
            if( !confirm( "This will submit payment." ) )
                return;

            this.paragonPaymentMessage = null;

            const paymentInfo = new ParagonPaymentRequest();
            paymentInfo.notes = this.paymentInfo.note;
            paymentInfo.paymentAmount = this.paymentInfo.amount;
            paymentInfo.paysFor = this.paymentInfo.paysFor;
            paymentInfo.paySource = paySource;

            this.isLoading_Payment = true;

            this.$http.post( "/api/Paragon/MakePayment", paymentInfo ).then(
                () =>
                {
                    this.isLoading_Payment = false;
                    this.paragonPaymentMessage = "Payment Successfully Processed";

                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    this.paragonPaymentMessage = errorResponse.data.exceptionMessage;
                }
            );
        }


        /**
         * Un-enroll a certain payment source from Paragon payments
         */
        unenrollParagonAccount( paySource: string )
        {
            this.isLoading_Payment = true;

            this.$http.get( "/api/Paragon/UnenrollPayment?paySource=" + paySource ).then(
                () =>
                {
                    // Reload the page to see the change
                    window.location.reload();

                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to un-enroll: " + errorResponse.data.exceptionMessage );
                    this.paragonPaymentMessage = errorResponse.data.exceptionMessage;
                }
            );
        }


        /**
         * Occurs when the user presses the button to make a payment to their organization
         */
        submitWePayPayment( fundingTypeName: string )
        {
            this.isLoading_Payment = true;
            this.paymentInfo.fundingType = fundingTypeName;

            // Remove leading dollar signs
            const testAmount = this.paymentInfo.amount as any;
            if( HtmlUtil.isValidString( testAmount ) && ( testAmount as string )[0] === '$' )
                this.paymentInfo.amount = parseFloat( testAmount.substr( 1 ) );

            analytics.track( "makePayment", {
                fundingType: fundingTypeName
            } );

            this.$http.post( "/api/WePayPayment/MakeNewPayment", this.paymentInfo ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<CheckoutRequest> ) =>
                {
                    const checkoutInfo = httpResponse.data;

                    if( checkoutInfo !== null && typeof ( checkoutInfo.checkoutUri ) === "string" && checkoutInfo.checkoutUri.length > 0 )
                    {
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
                    else
                    {
                        this.isLoading_Payment = false;
                        alert( "Unable to initiate WePay checkout" );
                    }

                },
                ( httpResponse: any ) =>
                {
                    this.isLoading_Payment = false;

                    if( httpResponse.data && httpResponse.data.exceptionMessage )
                        alert( httpResponse.data.exceptionMessage );
                }
            );
        }


        getMyRecentPayments()
        {
            this.$http.get( "/api/WePayPayment/MyRecentPayments" ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<ElectronicPayment[]> ) =>
                {
                    this.myRecentPayments = httpResponse.data;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    console.log( "Failed to retrieve recent payments: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user clicks the helper link to prep an email to inquire the board as to
         * why their records don't line up.
         */
        onIncorrectPayDetails()
        {
            // Get the friendly looking assessment value (ex: 100, 101, 102.50)
            let amountString = this.assessmentAmount.toString();
            if( Math.round( this.assessmentAmount ) != this.assessmentAmount )
                amountString = this.assessmentAmount.toFixed( 2 );

            // Tell the groupSendEmail component to prep an email for the board
            let prepEventData = amountString;
            if( this.knowsNextPayment && HtmlUtil.isValidString( this.nextPaymentText ) )
                prepEventData += "|" + this.nextPaymentText;

            this.$rootScope.$broadcast( "prepAssessmentEmailToBoard", prepEventData );
        }


        /**
         * Refresh the note text for the payment field
         */
        updatePaymentText()
        {
            if( this.paymentInfo.paymentType === "periodic" && this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled )
            {
                // If we have a next payment string
                if( !HtmlUtil.isNullOrWhitespace( this.nextPaymentText ) )
                {
                    if( this.siteInfo.userInfo.usersUnits[0].includesLateFee )
                        this.paymentInfo.note = "Assessment payment with late fee for ";
                    else
                        this.paymentInfo.note = "Assessment payment for ";

                    this.paymentInfo.note += this.nextPaymentText;
                }
            }
            else
            {
                this.paymentInfo.note = "";
            }
        }


        /**
         * Occurs when the user selects a payment type radio button
         */
        onSelectPaymentType( paymentType: string )
        {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType == "periodic" ? this.assessmentAmount : 0;
            
            this.updatePaymentText();
            this.onPaymentAmountChange();
        }


        /**
         * Generate the friendly string describing to what the member's next payment applies
         */
        getNextPaymentText( curPeriod: Ally.PayPeriod, assessmentFrequency: number )
        {
            if( !curPeriod )
                return "";

            let paymentText = "";

            const frequencyInfo = FrequencyIdToInfo( assessmentFrequency );

            const periodNames = GetLongPayPeriodNames( frequencyInfo.intervalName );
            if( periodNames )
                paymentText = periodNames[curPeriod.period - 1];

            paymentText += " " + curPeriod.year;

            this.paymentInfo.paysFor = [curPeriod];

            return paymentText;
        }


        /**
         * Occurs when the user presses the button to setup auto-pay for assessments
         */
        onSetupWePayAutoPay( fundingTypeName: string )
        {
            this.isLoading_Payment = true;

            this.$http.get( "/api/WePayPayment/SetupAutoPay?fundingType=" + fundingTypeName ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    const redirectUrl = httpResponse.data;

                    if( typeof ( redirectUrl ) === "string" && redirectUrl.length > 0 )
                        window.location.href = redirectUrl;
                    else
                    {
                        this.isLoading_Payment = false;
                        alert( "Unable to initiate WePay auto-pay setup" );
                    }

                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;

                    if( httpResponse.data && httpResponse.data.exceptionMessage )
                        alert( httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user clicks the button to disable auto-pay
         */
        onDisableAutoPay()
        {
            if( !confirm( "Just to double check, this will disable your auto-payment. You need to make sure to manually make your regular payments to avoid any late fees your association may enforce." ) )
                return;

            this.isLoading_Payment = true;

            this.$http.get( "/api/WePayPayment/DisableAutoPay" ).then( () =>
            {
                this.isLoading_Payment = false;
                this.isWePayAutoPayActive = false;

            }, ( httpResponse ) =>
            {
                this.isLoading_Payment = false;

                if( httpResponse.data && httpResponse.data.exceptionMessage )
                    alert( httpResponse.data.exceptionMessage );
            } );
        }


        /**
         * Sign-up a user for Dwolla payments
         */
        dwollaSignUp()
        {
            if( !this.didAgreeToDwollaTerms )
            {
                alert( "Please agree to Dwolla's terms and privacy policy" );
                return;
            }

            this.isLoading_Payment = true;

            this.$http.post( "/api/Dwolla/CreatePayer", this.dwollaSignUpInfo ).then( () =>
            {
                window.location.reload();

            }, ( httpResponse ) =>
            {
                this.isLoading_Payment = false;

                if( httpResponse.data && httpResponse.data.exceptionMessage )
                    alert( httpResponse.data.exceptionMessage );
            } );
        }


        /**
         * Begin the Dwolla IAV (instant account verification) process
         */
        dwollaStartIAV()
        {
            this.shouldShowDwollaAddAccountModal = true;
            this.shouldShowDwollaModalClose = false;
            this.isDwollaIavDone = false;
            this.isLoadingDwolla = true;

            const startIav = ( iavToken: string ) =>
            {
                dwolla.configure( AppConfigInfo.dwollaEnvironmentName );

                dwolla.iav.start( iavToken,
                    {
                        container: 'dwolla-iav-container',
                        stylesheets: [
                            'https://fonts.googleapis.com/css?family=Lato&subset=latin,latin-ext'
                        ],
                        microDeposits: true,
                        fallbackToMicroDeposits: true
                    },
                    ( err: any, res: any ) =>
                    {
                        //console.log( 'Error: ' + JSON.stringify( err ) + ' -- Response: ' + JSON.stringify( res ) );

                        if( res && res._links && res._links["funding-source"] && res._links["funding-source"].href )
                        {
                            const fundingSourceUri = res._links["funding-source"].href;

                            // Tell the server
                            this.$http.put( "/api/Dwolla/SetUserFundingSourceUri", { fundingSourceUri } ).then(
                                () =>
                                {
                                    this.isDwollaIavDone = true;
                                },
                                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                                {
                                    this.isLoadingDwolla = false;
                                    this.shouldShowDwollaModalClose = true;
                                    alert( "Failed to complete sign-up: " + httpResponse.data.exceptionMessage );
                                }
                            );
                        }
                    }
                );
            };

            this.$http.get( "/api/Dwolla/UserIavToken" ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoadingDwolla = false;

                    window.setTimeout( () => startIav( httpResponse.data.iavToken ), 150 );
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoadingDwolla = false;

                    alert( "Failed to start IAV: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        hideDwollaAddAccountModal()
        {
            this.shouldShowDwollaAddAccountModal = false;

            if( this.isDwollaIavDone )
            {
                this.isLoading_Payment = true;
                window.location.reload();
            }
        }


        /**
         * Submit the user's Paragon bank account information
         */
        submitDwollaPayment()
        {
            //if( !confirm( "This will submit payment." ) )
            //    return;

            this.dwollaPaymentMessage = null;

            this.isLoading_Payment = true;

            this.$http.post( "/api/Dwolla/MakePayment", this.paymentInfo ).then(
                () =>
                {
                    this.isLoading_Payment = false;
                    this.dwollaPaymentMessage = "Payment Successfully Processed";

                    this.refreshHistoricPayments();
                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    this.dwollaPaymentMessage = "Payment failed: " + errorResponse.data.exceptionMessage;
                }
            );
        }


        refreshHistoricPayments()
        {
            this.isLoading_Payment = true;

            this.$http.get( "/api/MyProfile/RecentPayments" ).then(
                ( response: ng.IHttpPromiseCallbackArg<RecentPayment[]> ) =>
                {
                    this.isLoading_Payment = false;
                    this.historicPayments = response.data;
                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    console.log( "Failed to refresh rescent payments: " + errorResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Unlink and remove a user's Dwolla funding source
         */
        unlinkDwollaFundingSource()
        {
            if( !confirm( "Are you sure you want to disconnect the bank account? You will no longer be able to make payments." ) )
                return;

            this.isLoading_Payment = true;

            this.$http.put( "/api/Dwolla/DisconnectUserFundingSource", null ).then(
                () =>
                {
                    window.location.reload();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to disconnect account" + httpResponse.data.exceptionMessage );
                }
            );
        }


        getFeeAmount( amount: number )
        {
            // dwollaFeePercent is in display percent, so 0.5 = 0.5% = 0.005 scalar
            // So we only need to divide by 100 to get our rounded fee
            let feeAmount = Math.ceil( amount * this.dwollaFeePercent ) / 100;

            // Cap the fee at $5 for premium, $10 for free plan groups
            if( feeAmount > this.dwollaMaxFee )
                feeAmount = this.dwollaMaxFee;

            return feeAmount;
        }


        /**
         * Occurs when the amount to pay changes
         */
        onPaymentAmountChange()
        {
            const feeAmount = this.getFeeAmount( this.paymentInfo.amount );

            this.dwollaFeeAmountString = "$" + feeAmount.toFixed( 2 );
        }


        /**
         * Occurs when the user clicks the button to upload their Dwolla identification document
         */
        uploadDwollaDoc()
        {
            this.isLoading_Payment = true;
            this.dwollaDocUploadMessage = null;

            const formData = new FormData();
            formData.append( "DocumentFile", this.dwollaDocUploadFile );
            formData.append( "DocumentType", this.dwollaDocUploadType );

            const postHeaders: ng.IRequestShortcutConfig = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };

            this.$http.post( "/api/Dwolla/UploadCustomerDocument", formData, postHeaders ).then(
                () =>
                {
                    this.isLoading_Payment = false;
                    this.dwollaDocUploadFile = null;
                    this.dwollaDocUploadMessage = "Your document has been successfully uploaded. You will be notified when it is reviewed.";
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to upload document: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user selects a file for upload to Dwolla
         */
        onDwollaDocSelected( event: any )
        {
            if( !event )
                this.dwollaDocUploadFile = null;
            else
                this.dwollaDocUploadFile = event.target.files[0];
        }


        /**
         * Occurs when the user clicks the button to withdraw their Dwolla balance
         */
        withdrawDwollaBalance()
        {
            this.isLoading_Payment = true;
            this.dwollaBalanceMessage = null;

            this.$http.get( "/api/Dwolla/WithdrawDwollaBalance" ).then(
                () =>
                {
                    this.isLoading_Payment = false;
                    this.dwollaBalanceMessage = "Balance withdraw successfully initiated. Expect the transfer to complete in 1-2 business days.";
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to initiate withdraw: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        submitDwollaMicroDepositAmounts()
        {
            this.isLoading_Payment = true;

            const postData = {
                amount1String: this.dwollaMicroDepositAmount1String,
                amount2String: this.dwollaMicroDepositAmount2String,
                isForGroup: false
            };

            this.$http.post( "/api/Dwolla/VerifyMicroDeposit", postData ).then(
                () =>
                {
                    window.location.reload();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to verify: " + httpResponse.data.exceptionMessage );
                }
            )
        }


        reloadPage()
        {
            this.isLoading_Payment = true;
            window.location.reload();
        }


        enableDwollaAutoPay()
        {
            this.isLoading_Payment = true;

            this.$http.put( "/api/Dwolla/EnableAutoPay/" + encodeURIComponent( this.assessmentAmount.toString() ), null ).then(
                () =>
                {
                    window.location.reload();                    
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to enable Dwolla auto-pay: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        disableDwollaAutoPay()
        {
            this.isLoading_Payment = true;

            this.$http.put( "/api/Dwolla/DisableAutoPay", null ).then(
                () =>
                {
                    window.location.reload();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to disable Dwolla auto-pay: " + httpResponse.data.exceptionMessage );
                }
            );
        }
    }

    class CheckoutRequest
    {
        wasSuccessful: boolean;
        checkoutUri: string;
    }

    class DwollaAccountStatusInfo
    {
        status: string;
        streetAddress: FullAddress;
    }

    class MakePaymentRequest
    {
        paymentType: string;
        amount: number;
        note: string;
        fundingType: string;
        paysFor: PayPeriod[];
    }
}


CA.angularApp.component( "assessmentPaymentForm", {
    templateUrl: "/ngApp/common/assessment-payment-form.html",
    controller: Ally.AssessmentPaymentFormController
} );


class CreateDwollaUser
{
    dateOfBirth: string;
    ssnLast4: string;
    ssnFull: string;
    streetAddress: Ally.FullAddress;
}


class ParagonPayerSignUpInfo
{
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    billingAddress: Ally.FullAddress = new Ally.FullAddress();
    routingNumber: string;
    checkAccountNumber: string;
    checkType: "PERSONAL" | "BUSINESS" = "PERSONAL";
    accountType: "CHECKING" | "SAVINGS" = "CHECKING";
}


class ParagonPaymentRequest
{
    paymentAmount: number;
    notes: string;
    paysFor: Ally.PayPeriod[];
    paySource: string;
}

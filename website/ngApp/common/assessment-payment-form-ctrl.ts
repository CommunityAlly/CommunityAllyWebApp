declare var dwolla: any;

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
        isAutoPayActive: boolean;
        nextAutoPayText: string;
        paymentInfo: MakePaymentRequest;
        recentPayments: any[];
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
        dwollaSignUpInfo: any = {
            dateOfBirth: "",
            ssnLast4: "",
            ssnFull: "",
            streetAddress3: new FullAddress()
        };
        isWePayPaymentActive: boolean = false;
        isDwollaPaymentActive: boolean = false;
        shouldShowDwolla: boolean = false;
        isDwollaAccountVerified: boolean;
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
        dwollaFeePercent: number = 0.5;
        dwollaFeeAmountString: string;
        dwollaDocUploadType: string = "license";
        dwollaDocUploadFile: File = null;
        dwollaDocUploadMessage: string;
        dwollaBalance: number = -1;
        dwollaBalanceMessage: string;


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
            this.shouldShowDwolla = AppConfigInfo.dwollaPreviewShortNames.indexOf( this.siteInfo.publicSiteInfo.shortName ) > -1;
            this.dwollaFeePercent = this.siteInfo.privateSiteInfo.isPremiumPlanActive ? 0.5 : 1;

            this.isDwollaAccountVerified = this.siteInfo.userInfo.isDwollaAccountVerified;
            if( this.isDwollaAccountVerified )
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
                    this.isDwollaPaymentActive = this.isDwollaAccountVerified && this.hasDwollaFundingSource && this.siteInfo.privateSiteInfo.isDwollaPaymentActive;

                    if( this.isDwollaPaymentActive )
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
                this.isDwollaPaymentActive = this.isDwollaAccountVerified && this.hasDwollaFundingSource && this.siteInfo.privateSiteInfo.isDwollaPaymentActive;
            }
            else
            {
                this.dwollaUserStatus = "checking";
                this.userFullName = this.siteInfo.userInfo.fullName;
                this.userEmail = this.siteInfo.userInfo.emailAddress;

                const getDwollaDocUploadToken = () =>
                {
                    this.$http.get( "/api/Dwolla/DocumentUploadToken" ).then(
                        ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                        {
                            const uploadToken = response.data;

                            window.setTimeout( () =>
                            {
                                dwolla.configure( {
                                    environment: AppConfigInfo.dwollaEnvironmentName,
                                    styles: "/main.css",
                                    token: () =>
                                    {
                                        const deferred = this.$q.defer();
                                        deferred.resolve( uploadToken );
                                        return deferred.promise;
                                    },
                                    //token: () => Promise.resolve( uploadToken ),
                                    success: ( res: any ) => alert( res ),
                                    error: ( err: any ) => alert( err )
                                } );
                            }, 200 );
                        },
                        ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                        {
                            this.dwollaUserStatus = "error";
                        }
                    );
                };

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
                        }
                    );
                };

                this.$timeout( () => checkDwollaStatus(), 500 );
            }

            this.allyAppName = AppConfig.appName;
            this.isAutoPayActive = this.siteInfo.userInfo.isAutoPayActive;
            this.assessmentCreditCardFeeLabel = this.siteInfo.privateSiteInfo.payerPaysCCFee ? "Service fee applies" : "No service fee";
            this.assessmentAchFeeLabel = this.siteInfo.privateSiteInfo.payerPaysAchFee ? "Service fee applies" : "No service fee";
            this.payerPaysAchFee = this.siteInfo.privateSiteInfo.payerPaysAchFee;
            this.errorPayInfoText = "Is the amount incorrect?";
            this.isWePaySetup = this.siteInfo.privateSiteInfo.isPaymentEnabled;
            this.hasAssessments = this.siteInfo.privateSiteInfo.hasAssessments;
            this.assessmentFrequency = this.siteInfo.privateSiteInfo.assessmentFrequency;

            if( !this.isAutoPayActive && HtmlUtil.isNumericString( HtmlUtil.GetQueryStringParameter( "preapproval_id" ) ) )
            {
                // The user just set up auto-pay and it may take a second
                this.isAutoPayActive = true;
            }

            this.nextAutoPayText = this.siteInfo.userInfo.nextAutoPayText;

            // Grab the assessment from the user's unit (TODO handle multiple units)
            if( this.siteInfo.userInfo.usersUnits != null && this.siteInfo.userInfo.usersUnits.length > 0 )
            {
                this.assessmentAmount = this.siteInfo.userInfo.usersUnits[0].assessment;
            }
            else
                this.assessmentAmount = 0;

            this.paymentInfo =
            {
                paymentType: "other",
                amount: this.assessmentAmount,
                note: "",
                fundingType: null,
                paysFor: []
            };

            this.onPaymentAmountChange();

            var MaxNumRecentPayments: number = 24;
            this.recentPayments = this.siteInfo.userInfo.recentPayments;
            if( this.recentPayments && this.recentPayments.length > 0 )
            {
                if( this.recentPayments.length > MaxNumRecentPayments )
                    this.recentPayments = this.recentPayments.slice( 0, MaxNumRecentPayments );

                // Fill up the list so there's always MaxNumRecentPayments
                while( this.recentPayments.length < MaxNumRecentPayments )
                    this.recentPayments.push( {} );
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

                    this.nextPaymentText = this.getNextPaymentText( [this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue],
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

            this.$http.get( "/api/Paragon/SignUpPrefill" ).then( ( response: ng.IHttpPromiseCallbackArg<ParagonPayerSignUpInfo> ) =>
            {
                this.isLoading_Payment = false;
                this.paragonSignUpInfo = response.data;

            }, ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading_Payment = false;
                this.paragonSignUpInfo = new ParagonPayerSignUpInfo();
            } );
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


            this.$http.get( "/api/Paragon/CardTokenizationKey" ).then( ( response: ng.IHttpPromiseCallbackArg<string> ) =>
            {
                this.isLoading_Payment = false;
                this.paragonCardTokenizedUrl = this.$sce.trustAsResourceUrl( "https://stage.paragonsolutions.com/ws/hosted.aspx?Username=54cE7DU2p%2bBh7h9uwJWW8Q%3d%3d&Password=jYvmN41tt1lz%2bpiazUqQYK9Abl73Z%2bHoBG4vOZImo%2bYlKTbPeNPwOcMB0%2bmIS3%2bs&MerchantKey=1293&InvNum=" + response.data );
                this.paragonCardTokenizationMessage = null;

            }, ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading_Payment = false;
                this.paragonCardTokenizationMessage = "There was an error connecting to the server. Please close this window and try again. If this has happened more than once please contact support.";
            } );
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

            this.$http.post( "/api/Paragon/CheckPaymentSignUp", this.paragonSignUpInfo ).then( ( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                // Reload the page to refresh the payment info. We don't really need to do this,
                // but makes sure the UI is up to date a little better as well updates the
                // siteInfo object.
                window.location.reload();

            }, ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading_Payment = false;
                this.paragonSignUpError = errorResponse.data.exceptionMessage;
            } );
        }


        /**
         * Submit the user's Paragon bank account information
         */
        submitParagonPayment( paySource: string )
        {
            if( !confirm( "This will submit payment." ) )
                return;

            this.paragonPaymentMessage = null;

            var paymentInfo = new ParagonPaymentRequest();
            paymentInfo.notes = this.paymentInfo.note;
            paymentInfo.paymentAmount = this.paymentInfo.amount;
            paymentInfo.paysFor = this.paymentInfo.paysFor;
            paymentInfo.paySource = paySource;

            this.isLoading_Payment = true;

            this.$http.post( "/api/Paragon/MakePayment", paymentInfo ).then( ( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading_Payment = false;
                this.paragonPaymentMessage = "Payment Successfully Processed";

            }, ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading_Payment = false;
                this.paragonPaymentMessage = errorResponse.data.exceptionMessage;
            } );
        }


        /**
         * Un-enroll a certain payment source from Paragon payments
         */
        unenrollParagonAccount( paySource: string )
        {
            this.isLoading_Payment = true;

            this.$http.get( "/api/Paragon/UnenrollPayment?paySource=" + paySource ).then( ( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                // Reload the page to see the change
                window.location.reload();

            }, ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading_Payment = false;
                alert( "Failed to un-enroll: " + errorResponse.data.exceptionMessage );
                this.paragonPaymentMessage = errorResponse.data.exceptionMessage;
            } );
        }


        /**
         * Occurs when the user presses the button to make a payment to their organization
         */
        makePayment( fundingTypeName: string )
        {
            this.isLoading_Payment = true;
            this.paymentInfo.fundingType = fundingTypeName;

            // Remove leading dollar signs
            let testAmount = this.paymentInfo.amount as any;
            if( HtmlUtil.isValidString( testAmount ) && ( testAmount as string )[0] === '$' )
                this.paymentInfo.amount = parseFloat( testAmount.substr( 1 ) );

            analytics.track( "makePayment", {
                fundingType: fundingTypeName
            } );

            var innerThis = this;
            this.$http.post( "/api/WePayPayment", this.paymentInfo ).then( function( httpResponse: any )
            {
                var checkoutInfo = httpResponse.data;

                if( checkoutInfo !== null && typeof ( checkoutInfo.checkoutUri ) === "string" && checkoutInfo.checkoutUri.length > 0 )
                    window.location.href = checkoutInfo.checkoutUri;
                else
                {
                    innerThis.isLoading_Payment = false;
                    alert( "Unable to initiate WePay checkout" );
                }

            }, function( httpResponse: any )
            {
                innerThis.isLoading_Payment = false;

                if( httpResponse.data && httpResponse.data.exceptionMessage )
                    alert( httpResponse.data.exceptionMessage );
            } );
        }


        /**
         * Occurs when the user clicks the helper link to prep an e-mail to inquire the board as to
         * why their records don't line up.
         */
        onIncorrectPayDetails()
        {
            // Get the friendly looking assessment value (ex: 100, 101, 102.50)
            let amountString = this.assessmentAmount.toString();
            if( Math.round( this.assessmentAmount ) != this.assessmentAmount )
                amountString = this.assessmentAmount.toFixed( 2 );

            // Tell the groupSendEmail component to prep an e-mail for the board
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
        getNextPaymentText( payPeriods: Ally.PayPeriod[], assessmentFrequency: number )
        {
            if( payPeriods == null )
                return "";

            // Ensure the periods is an array
            if( payPeriods.constructor !== Array )
                payPeriods = [<any>payPeriods];

            var paymentText = "";

            var frequencyInfo = FrequencyIdToInfo( assessmentFrequency );

            for( var periodIndex = 0; periodIndex < payPeriods.length; ++periodIndex )
            {
                var curPeriod = payPeriods[periodIndex];

                if( frequencyInfo.intervalName === "month" )
                {
                    var monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];

                    paymentText = monthNames[curPeriod.period - 1];
                }
                else if( frequencyInfo.intervalName === "quarter" )
                {
                    var periodNames = ["Q1", "Q2", "Q3", "Q4"];

                    paymentText = periodNames[curPeriod.period - 1];
                }
                else if( frequencyInfo.intervalName === "half-year" )
                {
                    var periodNames = ["First Half", "Second Half"];

                    paymentText = periodNames[curPeriod.period - 1];
                }

                paymentText += " " + curPeriod.year;

                this.paymentInfo.paysFor = [curPeriod];
            }

            return paymentText;
        }


        /**
         * Occurs when the user presses the button to setup auto-pay for assessments
         */
        onSetupAutoPay( fundingTypeName: string )
        {
            this.isLoading_Payment = true;

            this.$http.get( "/api/WePayPayment/SetupAutoPay?fundingType=" + fundingTypeName ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<string> ) =>
            {
                var redirectUrl = httpResponse.data;

                if( typeof ( redirectUrl ) === "string" && redirectUrl.length > 0 )
                    window.location.href = redirectUrl;
                else
                {
                    this.isLoading_Payment = false;
                    alert( "Unable to initiate WePay auto-pay setup" );
                }

            }, ( httpResponse ) =>
            {
                this.isLoading_Payment = false;

                if( httpResponse.data && httpResponse.data.exceptionMessage )
                    alert( httpResponse.data.exceptionMessage );
            } );
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
                this.isAutoPayActive = false;

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
            this.isLoadingDwolla = true;

            const startIav = ( iavToken: string) =>
            {
                dwolla.configure( AppConfigInfo.dwollaEnvironmentName );

                dwolla.iav.start( iavToken,
                    {
                        container: 'dwolla-iav-container',
                        stylesheets: [
                            'https://fonts.googleapis.com/css?family=Lato&subset=latin,latin-ext'
                        ],
                        microDeposits: false,
                        fallbackToMicroDeposits: false
                    },
                    ( err: any, res: any ) =>
                    {
                        console.log( 'Error: ' + JSON.stringify( err ) + ' -- Response: ' + JSON.stringify( res ) );

                        if( res && res._links && res._links["funding-source"] && res._links["funding-source"].href )
                        {
                            const fundingSourceUri = res._links["funding-source"].href;

                            // Tell the server
                            this.$http.put( "/api/Dwolla/SetUserFundingSourceUri", { fundingSourceUri } ).then(
                                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                                {
                                    window.location.reload();
                                },
                                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                                {
                                    this.isLoadingDwolla = false;
                                    this.shouldShowDwollaModalClose = true;
                                    alert( "Failed to complete sign-up" )
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


        /**
         * Submit the user's Paragon bank account information
         */
        submitDwollaPayment()
        {
            //if( !confirm( "This will submit payment." ) )
            //    return;

            this.dwollaPaymentMessage = null;

            this.isLoading_Payment = true;

            this.$http.post( "/api/Dwolla/MakePayment", this.paymentInfo ).then( ( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading_Payment = false;
                this.dwollaPaymentMessage = "Payment Successfully Processed";

            }, ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading_Payment = false;
                this.dwollaPaymentMessage = "Payment failed: " + errorResponse.data.exceptionMessage;
            } );
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
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
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


        /**
         * Occurs when the amount to pay changes
         */
        onPaymentAmountChange()
        {
            // dwollaFeePercent is in display percent, so 0.5 = 0.5% = 0.005 scalar
            // So we only need to divide by 100 to get our rounded fee
            var feeAmount = Math.ceil( this.paymentInfo.amount * this.dwollaFeePercent ) / 100;

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
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
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
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
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

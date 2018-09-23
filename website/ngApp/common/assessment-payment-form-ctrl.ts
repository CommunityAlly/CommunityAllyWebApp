namespace Ally
{
    /**
     * The controller for the widget that lets residents pay their assessments
     */
    export class AssessmentPaymentFormController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$rootScope"];

        isLoading_Payment: boolean = false;
        assessmentCreditCardFeeLabel: string;
        assessmentAchFeeLabel: string;
        errorPayInfoText: string;
        payerPaysAchFee: boolean;
        isWePaySetup: boolean;
        hasAssessments: boolean;
        assessmentFrequency: string;
        allyAppName: string;
        isAutoPayActive: boolean;
        nextAutoPayText: string;
        paymentInfo: any;
        recentPayments: any[];
        assessmentAmount: number;
        nextPaymentText: string;
        knowsNextPayment: boolean;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $rootScope: ng.IRootScopeService)
        {
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
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
                    fundingType: null
                };

            var MaxNumRecentPayments: number = 6;
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

                    this.nextPaymentText = this.getNextPaymentText( this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue,
                        this.siteInfo.privateSiteInfo.assessmentFrequency );

                    this.updatePaymentText();
                }
            }

            setTimeout( ()=>
            {
                $('#btn_view_pay_history').click(function () {
                    $('#pm_info').collapse('hide');
                    $('#payment_history').collapse('show');
                });

                $('#btn_view_pay_info').click(function () {
                    $('#payment_history').collapse('hide');
                    $('#pm_info').collapse('show');
                });

                $( '.hide' ).click( function ()
                {
                    $( this ).parent().hide( '' );
                } );

            }, 400 );
        }
        
        
        /**
         * Occurs when the user presses the button to make a payment to their organization
         */
        makePayment( fundingTypeName: string )
        {
            this.isLoading_Payment = true;
            this.paymentInfo.fundingType = fundingTypeName;

            // Remove leading dollar signs
            if( HtmlUtil.isValidString( this.paymentInfo.amount ) && this.paymentInfo.amount[0] === '$' )
                this.paymentInfo.amount = this.paymentInfo.amount.substr( 1 );

            analytics.track( "makePayment", {
                fundingType: fundingTypeName
            } );

            var innerThis = this;
            this.$http.post( "/api/WePayPayment", this.paymentInfo ).then( function( httpResponse:any )
            {
                var checkoutInfo = httpResponse.data;

                if( checkoutInfo !== null && typeof ( checkoutInfo.checkoutUri ) === "string" && checkoutInfo.checkoutUri.length > 0 )
                    window.location.href = checkoutInfo.checkoutUri;
                else
                {
                    innerThis.isLoading_Payment = false;
                    alert( "Unable to initiate WePay checkout" );
                }

            }, function( httpResponse:any )
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
        }


        /**
         * Generate the friendly string describing to what the member's next payment applies
         */
        getNextPaymentText( payPeriods: any[], assessmentFrequency: any )
        {
            if( payPeriods == null )
                return "";

            // Ensure the periods is an array
            if( payPeriods.constructor !== Array )
                payPeriods = [payPeriods];

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
         * Occurs when the user presses the button to etup auto-pay for assessments
         */
        onSetupAutoPay( fundingTypeName: string )
        {
            this.isLoading_Payment = true;

            var innerThis = this;
            this.$http.get( "/api/WePayPayment/SetupAutoPay?fundingType=" + fundingTypeName ).then( function( httpResponse )
            {
                var redirectUrl = httpResponse.data;

                if( typeof ( redirectUrl ) === "string" && redirectUrl.length > 0 )
                    window.location.href = redirectUrl;
                else
                {
                    innerThis.isLoading_Payment = false;
                    alert( "Unable to initiate WePay auto-pay setup" );
                }

            }, function( httpResponse )
            {
                innerThis.isLoading_Payment = false;

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

            var innerThis = this;
            this.$http.get( "/api/WePayPayment/DisableAutoPay" ).then( function()
            {
                innerThis.isLoading_Payment = false;
                innerThis.isAutoPayActive = false;

            }, function( httpResponse )
                {
                    innerThis.isLoading_Payment = false;

                    if( httpResponse.data && httpResponse.data.exceptionMessage )
                        alert( httpResponse.data.exceptionMessage );
                } );
        }
    }
}


CA.angularApp.component( "assessmentPaymentForm", {
    templateUrl: "/ngApp/common/assessment-payment-form.html",
    controller: Ally.AssessmentPaymentFormController
} );
namespace Ally
{
    /**
     * The controller for the page to view online payment information
     */
    export class ManagePaymentsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "appCacheService"];
        
        PaymentHistory: any[] = [];
        message = "";
        showPaymentPage: boolean = AppConfig.appShortName === "condo";
        highlightWePayCheckoutId: string;
        PeriodicPaymentFrequencies:any[] = PeriodicPaymentFrequencies;
        AssociationPaysAch:boolean = true;
        AssociationPaysCC:boolean = false; // Payer pays credit card fees
        lateFeeInfo:any = {};
        isAssessmentTrackingEnabled: boolean;
        payments: any[];
        testFee: any;
        isLoading: boolean = false;
        hasAssessments: boolean;
        paymentInfo: any;
        isLoadingUnits: boolean = false;
        isLoadingPayment: boolean = false;
        isLoadingLateFee: boolean = false;
        isLoadingCheckoutDetails: boolean = false;
        units: Unit[];
        assessmentSum: number;
        adjustedAssessmentSum: number;
        signUpStep: number;
        signUpInfo: any;
        viewingCheckoutId: number;
        checkoutInfo: any;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private appCacheService: AppCacheService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.highlightWePayCheckoutId = this.appCacheService.getAndClear( "hwpid" );
            this.isAssessmentTrackingEnabled = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled;

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
        }


        /**
         * Load all of the data on the page
         */
        refresh()
        {
            this.isLoading = true;

            var innerThis = this;
            this.$http.get( "/api/OnlinePayment" ).then( ( httpResponse:ng.IHttpPromiseCallbackArg<any> ) =>
            {
                innerThis.isLoading = false;

                innerThis.hasAssessments = innerThis.siteInfo.privateSiteInfo.hasAssessments;

                var data = httpResponse.data;
                innerThis.paymentInfo = data;

                innerThis.lateFeeInfo =
                    {
                        lateFeeDayOfMonth: data.lateFeeDayOfMonth,
                        lateFeeAmount: data.lateFeeAmount
                    };

                // Prepend flat fee late fees with a $
                if( !HtmlUtil.isNullOrWhitespace( this.lateFeeInfo.lateFeeAmount )
                    && !HtmlUtil.endsWith( this.lateFeeInfo.lateFeeAmount, "%" ) )
                    this.lateFeeInfo.lateFeeAmount = "$" + this.lateFeeInfo.lateFeeAmount;

                innerThis.refreshUnits();
                innerThis.updateTestFee();
            } );
        }

        
        /**
         * Load all of the untis on the page
         */
        refreshUnits()
        {
            // Load the units and assessments
            this.isLoadingUnits = true;

            var innerThis = this;
            this.$http.get( "/api/Unit" ).then(( httpResponse: ng.IHttpPromiseCallbackArg<Unit[]> ) =>
            {
                innerThis.units = httpResponse.data;

                _.each( innerThis.units, function( u: any ) { if( u.adjustedAssessment === null ) { u.adjustedAssessment = u.assessment; } } );

                innerThis.assessmentSum = _.reduce( innerThis.units, function( memo: number, u: Unit ) { return memo + u.assessment; }, 0 );
                innerThis.adjustedAssessmentSum = _.reduce( innerThis.units, function( memo: number, u: Unit ) { return memo + ( u.adjustedAssessment || 0 ); }, 0 );

                innerThis.isLoadingUnits = false;
            } );
        }


        getLateFeeDateSuper()
        {
            var dayOfMonth = this.lateFeeInfo.lateFeeDayOfMonth;

            if( typeof ( dayOfMonth ) === "string" )
            {
                if( HtmlUtil.isNullOrWhitespace( dayOfMonth ) )
                    return "";

                dayOfMonth = parseInt( dayOfMonth );
                this.lateFeeInfo.lateFeeDayOfMonth = dayOfMonth;
            }

            if( dayOfMonth == NaN || dayOfMonth < 1 )
            {
                dayOfMonth = "";
                return "";
            }

            if( dayOfMonth > 31 )
            {
                dayOfMonth = "";
                return "";
            }

            // Teens are a special case
            if( dayOfMonth >= 10 && dayOfMonth <= 20 )
                return "th";

            var onesDigit = dayOfMonth % 10;

            if( onesDigit === 1 )
                return "st";
            else if( onesDigit === 2 )
                return "nd";
            if( onesDigit === 3 )
                return "rd";

            return "th";
        }


        selectText()
        {
            // HACK: Timeout needed to fire after x-editable's activation
            setTimeout( function()
            {
                $( '.editable-input' ).select();
            }, 50 );
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user presses the button to send money from the WePay account to their
        // association's account
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onWithdrawalClick()
        {
            this.message = "";


            this.$http.get( "/api/OnlinePayment?action=withdrawal" ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<any> )
            {
                var withdrawalInfo = httpResponse.data;

                if( withdrawalInfo.redirectUri )
                    window.location.href = withdrawalInfo.redirectUri;
                else
                    this.message = withdrawalInfo.message;

            }, function( httpResponse )
            {
                if( httpResponse.data && httpResponse.data.exceptionMessage )
                    this.message = httpResponse.data.exceptionMessage;
            } );
        }


        /**
         * Occurs when the user presses the button to edit a unit's assessment
         */
        onUnitAssessmentChanged( unit: Unit )
        {
            this.isLoadingUnits = true;

            // The UI inputs string values for these fields, so convert them to numbers
            if( typeof ( unit.assessment ) === "string" )
                unit.assessment = parseFloat( unit.assessment );

            if( typeof ( unit.adjustedAssessment ) === "string" )
                unit.adjustedAssessment = parseFloat( unit.adjustedAssessment );

            var innerThis = this;
            this.$http.put( "/api/Unit", unit ).then( function()
            {
                innerThis.isLoadingUnits = false;

                innerThis.assessmentSum = _.reduce( innerThis.units, function( memo: number, u: Unit ) { return memo + u.assessment; }, 0 );
                innerThis.adjustedAssessmentSum = _.reduce( innerThis.units, function( memo: number, u: Unit ) { return memo + ( u.adjustedAssessment || 0 ); }, 0 );
            } );
        }


        /**
         * Occurs when the user changes who covers the WePay transaction fee
         */
        onChangeFeePayerInfo( payTypeUpdated: string )
        {
            // See if any users have auto-pay setup for this payment type
            var needsFullRefresh = false;
            var needsReloadOfPage = false;
            if( this.paymentInfo.usersWithAutoPay && this.paymentInfo.usersWithAutoPay.length > 0 )
            {
                var AchDBString = "ACH";
                var CreditDBString = "Credit Card";

                var usersAffected:any[] = [];
                if( payTypeUpdated === "ach" )
                    usersAffected = _.where( this.paymentInfo.usersWithAutoPay, function( u:any ) { return u.wePayAutoPayFundingSource === AchDBString; } );
                else if( payTypeUpdated === "cc" )
                    usersAffected = _.where( this.paymentInfo.usersWithAutoPay, function( u:any ) { return u.wePayAutoPayFundingSource === CreditDBString; } );

                // If users will be affected then display an error message to the user
                if( usersAffected.length > 0 )
                {
                    // We need to reload the site if the user is affected so the home page updates that
                    // the user does not have auto-pay enabled
                    needsReloadOfPage = _.find( usersAffected, function( u ) { return u.userId === this.$parent.userInfo.userId; } ) !== undefined;

                    needsFullRefresh = true;

                    var message = "Adjusting the fee payer type will cause the follow units to have their auto-pay cancelled and they will be informed by e-mail:\n";

                    _.each( usersAffected, function( u:any ) { message += u.ownerName + "\n"; } );

                    message += "\nDo you want to continue?";

                    if( !confirm( message ) )
                    {
                        // Reset the setting
                        if( payTypeUpdated === "ach" )
                            this.paymentInfo.payerPaysAchFee = !this.paymentInfo.payerPaysAchFee;
                        else
                            this.paymentInfo.payerPaysCCFee = !this.paymentInfo.payerPaysCCFee;

                        return;
                    }
                }
            }

            this.isLoadingPayment = true;

            var innerThis = this;
            this.$http.put( "/api/OnlinePayment", this.paymentInfo ).then( function()
            {
                if( needsReloadOfPage )
                    window.location.reload();
                else
                {
                    innerThis.isLoadingPayment = false;

                    // We need to refresh our data so we don't pop-up the auto-pay cancel warning again
                    if( needsFullRefresh )
                        innerThis.refresh();
                }
            } );

            this.updateTestFee();
        }

        
        /**
         * Used to show the sum of all assessments
         */
        getSignUpSum()
        {
            return _.reduce( this.signUpInfo.units, function( memo:number, u:any ) { return memo + parseFloat( u.assessment ); }, 0 );
        }


        /**
         * Occurs when the user changes where the WePay fee payment comes from
         */
        signUp_HasAssessments( hasAssessments: boolean )
        {
            this.signUpInfo.hasAssessments = hasAssessments;

            if( this.signUpInfo.hasAssessments )
            {
                this.signUpInfo.units = [];
                _.each( this.units, ( u ) =>
                {
                    this.signUpInfo.units.push( { unitId: u.unitId, name: u.name, assessment: 0 } );
                } );
                this.signUpStep = 1;
            }
            else
            {
                this.signUp_Commit();
            }
        }


        /**
         * Handle the assessment frequency
         */
        signUp_AssessmentFrequency( frequencyIndex:number )
        {
            this.signUpInfo.frequencyIndex = frequencyIndex;
            this.signUpInfo.assessmentFrequency = PeriodicPaymentFrequencies[frequencyIndex].name;
            this.signUpStep = 2;
        }


        /**
         * Save the late fee info
         */
        saveLateFee()
        {
            this.isLoadingLateFee = true;

            var innerThis = this;
            this.$http.put( "/api/OnlinePayment/LateFee?dayOfMonth=" + this.lateFeeInfo.lateFeeDayOfMonth + "&lateFeeAmount=" + this.lateFeeInfo.lateFeeAmount, null ).then( function( httpResponse:ng.IHttpPromiseCallbackArg<any> )
            {
                innerThis.isLoadingLateFee = false;

                var lateFeeResult = httpResponse.data;

                if( !lateFeeResult || !lateFeeResult.feeAmount || lateFeeResult.feeType === 0 )
                {
                    if( innerThis.lateFeeInfo.lateFeeDayOfMonth !== "" )
                        alert( "Failed to save the late fee. Please enter only a number for the date (ex. 5) and an amount (ex. 12.34) or percent (ex. 5%) for the fee. To disable late fees, clear the date field and hit save." );

                    innerThis.lateFeeInfo.lateFeeDayOfMonth = "";
                    innerThis.lateFeeInfo.lateFeeAmount = null;
                }
                else
                {
                    innerThis.lateFeeInfo.lateFeeAmount = lateFeeResult.feeAmount;

                    // feeType of 2 is percent, 1 is flat, and 0 is invalid
                    if( lateFeeResult.feeType === 1 )
                        innerThis.lateFeeInfo.lateFeeAmount = "$" + innerThis.lateFeeInfo.lateFeeAmount;
                    else if( lateFeeResult.feeType === 2 )
                        innerThis.lateFeeInfo.lateFeeAmount = "" + innerThis.lateFeeInfo.lateFeeAmount + "%";
                }

            }, function( httpResponse:ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> )
            {
                innerThis.isLoadingLateFee = false;

                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert( "Failed to update late fee: " + errorMessage );
            } );
        }


        /**
         * Show the WePay info for a specific transaction
         */
        showWePayCheckoutInfo( wePayCheckoutId:number )
        {
            this.viewingCheckoutId = wePayCheckoutId;

            if( !this.viewingCheckoutId )
                return;

            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};

            var innerThis = this;
            this.$http.get( "/api/OnlinePayment/CheckoutInfo?checkoutId=" + wePayCheckoutId, { cache: true } ).then( function( httpResponse:ng.IHttpPromiseCallbackArg<any> )
            {
                innerThis.isLoadingCheckoutDetails = false;

                innerThis.checkoutInfo = httpResponse.data;

            }, function( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> )
            {
                innerThis.isLoadingCheckoutDetails = false;

                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert( "Failed to retrieve checkout details: " + errorMessage );
            } );
        }


        /**
         * Save the sign-up answers
         */
        signUp_Commit()
        {
            this.isLoading = true;
            
            this.$http.post( "/api/OnlinePayment/BasicInfo", this.signUpInfo ).then( () =>
            {
                this.isLoading = false;

                // Update the unit assessments
                this.refreshUnits();

                // Update the assesment flag
                this.hasAssessments = this.signUpInfo.hasAssessments;
                this.siteInfo.privateSiteInfo.hasAssessments = this.hasAssessments;

            }, ( httpResponse:ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;

                if( httpResponse.data && httpResponse.data.exceptionMessage )
                    this.message = httpResponse.data.exceptionMessage;
            } );
        }


        /**
         * Allow the admin to clear the WePay access token for testing
         */
        updateTestFee()
        {
            var numericAmount = parseFloat( this.testFee.amount );

            if( this.paymentInfo.payerPaysAchFee )
            {
                this.testFee.achResidentPays = numericAmount + 1.5;
                this.testFee.achAssociationReceives = numericAmount;
            }
            else
            {
                this.testFee.achResidentPays = numericAmount;
                this.testFee.achAssociationReceives = numericAmount - 1.5;
            }

            var ccFee = 1.3 + ( numericAmount * 0.029 );
            if( this.paymentInfo.payerPaysCCFee )
            {
                this.testFee.ccResidentPays = numericAmount + ccFee;
                this.testFee.ccAssociationReceives = numericAmount;
            }
            else
            {
                this.testFee.ccResidentPays = numericAmount;
                this.testFee.ccAssociationReceives = numericAmount - ccFee;
            }
        }


        /**
         * Allow the admin to clear the WePay access token for testing
         */
        admin_ClearAccessToken()
        {
            alert( "TODO hook this up" );
        }
    }
}


CA.angularApp.component( "managePayments", {
    templateUrl: "/ngApp/chtn/manager/manage-payments.html",
    controller: Ally.ManagePaymentsController
} );

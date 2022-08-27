declare var StripeCheckout: any;

namespace Ally
{
    class InvoiceMailingEntry
    {
        unitIds: number[];
        primaryUserId: string;
        homeNames: string;
        amountDue: number;
        balanceForward: number;
        lateFee: number;
        emailAddresses: string;
        //streetAddress: string;
        streetAddressObject: FullAddress;
        ownerNames: string;
        shouldSendEmail: boolean;
        shouldSendPaperMail: boolean;
        overrideNotes: string;

        // Not sent down from the server
        isValidating: boolean;
        isValidMailingAddress: boolean = null;
        validationMessage: string;
        validatedAddress: string;
        wasPopUpBlocked: boolean;
    }


    class InvoiceFullMailing
    {
        mailingEntries: InvoiceMailingEntry[];
        //fromAddress: string;
        fromStreetAddress: FullAddress;
        notes: string;
        stripeToken: string;
        sendingReason: string;
        invoiceTitleString: string;
        dueDateString: string;
        duesLabel: string;
    }


    class FullMailingResult
    {
        hadErrors: boolean;
    }


    class AddressVerificationResult
    {
        isValid: boolean;
        verificationMessage: string
        parsedStreetAddress: FullAddress;
    }


    class InvoicePreviewInfo
    {
        fromAddress: FullAddress;
        notes: string;
        invoiceTitleString: string;
        dueDateString: string;
        duesLabel: string;
        mailingInfo: InvoiceMailingEntry;
    }


    class InvoicePreviewInfoResult
    {
        previewId: string;
        previewUrl: string;
    }


    /**
     * The controller for the invoice mailing view
     */
    export class MailingInvoiceController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "fellowResidents", "WizardHandler", "$scope", "$timeout", "$location"];
        isLoading: boolean = false;
        gridApi: uiGrid.IGridApiOf<InvoiceMailingEntry>;
        homesGridOptions: uiGrid.IGridOptionsOf<InvoiceMailingEntry>;
        selectedEntries: InvoiceMailingEntry[] = [];
        numEmailsToSend: number = 0;
        numPaperLettersToSend: number = 0;
        authToken: string;
        paperInvoiceDollars: number = 2;
        fullMailingInfo: InvoiceFullMailing;
        activeStepIndex: number;
        allDuesSetAmount: number;
        isAdmin: boolean = false;
        numInvalidMailingAddresses: number = 0;
        numAddressesToBulkValidate: number = 0;
        shouldShowAutoUnselect: boolean = false;
        autoUnselectLabel: string;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private fellowResidents: Ally.FellowResidentsService, private wizardHandler: any, private $scope: ng.IScope, private $timeout: ng.ITimeoutService, private $location: ng.ILocationService )
        {
            const amountCellTemplate = '<div class="ui-grid-cell-contents">$<input type="number" style="width: 90%;" data-ng-model="row.entity[col.field]" autocomplete="off" data-lpignore="true" data-form-type="other" /></div>';

            this.homesGridOptions =
                {
                    data: [],
                    columnDefs:
                        [
                            {
                                field: "homeNames",
                                displayName: AppConfig.homeName,
                                width: 210
                            },
                            {
                                field: "ownerNames",
                                displayName: "Owners"
                            },
                            {
                                field: "amountDue",
                                displayName: "Amount Due",
                                width: 120,
                                cellTemplate: amountCellTemplate
                            },
                            {
                                field: "balanceForward",
                                displayName: "Balance Forward",
                                width: 140,
                                cellTemplate: amountCellTemplate
                            },
                            {
                                field: "lateFee",
                                displayName: "Late Fee",
                                width: 120,
                                cellTemplate: amountCellTemplate
                            },
                            {
                                field: "total",
                                displayName: "Total",
                                width: 90,
                                cellTemplate: '<div class="ui-grid-cell-contents">{{ row.entity.amountDue + (row.entity.balanceForward || 0) + (row.entity.lateFee || 0) | currency }}</div>'
                            }
                            //,{
                            //    field: "unitIds",
                            //    displayName: "",
                            //    width: 130,
                            //    cellTemplate: '<div class="ui-grid-cell-contents"><a data-ng-href="/api/Mailing/Preview/Invoice/{{row.entity.unitIds}}?ApiAuthToken=' + this.siteInfo.authToken + '" target="_blank">Preview Invoice</a></div>'
                            //}
                        ],
                    enableSorting: true,
                    enableHorizontalScrollbar: 0,
                    enableVerticalScrollbar: 0,
                    enableColumnMenus: false,
                    minRowsToShow: 5,
                    enableRowHeaderSelection: true,
                    multiSelect: true,
                    enableSelectAll: true,
                    onRegisterApi: ( gridApi ) =>
                    {
                        this.gridApi = gridApi;

                        const updateFromSelection = () =>
                        {
                            const selectedRows = gridApi.selection.getSelectedRows();
                            this.selectedEntries = selectedRows;

                            //_.forEach( <InvoiceMailingEntry[]>this.homesGridOptions.data, e => e.shouldIncludeForSending = false );
                            //_.forEach( this.selectedEntries, e => e.shouldIncludeForSending = true );
                        };

                        gridApi.selection.on.rowSelectionChanged( $scope, ( row ) => updateFromSelection() );
                        gridApi.selection.on.rowSelectionChangedBatch( $scope, ( row ) => updateFromSelection() );

                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();                        
                    }
                };
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.authToken = this.siteInfo.authToken;
            this.isAdmin = this.siteInfo.userInfo.isAdmin;

            this.loadMailingInfo();

            this.$scope.$on( 'wizard:stepChanged', ( event, args ) =>
            {
                // If we moved to the second step, amounts due
                this.activeStepIndex = args.index;
                if( this.activeStepIndex === 1 )
                {
                    this.$timeout( () =>
                    {
                        // Tell the grid to resize as there is a bug with UI-Grid
                        //$( window ).resize();
                        //$( window ).resize();
                        //var evt = document.createEvent( 'UIEvents' );
                        //evt.initUIEvent( 'resize', true, false, window, 0 );
                        //window.dispatchEvent( evt );

                        // Update the grid to show the selection based on our internal selection
                        for( let curRow of this.selectedEntries )
                        {
                            this.gridApi.selection.selectRow( curRow );
                        }
                        //this.$timeout( () => this.gridApi.selection.selectAllRows(), 200 );

                    }, 250 );
                }
                // Or if we moved to the third step, contact method
                if( this.activeStepIndex === 2 )
                {
                    // Filter out any fields with an empty due
                    // TWC - 6/25/19 - Had a request to still be able to send out $0 invoices, makes sense
                    //this.selectedEntries = _.filter( this.selectedEntries, e => this.getTotalDue( e ) != 0 );

                    // For long lists of homes, make sure the user is brought to the top
                    window.setTimeout( () => document.getElementById( "delivery-method-header" ).scrollIntoView( true ), 50 );
                }
                // Or if we moved to the last step
                else if( this.activeStepIndex === 3 )
                {
                    this.numEmailsToSend = _.filter( this.selectedEntries, e => e.shouldSendEmail ).length;
                    this.numPaperLettersToSend = _.filter( this.selectedEntries, e => e.shouldSendPaperMail ).length;
                }
            } );

            this.shouldShowAutoUnselect = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled
                && this.siteInfo.privateSiteInfo.assessmentFrequency >= 50;

            if( this.shouldShowAutoUnselect )
            {
                this.autoUnselectLabel = MailingInvoiceController.getCurrentPayPeriodLabel( this.siteInfo.privateSiteInfo.assessmentFrequency )

                if( !this.autoUnselectLabel )
                    this.shouldShowAutoUnselect = false;
            }
        }
        

        static getCurrentPayPeriod( assessmentFrequency: number )
        {
            const payPeriodInfo = FrequencyIdToInfo( assessmentFrequency );
            if( !payPeriodInfo )
                return null;

            const today = new Date();

            const periodInfo = {
                year: today.getFullYear(),
                period: -1,
                period1Based: -1
            };

            if( payPeriodInfo.intervalName === "month" )
                periodInfo.period = today.getMonth();
            else if( payPeriodInfo.intervalName === "quarter" )
                periodInfo.period = Math.floor( today.getMonth() / 3 );
            else if( payPeriodInfo.intervalName === "half-year" )
                periodInfo.period = Math.floor( today.getMonth() / 6 );
            else if( payPeriodInfo.intervalName === "year" )
                periodInfo.period = 0;

            periodInfo.period1Based = periodInfo.period + 1;

            return periodInfo;
        }


        static getCurrentPayPeriodLabel( assessmentFrequency: number ): string
        {
            const payPeriodInfo = FrequencyIdToInfo( assessmentFrequency );
            if( !payPeriodInfo )
                return null;

            const periodNames = GetLongPayPeriodNames( payPeriodInfo.intervalName );
            if( !periodNames )
                return new Date().getFullYear().toString();

            const currentPeriod = MailingInvoiceController.getCurrentPayPeriod( assessmentFrequency );

            const yearString = currentPeriod.year.toString();

            return periodNames[currentPeriod.period] + " " + yearString;
        }


        customizeNotes( recipient: InvoiceMailingEntry )
        {
            recipient.overrideNotes = this.fullMailingInfo.notes || " ";
        }


        uncustomizeNotes( recipient: InvoiceMailingEntry )
        {
            recipient.overrideNotes = null;
        }


        setAllDues()
        {
            _.forEach( this.fullMailingInfo.mailingEntries, e => e.amountDue = this.allDuesSetAmount );
        }


        getTotalDue( recipient: InvoiceMailingEntry )
        {
            return recipient.amountDue - Math.abs( recipient.balanceForward || 0 ) + ( recipient.lateFee || 0 );
        }


        onShouldSendPaperMailChange( recipient: InvoiceMailingEntry )
        {
            //if( recipient.shouldSendPaperMail )
            //    this.validateAddress( recipient );

            if( recipient.shouldSendPaperMail )
                this.testAddressRequiredFields( recipient );
            else
            {
                recipient.isValidMailingAddress = recipient.validationMessage = null;
                this.numInvalidMailingAddresses = _.filter( this.selectedEntries, e => e.isValidMailingAddress === false ).length;
            }
        }


        onAddressChanged( recipient: InvoiceMailingEntry )
        {
            //if( recipient.shouldSendPaperMail )
            //    this.validateAddress( recipient );

            if( recipient.shouldSendPaperMail )
                this.testAddressRequiredFields( recipient );
        }


        /**
         * Test the mailability of an address
         */
        testAddressRequiredFields( recipient: InvoiceMailingEntry )
        {
            recipient.isValidating = true;
            recipient.isValidMailingAddress = null;
            recipient.validationMessage = null;

            return this.$http.post( "/api/Mailing/TestMailability", recipient.streetAddressObject ).then(
                ( response: ng.IHttpPromiseCallbackArg<AddressVerificationResult> ) =>
                {
                    recipient.isValidating = false;
                    recipient.isValidMailingAddress = response.data.isValid;
                    recipient.validationMessage = response.data.verificationMessage;

                    this.numInvalidMailingAddresses = _.filter( this.selectedEntries, e => e.isValidMailingAddress === false ).length;

                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    recipient.isValidating = false;
                    recipient.isValidMailingAddress = false;
                    recipient.validatedAddress = null;
                    recipient.validationMessage = "Address validation failed: " + response.data.exceptionMessage;
                }
            );
        }


        /**
         * Run the recipient addresses through an address validator
         */
        validateAddress( recipient: InvoiceMailingEntry )
        {
            recipient.isValidating = true;
            recipient.isValidMailingAddress = null;

            const validateUri = "/api/Mailing/VerifyAddress?address=" + encodeURIComponent( JSON.stringify( recipient.streetAddressObject ) );

            return this.$http.get( validateUri ).then( ( response: ng.IHttpPromiseCallbackArg<AddressVerificationResult> ) =>
            {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = response.data.isValid;
                recipient.validationMessage = response.data.verificationMessage;
                if( recipient.isValidMailingAddress )
                    recipient.validatedAddress = response.data.parsedStreetAddress.multiLiner;

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = false;
                recipient.validatedAddress = null;
                recipient.validationMessage = response.data.exceptionMessage;
            } );
        }


        
        previewInvoice(entry:InvoiceMailingEntry)
        {
            const previewPostInfo = new InvoicePreviewInfo();
            previewPostInfo.invoiceTitleString = this.fullMailingInfo.invoiceTitleString;
            previewPostInfo.dueDateString = this.fullMailingInfo.dueDateString;
            previewPostInfo.duesLabel = this.fullMailingInfo.duesLabel;
            previewPostInfo.fromAddress = this.fullMailingInfo.fromStreetAddress;
            previewPostInfo.mailingInfo = entry;
            previewPostInfo.notes = entry.overrideNotes || this.fullMailingInfo.notes;

            this.isLoading = true;
            entry.wasPopUpBlocked = false;

            this.$http.post( "/api/Mailing/Preview/Invoice", previewPostInfo ).then( ( response: ng.IHttpPromiseCallbackArg<InvoicePreviewInfoResult> ) =>
            {
                this.isLoading = false;

                let getUri = this.siteInfo.publicSiteInfo.baseApiUrl + "PublicMailing/Preview/Invoice/" + response.data.previewId;

                let newWindow = window.open( getUri, "_blank" );
                entry.wasPopUpBlocked = !newWindow || newWindow.closed || typeof newWindow.closed === "undefined";
                
            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
            } );

            //var entryInfo = encodeURIComponent( JSON.stringify( entry ) );
            //var invoiceUri = `/api/Mailing/Preview/Invoice?ApiAuthToken=${this.authToken}&fromAddress=${encodeURIComponent( JSON.stringify( this.fullMailingInfo.fromStreetAddress ) )}&notes=${encodeURIComponent( this.fullMailingInfo.notes )}&dueDateString=${encodeURIComponent( this.fullMailingInfo.dueDateString )}&duesLabel=${encodeURIComponent( this.fullMailingInfo.duesLabel )}&mailingInfo=${entryInfo}`;

            //window.open( invoiceUri, "_blank" );
        }


        onFinishedWizard()
        {
            if( this.numPaperLettersToSend === 0 )
            {
                if( this.numEmailsToSend === 0 )
                    alert( "No e-mails or paper letters selected to send." );
                else
                    this.submitFullMailingAfterCharge();

                return;
            }

            let checkoutHandler = StripeCheckout.configure( {
                key: StripeApiKey,
                image: '/assets/images/icons/Icon-144.png',
                locale: 'auto',
                email: this.siteInfo.userInfo.emailAddress,
                token: ( token: any ) =>
                {
                    // You can access the token ID with `token.id`.
                    // Get the token ID to your server-side code for use.
                    this.fullMailingInfo.stripeToken = token.id;

                    this.submitFullMailingAfterCharge();
                }
            } );

            this.isLoading = true;

            // Open Checkout with further options:
            checkoutHandler.open( {
                name: 'Community Ally',
                description: `Mailing ${this.numPaperLettersToSend} invoice${this.numPaperLettersToSend === 1 ? '' : 's'}`,
                zipCode: true,
                amount: this.numPaperLettersToSend * this.paperInvoiceDollars * 100 // Stripe uses cents
            } );

            // Close Checkout on page navigation:
            window.addEventListener( 'popstate', function()
            {
                checkoutHandler.close();
            } );
        }


        submitFullMailingAfterCharge()
        {
            this.isLoading = true;

            this.$http.post( "/api/Mailing/Send/Invoice", this.fullMailingInfo ).then( (response:ng.IHttpPromiseCallbackArg<FullMailingResult>) =>
            {
                this.isLoading = false;
                let message = `Your invoices have been successfully sent${response.data.hadErrors ? ', but there were errors' : ''}. You can view the status in the history tab.`;
                alert( message );

                this.$location.path( "/Mailing/History" );

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "There was a problem sending your mailing, none were sent and you were not charged. Error: " + response.data.exceptionMessage );
            } );
        }


        /**
        * Retrieve mailing info from the server
        */
        loadMailingInfo()
        {
            this.isLoading = true;

            this.$http.get( "/api/Mailing/RecipientInfo" ).then( ( response: ng.IHttpPromiseCallbackArg<InvoiceFullMailing>) =>
            {
                this.isLoading = false;

                this.fullMailingInfo = response.data;

                this.homesGridOptions.data = response.data.mailingEntries;
                this.homesGridOptions.minRowsToShow = response.data.mailingEntries.length;
                this.homesGridOptions.virtualizationThreshold = response.data.mailingEntries.length;

                this.selectedEntries = _.clone( response.data.mailingEntries );                                
            } );
        }


        /**
         * Scroll to the first invalid mail address
         */
        scrollToFirstAddressError()
        {
            let firstBadAddress = _.find( this.selectedEntries, e => e.isValidMailingAddress === false );
            if( !firstBadAddress )
                return;

            let badAddressIndex = _.indexOf( this.selectedEntries, firstBadAddress );
            if( badAddressIndex === -1 )
                return;

            let badAddressElem = document.getElementById( "recipient-entry-" + badAddressIndex );
            badAddressElem.scrollIntoView();
        }


        toggleAllSending( type: string )
        {
            if( this.selectedEntries.length === 0 )
                return;

            if( type === "email" )
            {
                let shouldSetTo = !this.selectedEntries[0].shouldSendEmail;

                for( let i = 0; i < this.selectedEntries.length; ++i )
                {
                    if( HtmlUtil.isNullOrWhitespace( this.selectedEntries[i].emailAddresses ) || !this.selectedEntries[i].amountDue )
                        this.selectedEntries[i].shouldSendEmail = false;
                    else
                        this.selectedEntries[i].shouldSendEmail = shouldSetTo;
                }
            }
            // Otherwise the user toggled sending for paper mail
            else
            {
                let shouldSetTo = !this.selectedEntries[0].shouldSendPaperMail;

                for( let i = 0; i < this.selectedEntries.length; ++i )
                {
                    if( !this.selectedEntries[i].streetAddressObject || !this.selectedEntries[i].amountDue )
                        this.selectedEntries[i].shouldSendPaperMail = false;
                    else
                        this.selectedEntries[i].shouldSendPaperMail = shouldSetTo;
                }

                // If we disabled paper mail sending then clear the errors
                if( !shouldSetTo )
                {
                    _.each( this.selectedEntries, e => e.isValidMailingAddress = e.validationMessage = null );
                    this.numInvalidMailingAddresses = 0;
                }
                // Otherwise if we enabled the sending and there are selected recipients, then verify all addresses
                else if( shouldSetTo && this.selectedEntries.length > 0 )
                {
                    let recipientsToVerify = _.clone( this.selectedEntries );

                    const validateAllStep = () =>
                    {
                        this.validateAddress( recipientsToVerify[0] ).then( () =>
                        {
                            recipientsToVerify.splice( 0, 1 );

                            while( recipientsToVerify.length > 0 && !recipientsToVerify[0].amountDue )
                                recipientsToVerify.splice( 0, 1 );

                            if( recipientsToVerify.length > 0 )
                                validateAllStep();
                        } );
                    };

                    //validateAllStep();

                    this.numAddressesToBulkValidate = recipientsToVerify.length;

                    const testAddressAllStep = () =>
                    {
                        this.testAddressRequiredFields( recipientsToVerify[0] ).then( () =>
                        {
                            recipientsToVerify.splice( 0, 1 );

                            while( recipientsToVerify.length > 0 && !recipientsToVerify[0].amountDue )
                                recipientsToVerify.splice( 0, 1 );

                            this.numAddressesToBulkValidate = recipientsToVerify.length;

                            if( recipientsToVerify.length > 0 )
                                testAddressAllStep();
                        } );
                    };

                    testAddressAllStep();
                }
            }
        }


        autoUnselectPaidOwners()
        {
            this.isLoading = true;

            const currentPeriod = MailingInvoiceController.getCurrentPayPeriod( this.siteInfo.privateSiteInfo.assessmentFrequency );

            const getUri = `/api/PaymentHistory/RecentPayPeriod/${currentPeriod.year}/${currentPeriod.period1Based}`;

            this.$http.get( getUri ).then(
                ( response: ng.IHttpPromiseCallbackArg<AssessmentPayment[]> ) =>
                {
                    this.isLoading = false;

                    for( let mailingEntry of (<InvoiceMailingEntry[]>this.homesGridOptions.data) )
                    {
                        const paidUnits = response.data.filter( u => mailingEntry.unitIds.indexOf( u.unitId ) !== -1 );

                        const isPaid = paidUnits.length > 0;

                        if( isPaid )
                            this.gridApi.selection.unSelectRow( mailingEntry, null );
                        else
                            this.gridApi.selection.selectRow( mailingEntry, null );
                    }
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve assessment status: " + response.data.exceptionMessage );
                }
            );
        }
    }
}


CA.angularApp.component( "mailingInvoice", {
    templateUrl: "/ngApp/common/mailing/mailing-invoice.html",
    controller: Ally.MailingInvoiceController
} );
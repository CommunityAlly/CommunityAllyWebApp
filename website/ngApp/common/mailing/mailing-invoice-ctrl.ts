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
        streetAddress: string;
        ownerNames: string;
        shouldSendEmail: boolean;
        shouldSendPaperMail: boolean;

        // Not sent down from the server
        isValidating: boolean;
        isValid: boolean = null;
        validationMessage: string;
        validatedAddress: string;
    }


    class InvoiceFullMailing
    {
        mailingEntries: InvoiceMailingEntry[];
        fromAddress: string;
        notes: string;
        stripeToken: string;
        sendingReason: string;
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


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private fellowResidents: Ally.FellowResidentsService, private wizardHandler: any, private $scope: ng.IScope, private $timeout: ng.ITimeoutService, private $location: ng.ILocationService )
        {
            var amountCellTemplate = '<div class="ui-grid-cell-contents">$<input type="number" style="width: 90%;" data-ng-model="row.entity[col.field]" /></div>';

            this.homesGridOptions =
                {
                    data: [],
                    columnDefs:
                        [
                            {
                                field: "homeNames",
                                displayName: AppConfig.homeName
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
                                cellTemplate: '<div class="ui-grid-cell-contents">{{ row.entity.amountDue - (row.entity.balanceForward || 0) + (row.entity.lateFee || 0) | currency }}</div>'
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

                        var updateFromSelection = () =>
                        {
                            var selectedRows = gridApi.selection.getSelectedRows();
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
                        for( var curRow of this.selectedEntries )
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
                    this.selectedEntries = _.filter( this.selectedEntries, e => this.getTotalDue( e ) != 0 );
                }
                // Or if we moved to the last step
                else if( this.activeStepIndex === 3 )
                {
                    this.numEmailsToSend = _.filter( this.selectedEntries, e => e.shouldSendEmail ).length;
                    this.numPaperLettersToSend = _.filter( this.selectedEntries, e => e.shouldSendPaperMail ).length;
                }
            } );
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
            if( recipient.shouldSendPaperMail )
                this.validateAddress( recipient );
        }


        onAddressChanged( recipient: InvoiceMailingEntry )
        {
            if( recipient.shouldSendPaperMail )
                this.validateAddress( recipient );
        }


        /**
         * Run the recipient addresses through an address validator
         */
        validateAddress( recipient: InvoiceMailingEntry )
        {
            recipient.isValidating = true;
            recipient.isValid = null;

            return this.$http.get( "/api/Mailing/VerifyAddress?address=" + encodeURIComponent( recipient.streetAddress ) ).then( ( response: ng.IHttpPromiseCallbackArg<AddressVerificationResult> ) =>
            {
                recipient.isValidating = false;
                recipient.isValid = response.data.isValid;
                recipient.validationMessage = response.data.verificationMessage;
                if( recipient.isValid )
                    recipient.validatedAddress = response.data.parsedStreetAddress.multiLiner;

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                recipient.isValidating = false;
                recipient.isValid = false;
                recipient.validatedAddress = null;
                recipient.validationMessage = response.data.exceptionMessage;
            } );
        }


        previewInvoice(entry:InvoiceMailingEntry)
        {
            var entryInfo = encodeURIComponent( JSON.stringify( entry ) );
            var invoiceUri = `/api/Mailing/Preview/Invoice?ApiAuthToken=${this.authToken}&fromAddress=${encodeURIComponent( this.fullMailingInfo.fromAddress )}&notes=${encodeURIComponent( this.fullMailingInfo.notes )}&dueDateString=${encodeURIComponent( this.fullMailingInfo.dueDateString )}&duesLabel=${encodeURIComponent( this.fullMailingInfo.duesLabel )}&mailingInfo=${entryInfo}`;

            window.open( invoiceUri, "_blank" );
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

            let stripeKey = "pk_test_FqHruhswHdrYCl4t0zLrUHXK";

            let checkoutHandler = StripeCheckout.configure( {
                key: stripeKey,
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
            else
            {
                let shouldSetTo = !this.selectedEntries[0].shouldSendPaperMail;

                for( let i = 0; i < this.selectedEntries.length; ++i )
                {
                    if( HtmlUtil.isNullOrWhitespace( this.selectedEntries[i].streetAddress ) || !this.selectedEntries[i].amountDue )
                        this.selectedEntries[i].shouldSendPaperMail = false;
                    else
                        this.selectedEntries[i].shouldSendPaperMail = shouldSetTo;
                }

                // If we enabled the sending and there are selected recipients, then verify all addresses
                if( shouldSetTo && this.selectedEntries.length > 0 )
                {
                    let recipientsToVerify = _.clone( this.selectedEntries );

                    var validateAllStep = () =>
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

                    validateAllStep();
                }
            }
        }
    }
}


CA.angularApp.component( "mailingInvoice", {
    templateUrl: "/ngApp/common/mailing/mailing-invoice.html",
    controller: Ally.MailingInvoiceController
} );
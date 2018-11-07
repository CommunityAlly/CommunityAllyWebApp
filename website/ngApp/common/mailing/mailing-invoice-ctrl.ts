declare var StripeCheckout: any;

namespace Ally
{
    class InvoiceMailingEntry
    {
        unitIds: number[];
        primaryUserId: string;
        homeNames: string;
        amountDue: number;
        emailAddress: string;
        streetAddress: string;
        ownerNames: string;
        shouldSendEmail: boolean;
        shouldSendPaperMail: boolean;
    }


    class InvoiceFullMailing
    {
        mailingEntries: InvoiceMailingEntry[];
        fromAddress: string;
        notes: string;
        stripeToken: string;
    }


    class FullMailingResult
    {
        hadErrors: boolean;
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


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private fellowResidents: Ally.FellowResidentsService, private wizardHandler: any, private $scope: ng.IScope, private $timeout: ng.ITimeoutService, private $location: ng.ILocationService )
        {
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
                                cellTemplate: '<div class="ui-grid-cell-contents">$<input type="number" style="width: 90%;" data-ng-model="row.entity.amountDue" /></div>'
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
                this.numEmailsToSend = _.filter( this.selectedEntries, e => e.shouldSendEmail ).length;
                this.numPaperLettersToSend = _.filter( this.selectedEntries, e => e.shouldSendPaperMail ).length;
                
                // If we moved to the second step
                //if( args.index === 1 )
                //    this.$timeout( () => this.showMap = true, 50 );
                //else
                //    this.showMap = false;
            } );
        }
        

        previewInvoice(entry:InvoiceMailingEntry)
        {
            var entryInfo = encodeURIComponent( JSON.stringify( entry ) );
            var invoiceUri = `/api/Mailing/Preview/Invoice?ApiAuthToken=${this.authToken}&fromAddress=${encodeURIComponent( this.fullMailingInfo.fromAddress )}&notes=${encodeURIComponent( this.fullMailingInfo.notes )}&mailingInfo=${entryInfo}`;

            window.open( invoiceUri, "_blank" );
        }


        onFinishedWizard()
        {
            if( this.numPaperLettersToSend === 0 )
                return;

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

                this.$timeout( () => this.gridApi.selection.selectAllRows(), 10 );
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
                    if( HtmlUtil.isNullOrWhitespace( this.selectedEntries[i].emailAddress ) )
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
                    if( HtmlUtil.isNullOrWhitespace( this.selectedEntries[i].streetAddress ) )
                        this.selectedEntries[i].shouldSendPaperMail = false;
                    else
                        this.selectedEntries[i].shouldSendPaperMail = shouldSetTo;
                }
            }
        }
    }
}


CA.angularApp.component( "mailingInvoice", {
    templateUrl: "/ngApp/common/mailing/mailing-invoice.html",
    controller: Ally.MailingInvoiceController
} );
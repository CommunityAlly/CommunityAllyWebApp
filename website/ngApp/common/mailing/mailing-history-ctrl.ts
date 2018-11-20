namespace Ally
{
    class MailingHistoryInfo
    {
        mailingId: number;
        mailingType: string;
        sendDateUtc: Date;
        senderUserId: string;
        amountPaid: number;
        numPaperLettersSent: number;
        numEmailsSent: number;
        mailingResultObject: MailingResults;
        sendingReason: string;
    }


    class MailingResultBase
    {
        didSuccessfullySend: boolean;
        resultMessage: string;

        // Not from the server
        mailingType: string;
    }


    class MailingResultEmail extends MailingResultBase
    {
        recipientEmail: string;
    }


    class MailingResultPaperMail extends MailingResultBase
    {
        recipientStreetAddress: FullAddress;
    }
    

    class MailingResults
    {
        emailResults: MailingResultEmail[];
        paperMailResults: MailingResultPaperMail[];
    }


    /**
     * The controller for the invoice mailing view
     */
    export class MailingHistoryController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$timeout"];
        isLoading: boolean = false;
        historyGridApi: uiGrid.IGridApiOf<MailingHistoryInfo>;
        historyGridOptions: uiGrid.IGridOptionsOf<MailingHistoryInfo>;
        resultsGridOptions: uiGrid.IGridOptionsOf<MailingResultBase>;
        viewingResults: MailingResults = null;

        // Used to compensate for ui-grid's inability to resize
        resultsGridheight: number;

        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $timeout: ng.ITimeoutService )
        {
            this.historyGridOptions =
                {
                    data: [],
                    columnDefs:
                    [
                        {
                            field: "sendDateUtc",
                            displayName: "Sent",
                            cellFilter: "date:'short'",
                            type: "date"
                        },
                        {
                            field: "numPaperLettersSent",
                            displayName: "# Letters",
                            type: "number",
                            width: 100
                        },
                        {
                            field: "numEmailsSent",
                            displayName: "# E-mails",
                            type: "number",
                            width: 100
                        },
                        {
                            field: "amountPaid",
                            displayName: "Amount Paid",
                            cellFilter: "currency",
                            type: "number",
                            width: 110
                        },
                        {
                            field: "sendingReason",
                            displayName: "Reason",
                            width: 150
                        }
                        ,{
                            field: "mailingResultObject",
                            displayName: "",
                            width: 130,
                            cellTemplate: '<div class="ui-grid-cell-contents"><span data-ng-click="grid.appScope.$ctrl.showMailingResults( row.entity )" class="text-link">View Results</span></div>'
                        }
                    ],
                    enableSorting: true,
                    enableHorizontalScrollbar: 0,
                    enableVerticalScrollbar: 0,
                    enableColumnMenus: false,
                    minRowsToShow: 5,
                    onRegisterApi: ( gridApi ) =>
                    {
                        this.historyGridApi = gridApi;
                        
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };

            
            this.resultsGridOptions =
                {
                    data: [],
                    columnDefs:
                        [
                            {
                                field: "mailingType",
                                displayName: "Type",
                                width: 100
                            },
                            {
                                field: "recipient",
                                displayName: "Recipient",
                                width: 300,
                                cellTemplate: '<div class="ui-grid-cell-contents"><span title="{{row.entity.recipient}}">{{ row.entity.recipientEmail || row.entity.recipientStreetAddress.oneLiner }}</span></div>'
                            },
                            {
                                field: "didSuccessfullySend",
                                displayName: "Successful",
                                width: 100,
                                type: "boolean"
                            },
                            {
                                field: "resultMessage",
                                displayName: "Result Message",
                                cellTemplate: '<div class="ui-grid-cell-contents"><span title="{{row.entity.resultMessage}}">{{row.entity.resultMessage}}</span></div>'
                            }
                        ],
                    enableSorting: true,
                    enableHorizontalScrollbar: 0,
                    enableVerticalScrollbar: 0,
                    enableColumnMenus: false,
                    minRowsToShow: 5,
                    onRegisterApi: ( gridApi ) =>
                    {
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
            this.refreshHistory();
        }


        /**
         * Display the results for a mailing
         */
        showMailingResults( mailingEntry: MailingHistoryInfo )
        {
            this.$timeout( () =>
            {
                _.forEach( mailingEntry.mailingResultObject.emailResults, r => r.mailingType = "E-mail" );
                _.forEach( mailingEntry.mailingResultObject.paperMailResults, r => r.mailingType = "Paper Letter" );

                var resultsRows: MailingResultBase[] = [];
                resultsRows = resultsRows.concat( mailingEntry.mailingResultObject.emailResults, mailingEntry.mailingResultObject.paperMailResults );

                this.resultsGridOptions.data = resultsRows;
                this.resultsGridOptions.minRowsToShow = resultsRows.length;
                this.resultsGridOptions.virtualizationThreshold = resultsRows.length;

                this.resultsGridheight = (resultsRows.length + 1) * this.resultsGridOptions.rowHeight;

                this.$timeout( () =>
                {
                    this.viewingResults = mailingEntry.mailingResultObject;
                    //var evt = document.createEvent( 'UIEvents' );
                    //evt.initUIEvent( 'resize', true, false, window, 0 );
                    //window.dispatchEvent( evt );
                }, 10 );

            }, 0 );
        }


        /**
         * Load the mailing history
         */
        refreshHistory()
        {
            this.isLoading = true;

            this.$http.get( "/api/Mailing/History" ).then( ( response: ng.IHttpPromiseCallbackArg<MailingHistoryInfo[]> ) =>
            {
                this.isLoading = false;
                this.historyGridOptions.data = response.data;

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to load mailing history: " + response.data.exceptionMessage );
            } );
        }
    }
}


CA.angularApp.component( "mailingHistory", {
    templateUrl: "/ngApp/common/mailing/mailing-history.html",
    controller: Ally.MailingHistoryController
} );
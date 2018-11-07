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
    }


    class MailingResultEntry
    {
        recipient: string;
        didSuccessfullySend: boolean;
        resultMessage: string;

        // Not from the server
        mailingType: string;
    }
    

    class MailingResults
    {
        emailResults: MailingResultEntry[];
        paperMailResults: MailingResultEntry[];
    }


    /**
     * The controller for the invoice mailing view
     */
    export class MailingHistoryController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo"];
        isLoading: boolean = false;
        historyGridApi: uiGrid.IGridApiOf<MailingHistoryInfo>;
        historyGridOptions: uiGrid.IGridOptionsOf<MailingHistoryInfo>;
        resultsGridOptions: uiGrid.IGridOptionsOf<MailingResultEntry>;
        viewingResults: MailingResults = null;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService )
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
                            displayName: "# Letters Sent",
                            type: "number"
                        },
                        {
                            field: "numEmailsSent",
                            displayName: "# E-mails Sent",
                            type: "number"
                        },
                        {
                            field: "amountPaid",
                            displayName: "Amount Paid",
                            cellFilter: "currency",
                            type: "number",
                            width: 110
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
                                cellTemplate: '<div class="ui-grid-cell-contents"><span title="{{row.entity.recipient}}">{{row.entity.recipient}}</span></div>'
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
            this.viewingResults = mailingEntry.mailingResultObject;

            _.forEach( this.viewingResults.emailResults, r => r.mailingType = "E-mail" );
            _.forEach( this.viewingResults.paperMailResults, r => r.mailingType = "Paper Letter" );

            var resultsRows:MailingResultEntry[] = [];
            resultsRows = resultsRows.concat( this.viewingResults.emailResults, this.viewingResults.paperMailResults );

            this.resultsGridOptions.data = resultsRows;
            this.resultsGridOptions.minRowsToShow = resultsRows.length;
            this.resultsGridOptions.virtualizationThreshold = resultsRows.length;
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
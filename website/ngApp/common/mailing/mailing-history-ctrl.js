var Ally;
(function (Ally) {
    class MailingHistoryInfo {
    }
    class MailingResultBase {
    }
    class MailingResultEmail extends MailingResultBase {
    }
    class MailingResultPaperMail extends MailingResultBase {
    }
    class MailingResults {
    }
    /**
     * The controller for the invoice mailing view
     */
    class MailingHistoryController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, $timeout) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.isLoading = false;
            this.viewingResults = null;
            this.historyGridOptions =
                {
                    data: [],
                    columnDefs: [
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
                            displayName: "# Emails",
                            type: "number",
                            width: 100
                        },
                        {
                            field: "amountPaid",
                            displayName: "Mailing Fee",
                            cellFilter: "currency",
                            type: "number",
                            width: 130
                        },
                        {
                            field: "sendingReason",
                            displayName: "Reason",
                            width: 150
                        },
                        {
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
                    onRegisterApi: (gridApi) => {
                        this.historyGridApi = gridApi;
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            this.resultsGridOptions =
                {
                    data: [],
                    columnDefs: [
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
                    onRegisterApi: (gridApi) => {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.refreshHistory();
        }
        /**
         * Display the results for a mailing
         */
        showMailingResults(mailingEntry) {
            // We need to put this in a timeout because ui-grid cannot properly size itself until
            // the DOM element for the grid is shown
            this.$timeout(() => {
                _.forEach(mailingEntry.mailingResultObject.emailResults, r => r.mailingType = "E-mail");
                _.forEach(mailingEntry.mailingResultObject.paperMailResults, r => r.mailingType = "Paper Letter");
                let resultsRows = [];
                resultsRows = resultsRows.concat(mailingEntry.mailingResultObject.emailResults, mailingEntry.mailingResultObject.paperMailResults);
                this.resultsGridOptions.data = resultsRows;
                this.resultsGridOptions.minRowsToShow = resultsRows.length;
                this.resultsGridOptions.virtualizationThreshold = resultsRows.length;
                this.resultsGridheight = (resultsRows.length + 1) * this.resultsGridOptions.rowHeight;
                this.$timeout(() => {
                    this.viewingResults = mailingEntry.mailingResultObject;
                    //var evt = document.createEvent( 'UIEvents' );
                    //evt.initUIEvent( 'resize', true, false, window, 0 );
                    //window.dispatchEvent( evt );
                }, 10);
            }, 0);
        }
        /**
         * Load the mailing history
         */
        refreshHistory() {
            this.isLoading = true;
            this.$http.get("/api/Mailing/History").then((response) => {
                this.isLoading = false;
                this.historyGridOptions.data = response.data;
                this.historyGridOptions.minRowsToShow = response.data.length;
                this.historyGridOptions.virtualizationThreshold = response.data.length;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to load mailing history: " + response.data.exceptionMessage);
            });
        }
    }
    MailingHistoryController.$inject = ["$http", "SiteInfo", "$timeout"];
    Ally.MailingHistoryController = MailingHistoryController;
})(Ally || (Ally = {}));
CA.angularApp.component("mailingHistory", {
    templateUrl: "/ngApp/common/mailing/mailing-history.html",
    controller: Ally.MailingHistoryController
});

var Ally;
(function (Ally) {
    var MailingHistoryInfo = /** @class */ (function () {
        function MailingHistoryInfo() {
        }
        return MailingHistoryInfo;
    }());
    var MailingResultEntry = /** @class */ (function () {
        function MailingResultEntry() {
        }
        return MailingResultEntry;
    }());
    var MailingResults = /** @class */ (function () {
        function MailingResults() {
        }
        return MailingResults;
    }());
    /**
     * The controller for the invoice mailing view
     */
    var MailingHistoryController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function MailingHistoryController($http, siteInfo) {
            var _this = this;
            this.$http = $http;
            this.siteInfo = siteInfo;
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
                    onRegisterApi: function (gridApi) {
                        _this.historyGridApi = gridApi;
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
                    onRegisterApi: function (gridApi) {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        MailingHistoryController.prototype.$onInit = function () {
            this.refreshHistory();
        };
        /**
         * Display the results for a mailing
         */
        MailingHistoryController.prototype.showMailingResults = function (mailingEntry) {
            this.viewingResults = mailingEntry.mailingResultObject;
            _.forEach(this.viewingResults.emailResults, function (r) { return r.mailingType = "E-mail"; });
            _.forEach(this.viewingResults.paperMailResults, function (r) { return r.mailingType = "Paper Letter"; });
            var resultsRows = [];
            resultsRows = resultsRows.concat(this.viewingResults.emailResults, this.viewingResults.paperMailResults);
            this.resultsGridOptions.data = resultsRows;
            this.resultsGridOptions.minRowsToShow = resultsRows.length;
            this.resultsGridOptions.virtualizationThreshold = resultsRows.length;
        };
        /**
         * Load the mailing history
         */
        MailingHistoryController.prototype.refreshHistory = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Mailing/History").then(function (response) {
                _this.isLoading = false;
                _this.historyGridOptions.data = response.data;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to load mailing history: " + response.data.exceptionMessage);
            });
        };
        MailingHistoryController.$inject = ["$http", "SiteInfo"];
        return MailingHistoryController;
    }());
    Ally.MailingHistoryController = MailingHistoryController;
})(Ally || (Ally = {}));
CA.angularApp.component("mailingHistory", {
    templateUrl: "/ngApp/common/mailing/mailing-history.html",
    controller: Ally.MailingHistoryController
});

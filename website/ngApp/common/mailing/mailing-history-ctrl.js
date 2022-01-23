var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    var MailingHistoryInfo = /** @class */ (function () {
        function MailingHistoryInfo() {
        }
        return MailingHistoryInfo;
    }());
    var MailingResultBase = /** @class */ (function () {
        function MailingResultBase() {
        }
        return MailingResultBase;
    }());
    var MailingResultEmail = /** @class */ (function (_super) {
        __extends(MailingResultEmail, _super);
        function MailingResultEmail() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return MailingResultEmail;
    }(MailingResultBase));
    var MailingResultPaperMail = /** @class */ (function (_super) {
        __extends(MailingResultPaperMail, _super);
        function MailingResultPaperMail() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return MailingResultPaperMail;
    }(MailingResultBase));
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
        function MailingHistoryController($http, siteInfo, $timeout) {
            var _this = this;
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
                            displayName: "# E-mails",
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
            var _this = this;
            // We need to put this in a timeout because ui-grid cannot properly size itself until
            // the DOM element for the grid is shown
            this.$timeout(function () {
                _.forEach(mailingEntry.mailingResultObject.emailResults, function (r) { return r.mailingType = "E-mail"; });
                _.forEach(mailingEntry.mailingResultObject.paperMailResults, function (r) { return r.mailingType = "Paper Letter"; });
                var resultsRows = [];
                resultsRows = resultsRows.concat(mailingEntry.mailingResultObject.emailResults, mailingEntry.mailingResultObject.paperMailResults);
                _this.resultsGridOptions.data = resultsRows;
                _this.resultsGridOptions.minRowsToShow = resultsRows.length;
                _this.resultsGridOptions.virtualizationThreshold = resultsRows.length;
                _this.resultsGridheight = (resultsRows.length + 1) * _this.resultsGridOptions.rowHeight;
                _this.$timeout(function () {
                    _this.viewingResults = mailingEntry.mailingResultObject;
                    //var evt = document.createEvent( 'UIEvents' );
                    //evt.initUIEvent( 'resize', true, false, window, 0 );
                    //window.dispatchEvent( evt );
                }, 10);
            }, 0);
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
                _this.historyGridOptions.minRowsToShow = response.data.length;
                _this.historyGridOptions.virtualizationThreshold = response.data.length;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to load mailing history: " + response.data.exceptionMessage);
            });
        };
        MailingHistoryController.$inject = ["$http", "SiteInfo", "$timeout"];
        return MailingHistoryController;
    }());
    Ally.MailingHistoryController = MailingHistoryController;
})(Ally || (Ally = {}));
CA.angularApp.component("mailingHistory", {
    templateUrl: "/ngApp/common/mailing/mailing-history.html",
    controller: Ally.MailingHistoryController
});

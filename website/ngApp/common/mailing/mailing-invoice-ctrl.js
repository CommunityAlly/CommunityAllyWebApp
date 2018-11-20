var Ally;
(function (Ally) {
    var InvoiceMailingEntry = /** @class */ (function () {
        function InvoiceMailingEntry() {
            this.isValid = null;
        }
        return InvoiceMailingEntry;
    }());
    var InvoiceFullMailing = /** @class */ (function () {
        function InvoiceFullMailing() {
        }
        return InvoiceFullMailing;
    }());
    var FullMailingResult = /** @class */ (function () {
        function FullMailingResult() {
        }
        return FullMailingResult;
    }());
    var AddressVerificationResult = /** @class */ (function () {
        function AddressVerificationResult() {
        }
        return AddressVerificationResult;
    }());
    /**
     * The controller for the invoice mailing view
     */
    var MailingInvoiceController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function MailingInvoiceController($http, siteInfo, fellowResidents, wizardHandler, $scope, $timeout, $location) {
            var _this = this;
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.wizardHandler = wizardHandler;
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.$location = $location;
            this.isLoading = false;
            this.selectedEntries = [];
            this.numEmailsToSend = 0;
            this.numPaperLettersToSend = 0;
            this.paperInvoiceDollars = 2;
            var amountCellTemplate = '<div class="ui-grid-cell-contents">$<input type="number" style="width: 90%;" data-ng-model="row.entity[col.field]" /></div>';
            this.homesGridOptions =
                {
                    data: [],
                    columnDefs: [
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
                    onRegisterApi: function (gridApi) {
                        _this.gridApi = gridApi;
                        var updateFromSelection = function () {
                            var selectedRows = gridApi.selection.getSelectedRows();
                            _this.selectedEntries = selectedRows;
                            //_.forEach( <InvoiceMailingEntry[]>this.homesGridOptions.data, e => e.shouldIncludeForSending = false );
                            //_.forEach( this.selectedEntries, e => e.shouldIncludeForSending = true );
                        };
                        gridApi.selection.on.rowSelectionChanged($scope, function (row) { return updateFromSelection(); });
                        gridApi.selection.on.rowSelectionChangedBatch($scope, function (row) { return updateFromSelection(); });
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        MailingInvoiceController.prototype.$onInit = function () {
            var _this = this;
            this.authToken = this.siteInfo.authToken;
            this.loadMailingInfo();
            this.$scope.$on('wizard:stepChanged', function (event, args) {
                // If we moved to the second step, amounts due
                _this.activeStepIndex = args.index;
                if (_this.activeStepIndex === 1) {
                    _this.$timeout(function () {
                        // Tell the grid to resize as there is a bug with UI-Grid
                        //$( window ).resize();
                        //$( window ).resize();
                        //var evt = document.createEvent( 'UIEvents' );
                        //evt.initUIEvent( 'resize', true, false, window, 0 );
                        //window.dispatchEvent( evt );
                        // Update the grid to show the selection based on our internal selection
                        for (var _i = 0, _a = _this.selectedEntries; _i < _a.length; _i++) {
                            var curRow = _a[_i];
                            _this.gridApi.selection.selectRow(curRow);
                        }
                        //this.$timeout( () => this.gridApi.selection.selectAllRows(), 200 );
                    }, 250);
                }
                // Or if we moved to the third step, contact method
                if (_this.activeStepIndex === 2) {
                    // Filter out any fields with an empty due
                    _this.selectedEntries = _.filter(_this.selectedEntries, function (e) { return _this.getTotalDue(e) != 0; });
                }
                else if (_this.activeStepIndex === 3) {
                    _this.numEmailsToSend = _.filter(_this.selectedEntries, function (e) { return e.shouldSendEmail; }).length;
                    _this.numPaperLettersToSend = _.filter(_this.selectedEntries, function (e) { return e.shouldSendPaperMail; }).length;
                }
            });
        };
        MailingInvoiceController.prototype.setAllDues = function () {
            var _this = this;
            _.forEach(this.fullMailingInfo.mailingEntries, function (e) { return e.amountDue = _this.allDuesSetAmount; });
        };
        MailingInvoiceController.prototype.getTotalDue = function (recipient) {
            return recipient.amountDue - Math.abs(recipient.balanceForward || 0) + (recipient.lateFee || 0);
        };
        MailingInvoiceController.prototype.onShouldSendPaperMailChange = function (recipient) {
            //if( recipient.shouldSendPaperMail )
            //    this.validateAddress( recipient );
        };
        MailingInvoiceController.prototype.onAddressChanged = function (recipient) {
            if (recipient.shouldSendPaperMail)
                this.validateAddress(recipient);
        };
        /**
         * Run the recipient addresses through an address validator
         */
        MailingInvoiceController.prototype.validateAddress = function (recipient) {
            recipient.isValidating = true;
            recipient.isValid = null;
            var validateUri = "/api/Mailing/VerifyAddress?address=" + encodeURIComponent(JSON.stringify(recipient.streetAddressObject));
            return this.$http.get(validateUri).then(function (response) {
                recipient.isValidating = false;
                recipient.isValid = response.data.isValid;
                recipient.validationMessage = response.data.verificationMessage;
                if (recipient.isValid)
                    recipient.validatedAddress = response.data.parsedStreetAddress.multiLiner;
            }, function (response) {
                recipient.isValidating = false;
                recipient.isValid = false;
                recipient.validatedAddress = null;
                recipient.validationMessage = response.data.exceptionMessage;
            });
        };
        MailingInvoiceController.prototype.previewInvoice = function (entry) {
            var entryInfo = encodeURIComponent(JSON.stringify(entry));
            var invoiceUri = "/api/Mailing/Preview/Invoice?ApiAuthToken=" + this.authToken + "&fromAddress=" + encodeURIComponent(this.fullMailingInfo.fromAddress) + "&notes=" + encodeURIComponent(this.fullMailingInfo.notes) + "&dueDateString=" + encodeURIComponent(this.fullMailingInfo.dueDateString) + "&duesLabel=" + encodeURIComponent(this.fullMailingInfo.duesLabel) + "&mailingInfo=" + entryInfo;
            window.open(invoiceUri, "_blank");
        };
        MailingInvoiceController.prototype.onFinishedWizard = function () {
            var _this = this;
            if (this.numPaperLettersToSend === 0) {
                if (this.numEmailsToSend === 0)
                    alert("No e-mails or paper letters selected to send.");
                else
                    this.submitFullMailingAfterCharge();
                return;
            }
            //let stripeKey = "pk_test_FqHruhswHdrYCl4t0zLrUHXK";
            var stripeKey = "pk_live_fV2yERkfAyzoO9oWSfORh5iH";
            var checkoutHandler = StripeCheckout.configure({
                key: stripeKey,
                image: '/assets/images/icons/Icon-144.png',
                locale: 'auto',
                email: this.siteInfo.userInfo.emailAddress,
                token: function (token) {
                    // You can access the token ID with `token.id`.
                    // Get the token ID to your server-side code for use.
                    _this.fullMailingInfo.stripeToken = token.id;
                    _this.submitFullMailingAfterCharge();
                }
            });
            this.isLoading = true;
            // Open Checkout with further options:
            checkoutHandler.open({
                name: 'Community Ally',
                description: "Mailing " + this.numPaperLettersToSend + " invoice" + (this.numPaperLettersToSend === 1 ? '' : 's'),
                zipCode: true,
                amount: this.numPaperLettersToSend * this.paperInvoiceDollars * 100 // Stripe uses cents
            });
            // Close Checkout on page navigation:
            window.addEventListener('popstate', function () {
                checkoutHandler.close();
            });
        };
        MailingInvoiceController.prototype.submitFullMailingAfterCharge = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/Mailing/Send/Invoice", this.fullMailingInfo).then(function (response) {
                _this.isLoading = false;
                var message = "Your invoices have been successfully sent" + (response.data.hadErrors ? ', but there were errors' : '') + ". You can view the status in the history tab.";
                alert(message);
                _this.$location.path("/Mailing/History");
            }, function (response) {
                _this.isLoading = false;
                alert("There was a problem sending your mailing, none were sent and you were not charged. Error: " + response.data.exceptionMessage);
            });
        };
        /**
        * Retrieve mailing info from the server
        */
        MailingInvoiceController.prototype.loadMailingInfo = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Mailing/RecipientInfo").then(function (response) {
                _this.isLoading = false;
                _this.fullMailingInfo = response.data;
                _this.homesGridOptions.data = response.data.mailingEntries;
                _this.homesGridOptions.minRowsToShow = response.data.mailingEntries.length;
                _this.homesGridOptions.virtualizationThreshold = response.data.mailingEntries.length;
                _this.selectedEntries = _.clone(response.data.mailingEntries);
            });
        };
        MailingInvoiceController.prototype.toggleAllSending = function (type) {
            var _this = this;
            if (this.selectedEntries.length === 0)
                return;
            if (type === "email") {
                var shouldSetTo = !this.selectedEntries[0].shouldSendEmail;
                for (var i = 0; i < this.selectedEntries.length; ++i) {
                    if (HtmlUtil.isNullOrWhitespace(this.selectedEntries[i].emailAddresses) || !this.selectedEntries[i].amountDue)
                        this.selectedEntries[i].shouldSendEmail = false;
                    else
                        this.selectedEntries[i].shouldSendEmail = shouldSetTo;
                }
            }
            else {
                var shouldSetTo = !this.selectedEntries[0].shouldSendPaperMail;
                for (var i = 0; i < this.selectedEntries.length; ++i) {
                    if (!this.selectedEntries[i].streetAddressObject || !this.selectedEntries[i].amountDue)
                        this.selectedEntries[i].shouldSendPaperMail = false;
                    else
                        this.selectedEntries[i].shouldSendPaperMail = shouldSetTo;
                }
                // If we enabled the sending and there are selected recipients, then verify all addresses
                if (shouldSetTo && this.selectedEntries.length > 0) {
                    var recipientsToVerify_1 = _.clone(this.selectedEntries);
                    var validateAllStep = function () {
                        _this.validateAddress(recipientsToVerify_1[0]).then(function () {
                            recipientsToVerify_1.splice(0, 1);
                            while (recipientsToVerify_1.length > 0 && !recipientsToVerify_1[0].amountDue)
                                recipientsToVerify_1.splice(0, 1);
                            if (recipientsToVerify_1.length > 0)
                                validateAllStep();
                        });
                    };
                    //validateAllStep();
                }
            }
        };
        MailingInvoiceController.$inject = ["$http", "SiteInfo", "fellowResidents", "WizardHandler", "$scope", "$timeout", "$location"];
        return MailingInvoiceController;
    }());
    Ally.MailingInvoiceController = MailingInvoiceController;
})(Ally || (Ally = {}));
CA.angularApp.component("mailingInvoice", {
    templateUrl: "/ngApp/common/mailing/mailing-invoice.html",
    controller: Ally.MailingInvoiceController
});

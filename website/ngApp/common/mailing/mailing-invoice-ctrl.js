var Ally;
(function (Ally) {
    var InvoiceMailingEntry = /** @class */ (function () {
        function InvoiceMailingEntry() {
            this.isValidMailingAddress = null;
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
    var InvoicePreviewInfo = /** @class */ (function () {
        function InvoicePreviewInfo() {
        }
        return InvoicePreviewInfo;
    }());
    var InvoicePreviewInfoResult = /** @class */ (function () {
        function InvoicePreviewInfoResult() {
        }
        return InvoicePreviewInfoResult;
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
            this.isAdmin = false;
            this.numInvalidMailingAddresses = 0;
            this.numAddressesToBulkValidate = 0;
            this.shouldShowAutoUnselect = false;
            var amountCellTemplate = '<div class="ui-grid-cell-contents">$<input type="number" style="width: 90%;" data-ng-model="row.entity[col.field]" autocomplete="off" data-lpignore="true" data-form-type="other" /></div>';
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
                    onRegisterApi: function (gridApi) {
                        _this.gridApi = gridApi;
                        var updateFromSelection = function () {
                            var selectedRows = gridApi.selection.getSelectedRows();
                            _this.selectedEntries = selectedRows;
                            //_.forEach( <InvoiceMailingEntry[]>this.homesGridOptions.data, e => e.shouldIncludeForSending = false );
                            //_.forEach( this.selectedEntries, e => e.shouldIncludeForSending = true );
                        };
                        gridApi.selection.on.rowSelectionChanged($scope, function () { return updateFromSelection(); });
                        gridApi.selection.on.rowSelectionChangedBatch($scope, function () { return updateFromSelection(); });
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
            this.isAdmin = this.siteInfo.userInfo.isAdmin;
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
                    // TWC - 6/25/19 - Had a request to still be able to send out $0 invoices, makes sense
                    //this.selectedEntries = _.filter( this.selectedEntries, e => this.getTotalDue( e ) != 0 );
                    // For long lists of homes, make sure the user is brought to the top
                    window.setTimeout(function () { return document.getElementById("delivery-method-header").scrollIntoView(true); }, 50);
                }
                // Or if we moved to the last step
                else if (_this.activeStepIndex === 3) {
                    _this.numEmailsToSend = _.filter(_this.selectedEntries, function (e) { return e.shouldSendEmail; }).length;
                    _this.numPaperLettersToSend = _.filter(_this.selectedEntries, function (e) { return e.shouldSendPaperMail; }).length;
                }
            });
            this.shouldShowAutoUnselect = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled
                && this.siteInfo.privateSiteInfo.assessmentFrequency >= 50;
            if (this.shouldShowAutoUnselect) {
                this.autoUnselectLabel = MailingInvoiceController.getCurrentPayPeriodLabel(this.siteInfo.privateSiteInfo.assessmentFrequency);
                if (!this.autoUnselectLabel)
                    this.shouldShowAutoUnselect = false;
            }
        };
        MailingInvoiceController.getCurrentPayPeriod = function (assessmentFrequency) {
            var payPeriodInfo = FrequencyIdToInfo(assessmentFrequency);
            if (!payPeriodInfo)
                return null;
            var today = new Date();
            var periodInfo = {
                year: today.getFullYear(),
                period: -1,
                period1Based: -1
            };
            if (payPeriodInfo.intervalName === "month")
                periodInfo.period = today.getMonth();
            else if (payPeriodInfo.intervalName === "quarter")
                periodInfo.period = Math.floor(today.getMonth() / 3);
            else if (payPeriodInfo.intervalName === "half-year")
                periodInfo.period = Math.floor(today.getMonth() / 6);
            else if (payPeriodInfo.intervalName === "year")
                periodInfo.period = 0;
            periodInfo.period1Based = periodInfo.period + 1;
            return periodInfo;
        };
        MailingInvoiceController.getCurrentPayPeriodLabel = function (assessmentFrequency) {
            var payPeriodInfo = FrequencyIdToInfo(assessmentFrequency);
            if (!payPeriodInfo)
                return null;
            var periodNames = GetLongPayPeriodNames(payPeriodInfo.intervalName);
            if (!periodNames)
                return new Date().getFullYear().toString();
            var currentPeriod = MailingInvoiceController.getCurrentPayPeriod(assessmentFrequency);
            var yearString = currentPeriod.year.toString();
            return periodNames[currentPeriod.period] + " " + yearString;
        };
        MailingInvoiceController.prototype.customizeNotes = function (recipient) {
            recipient.overrideNotes = this.fullMailingInfo.notes || " ";
        };
        MailingInvoiceController.prototype.uncustomizeNotes = function (recipient) {
            recipient.overrideNotes = null;
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
            if (recipient.shouldSendPaperMail)
                this.testAddressRequiredFields(recipient);
            else {
                recipient.isValidMailingAddress = recipient.validationMessage = null;
                this.numInvalidMailingAddresses = _.filter(this.selectedEntries, function (e) { return e.isValidMailingAddress === false; }).length;
            }
        };
        MailingInvoiceController.prototype.onAddressChanged = function (recipient) {
            //if( recipient.shouldSendPaperMail )
            //    this.validateAddress( recipient );
            if (recipient.shouldSendPaperMail)
                this.testAddressRequiredFields(recipient);
        };
        /**
         * Test the mailability of an address
         */
        MailingInvoiceController.prototype.testAddressRequiredFields = function (recipient) {
            var _this = this;
            recipient.isValidating = true;
            recipient.isValidMailingAddress = null;
            recipient.validationMessage = null;
            return this.$http.post("/api/Mailing/TestMailability", recipient.streetAddressObject).then(function (response) {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = response.data.isValid;
                recipient.validationMessage = response.data.verificationMessage;
                _this.numInvalidMailingAddresses = _.filter(_this.selectedEntries, function (e) { return e.isValidMailingAddress === false; }).length;
            }, function (response) {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = false;
                recipient.validatedAddress = null;
                recipient.validationMessage = "Address validation failed: " + response.data.exceptionMessage;
            });
        };
        /**
         * Run the recipient addresses through an address validator
         */
        MailingInvoiceController.prototype.validateAddress = function (recipient) {
            recipient.isValidating = true;
            recipient.isValidMailingAddress = null;
            var validateUri = "/api/Mailing/VerifyAddress?address=" + encodeURIComponent(JSON.stringify(recipient.streetAddressObject));
            return this.$http.get(validateUri).then(function (response) {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = response.data.isValid;
                recipient.validationMessage = response.data.verificationMessage;
                if (recipient.isValidMailingAddress)
                    recipient.validatedAddress = response.data.parsedStreetAddress.multiLiner;
            }, function (response) {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = false;
                recipient.validatedAddress = null;
                recipient.validationMessage = response.data.exceptionMessage;
            });
        };
        MailingInvoiceController.prototype.previewInvoice = function (entry) {
            var _this = this;
            var previewPostInfo = new InvoicePreviewInfo();
            previewPostInfo.invoiceTitleString = this.fullMailingInfo.invoiceTitleString;
            previewPostInfo.dueDateString = this.fullMailingInfo.dueDateString;
            previewPostInfo.duesLabel = this.fullMailingInfo.duesLabel;
            previewPostInfo.fromAddress = this.fullMailingInfo.fromStreetAddress;
            previewPostInfo.mailingInfo = entry;
            previewPostInfo.notes = entry.overrideNotes || this.fullMailingInfo.notes;
            this.isLoading = true;
            entry.wasPopUpBlocked = false;
            this.$http.post("/api/Mailing/Preview/Invoice", previewPostInfo).then(function (response) {
                _this.isLoading = false;
                var getUri = _this.siteInfo.publicSiteInfo.baseApiUrl + "PublicMailing/Preview/Invoice/" + response.data.previewId;
                var newWindow = window.open(getUri, "_blank");
                entry.wasPopUpBlocked = !newWindow || newWindow.closed || typeof newWindow.closed === "undefined";
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to preview invoice: " + response.data.exceptionMessage);
            });
            //var entryInfo = encodeURIComponent( JSON.stringify( entry ) );
            //var invoiceUri = `/api/Mailing/Preview/Invoice?ApiAuthToken=${this.authToken}&fromAddress=${encodeURIComponent( JSON.stringify( this.fullMailingInfo.fromStreetAddress ) )}&notes=${encodeURIComponent( this.fullMailingInfo.notes )}&dueDateString=${encodeURIComponent( this.fullMailingInfo.dueDateString )}&duesLabel=${encodeURIComponent( this.fullMailingInfo.duesLabel )}&mailingInfo=${entryInfo}`;
            //window.open( invoiceUri, "_blank" );
        };
        MailingInvoiceController.prototype.onFinishedWizard = function () {
            var _this = this;
            if (this.numPaperLettersToSend === 0) {
                if (this.numEmailsToSend === 0)
                    alert("No emails or paper letters selected to send.");
                else
                    this.submitFullMailingAfterCharge();
                return;
            }
            var checkoutHandler = StripeCheckout.configure({
                key: StripeApiKey,
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
        /**
         * Scroll to the first invalid mail address
         */
        MailingInvoiceController.prototype.scrollToFirstAddressError = function () {
            var firstBadAddress = _.find(this.selectedEntries, function (e) { return e.isValidMailingAddress === false; });
            if (!firstBadAddress)
                return;
            var badAddressIndex = _.indexOf(this.selectedEntries, firstBadAddress);
            if (badAddressIndex === -1)
                return;
            var badAddressElem = document.getElementById("recipient-entry-" + badAddressIndex);
            badAddressElem.scrollIntoView();
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
            // Otherwise the user toggled sending for paper mail
            else {
                var shouldSetTo = !this.selectedEntries[0].shouldSendPaperMail;
                for (var i = 0; i < this.selectedEntries.length; ++i) {
                    if (!this.selectedEntries[i].streetAddressObject || !this.selectedEntries[i].amountDue)
                        this.selectedEntries[i].shouldSendPaperMail = false;
                    else
                        this.selectedEntries[i].shouldSendPaperMail = shouldSetTo;
                }
                // If we disabled paper mail sending then clear the errors
                if (!shouldSetTo) {
                    _.each(this.selectedEntries, function (e) { return e.isValidMailingAddress = e.validationMessage = null; });
                    this.numInvalidMailingAddresses = 0;
                }
                // Otherwise if we enabled the sending and there are selected recipients, then verify all addresses
                else if (shouldSetTo && this.selectedEntries.length > 0) {
                    var recipientsToVerify_1 = _.clone(this.selectedEntries);
                    //const validateAllStep = () =>
                    //{
                    //    this.validateAddress( recipientsToVerify[0] ).then( () =>
                    //    {
                    //        recipientsToVerify.splice( 0, 1 );
                    //        while( recipientsToVerify.length > 0 && !recipientsToVerify[0].amountDue )
                    //            recipientsToVerify.splice( 0, 1 );
                    //        if( recipientsToVerify.length > 0 )
                    //            validateAllStep();
                    //    } );
                    //};
                    //validateAllStep();
                    this.numAddressesToBulkValidate = recipientsToVerify_1.length;
                    var testAddressAllStep_1 = function () {
                        _this.testAddressRequiredFields(recipientsToVerify_1[0]).then(function () {
                            recipientsToVerify_1.splice(0, 1);
                            while (recipientsToVerify_1.length > 0 && !recipientsToVerify_1[0].amountDue)
                                recipientsToVerify_1.splice(0, 1);
                            _this.numAddressesToBulkValidate = recipientsToVerify_1.length;
                            if (recipientsToVerify_1.length > 0)
                                testAddressAllStep_1();
                        });
                    };
                    testAddressAllStep_1();
                }
            }
        };
        MailingInvoiceController.prototype.autoUnselectPaidOwners = function () {
            var _this = this;
            this.isLoading = true;
            var currentPeriod = MailingInvoiceController.getCurrentPayPeriod(this.siteInfo.privateSiteInfo.assessmentFrequency);
            var getUri = "/api/PaymentHistory/RecentPayPeriod/" + currentPeriod.year + "/" + currentPeriod.period1Based;
            this.$http.get(getUri).then(function (response) {
                _this.isLoading = false;
                var _loop_1 = function (mailingEntry) {
                    var paidUnits = response.data.filter(function (u) { return mailingEntry.unitIds.indexOf(u.unitId) !== -1; });
                    var isPaid = paidUnits.length > 0;
                    if (isPaid)
                        _this.gridApi.selection.unSelectRow(mailingEntry, null);
                    else
                        _this.gridApi.selection.selectRow(mailingEntry, null);
                };
                for (var _i = 0, _a = _this.homesGridOptions.data; _i < _a.length; _i++) {
                    var mailingEntry = _a[_i];
                    _loop_1(mailingEntry);
                }
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve assessment status: " + response.data.exceptionMessage);
            });
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

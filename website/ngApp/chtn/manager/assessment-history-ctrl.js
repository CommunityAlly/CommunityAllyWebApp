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
    var PeriodicPaymentFrequency;
    (function (PeriodicPaymentFrequency) {
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Monthly"] = 50] = "Monthly";
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Quarterly"] = 51] = "Quarterly";
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Semiannually"] = 52] = "Semiannually";
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Annually"] = 53] = "Annually";
    })(PeriodicPaymentFrequency || (PeriodicPaymentFrequency = {}));
    var PeriodicPayment = /** @class */ (function () {
        function PeriodicPayment() {
            this.isEmptyEntry = false;
        }
        return PeriodicPayment;
    }());
    var AssessmentPayment = /** @class */ (function (_super) {
        __extends(AssessmentPayment, _super);
        function AssessmentPayment() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return AssessmentPayment;
    }(PeriodicPayment));
    var PayerInfo = /** @class */ (function () {
        function PayerInfo() {
        }
        return PayerInfo;
    }());
    var FullPaymentHistory = /** @class */ (function () {
        function FullPaymentHistory() {
        }
        return FullPaymentHistory;
    }());
    /**
     * The controller for the page to view resident assessment payment history
     */
    var AssessmentHistoryController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function AssessmentHistoryController($http, $location, siteInfo, appCacheService) {
            this.$http = $http;
            this.$location = $location;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.LocalStorageKey_ShowPaymentInfo = "AssessmentHistory_ShowPaymentInfo";
            // The number of pay periods that are visible on the grid
            this.NumPeriodsVisible = 10;
            this.shouldShowCreateSpecialAssessment = false;
            this.unitPayments = {};
            this.showRowType = "unit";
            this.isForPta = false;
            this.onSavePayment = function () {
                var innerThis = this;
                var onSave = function () {
                    innerThis.isSavingPayment = false;
                    innerThis.editPayment = null;
                    innerThis.retrievePaymentHistory();
                };
                var onError = function (httpResponse) {
                    innerThis.isSavingPayment = false;
                    alert(httpResponse.data.message);
                    innerThis.editPayment = null;
                };
                this.isSavingPayment = true;
                if (this.editPayment.payment.paymentId) {
                    analytics.track("editAssessmentHistoryPayment");
                    this.$http.put("/api/PaymentHistory", this.editPayment.payment).then(onSave, onError);
                }
                else {
                    analytics.track("addAssessmentHistoryPayment");
                    this.$http.post("/api/PaymentHistory", this.editPayment.payment).then(onSave, onError);
                }
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        AssessmentHistoryController.prototype.$onInit = function () {
            this.isForPta = AppConfig.appShortName === "pta";
            var isMembershipGroup = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
            if (isMembershipGroup)
                this.pageTitle = "Membership Dues Payment History";
            else
                this.pageTitle = "Assessment Payment History";
            if (this.isForPta)
                this.NumPeriodsVisible = 8;
            this.authToken = window.localStorage.getItem("ApiAuthToken");
            if (AppConfig.isChtnSite)
                this.showRowType = "unit";
            else if (isMembershipGroup)
                this.showRowType = "member";
            else
                console.log("Unhandled app type for payment history: " + AppConfig.appShortName);
            this.units = [
                { name: "A", monthPayments: [1, 2, 3] },
                { name: "B", monthPayments: [1, 2, 3] },
                { name: "C", monthPayments: [1, 2, 3] }
            ];
            // Example
            var payment = {
                paymentId: 0,
                year: 2014,
                period: 1,
                isPaid: false,
                amount: 1.23,
                paymentDate: "1/2/14",
                checkNumber: "123",
                unitId: 1
            };
            this.showPaymentInfo = window.localStorage[this.LocalStorageKey_ShowPaymentInfo] === "true";
            var PeriodicPaymentFrequency_Monthly = 50;
            var PeriodicPaymentFrequency_Quarterly = 51;
            var PeriodicPaymentFrequency_Semiannually = 52;
            var PeriodicPaymentFrequency_Annually = 53;
            this.assessmentFrequency = this.siteInfo.privateSiteInfo.assessmentFrequency;
            if (isMembershipGroup)
                this.assessmentFrequency = PeriodicPaymentFrequency_Annually;
            // Set the period name
            this.payPeriodName = "month";
            if (this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly)
                this.payPeriodName = "quarter";
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually)
                this.payPeriodName = "half-year";
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Annually)
                this.payPeriodName = "year";
            // Set the range values
            this.maxPeriodRange = 12;
            if (this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly)
                this.maxPeriodRange = 4;
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually)
                this.maxPeriodRange = 2;
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Annually)
                this.maxPeriodRange = 1;
            // Set the label values
            this.monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            var shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            var quarterNames = ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"];
            var shortQuarterNames = ["Q1", "Q2", "Q3", "Q4"];
            var semiannualNames = ["First Half", "Second Half"];
            var shortSemiannualNames = ["1st Half", "2nd Half"];
            this.periodNames = this.monthNames;
            this.shortPeriodNames = shortMonthNames;
            if (this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly) {
                this.periodNames = quarterNames;
                this.shortPeriodNames = shortQuarterNames;
            }
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually) {
                this.periodNames = semiannualNames;
                this.shortPeriodNames = shortSemiannualNames;
            }
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Annually) {
                this.periodNames = [""];
                this.shortPeriodNames = [""];
            }
            // Set the current period
            this.startPeriodValue = new Date().getMonth() + 2;
            this.startYearValue = new Date().getFullYear();
            if (this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly) {
                this.startPeriodValue = Math.floor(new Date().getMonth() / 4) + 2;
            }
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually) {
                this.startPeriodValue = Math.floor(new Date().getMonth() / 6) + 2;
            }
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Annually) {
                this.startPeriodValue = 1;
                this.startYearValue = new Date().getFullYear() + 1;
            }
            if (this.startPeriodValue > this.maxPeriodRange) {
                this.startPeriodValue = 1;
                this.startYearValue += 1;
            }
            this.isPeriodicPaymentTrackingEnabled = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled;
            this.retrievePaymentHistory();
        };
        AssessmentHistoryController.prototype.onChangePeriodicPaymentTracking = function () {
            if (this.isPeriodicPaymentTrackingEnabled === this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled)
                return;
            // If the user is enabling the tracking then make sure all units have a payment entered
            if (this.isPeriodicPaymentTrackingEnabled) {
                //if( Object.keys(vm.unitPayments).length !== SiteInfo.privateSiteInfo.NumUnits )
                //{
                //    vm.isPeriodicPaymentTrackingEnabled = false;
                //    alert( "You must specify this most recent payment for every unit." );
                //    return;
                //}
            }
            this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled = this.isPeriodicPaymentTrackingEnabled;
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/Association/updatePeriodicPaymentTracking?isPeriodicPaymentTrackingEnabled=" + this.isPeriodicPaymentTrackingEnabled, null).then(function () {
                innerThis.isLoading = false;
            }, function () {
                alert("Failed to update the payment tracking");
                innerThis.isLoading = false;
            });
        };
        /**
         * Add in entries to the payments array so every period has an entry
         */
        AssessmentHistoryController.prototype.fillInEmptyPaymentsForUnit = function (unit) {
            var defaultOwnerUserId = (unit.owners !== null && unit.owners.length > 0) ? unit.owners[0].userId : null;
            var sortedPayments = [];
            var curPeriod = this.startPeriodValue;
            var curYearValue = this.startYearValue;
            for (var periodIndex = 0; periodIndex < this.NumPeriodsVisible; ++periodIndex) {
                if (curPeriod < 1) {
                    curPeriod = this.maxPeriodRange;
                    --curYearValue;
                }
                var curPeriodPayment = _.find(unit.allPayments, function (p) { return p.period === curPeriod && p.year === curYearValue; });
                if (curPeriodPayment === undefined || curPeriodPayment.isEmptyEntry) {
                    curPeriodPayment = {
                        isPaid: false,
                        period: curPeriod,
                        year: curYearValue,
                        amount: unit.assessment,
                        payerUserId: defaultOwnerUserId,
                        paymentDate: new Date(),
                        isEmptyEntry: true
                    };
                }
                sortedPayments.push(curPeriodPayment);
                // curPeriod goes 1-vm.maxPeriodRange
                curPeriod--;
            }
            return sortedPayments;
        };
        /**
         * Add in entries to the payments array so every period has an entry
         */
        AssessmentHistoryController.prototype.fillInEmptyPaymentsForMember = function (member) {
            var sortedPayments = [];
            var curPeriod = this.startPeriodValue;
            var curYearValue = this.startYearValue;
            for (var periodIndex = 0; periodIndex < this.NumPeriodsVisible; ++periodIndex) {
                if (curPeriod < 1) {
                    curPeriod = this.maxPeriodRange;
                    --curYearValue;
                }
                var curPeriodPayment = _.find(member.enteredPayments, function (p) { return p.period === curPeriod && p.year === curYearValue; });
                if (curPeriodPayment === undefined || curPeriodPayment.isEmptyEntry) {
                    curPeriodPayment = {
                        isPaid: false,
                        paymentId: null,
                        period: curPeriod,
                        year: curYearValue,
                        amount: 0,
                        payerUserId: member.userId,
                        paymentDate: new Date(),
                        isEmptyEntry: true,
                        wePayCheckoutId: null,
                        checkNumber: null,
                        notes: null,
                        payerNotes: null,
                        wePayStatus: null,
                        groupId: null
                    };
                }
                sortedPayments.push(curPeriodPayment);
                // curPeriod goes 1-vm.maxPeriodRange
                curPeriod--;
            }
            return sortedPayments;
        };
        AssessmentHistoryController.prototype.viewWePayDetails = function (wePayCheckoutId) {
            this.appCacheService.set("hwpid", wePayCheckoutId);
            this.$location.path("/ManagePayments");
        };
        /**
         * Create a special assessment entry
         */
        AssessmentHistoryController.prototype.addSpecialAssessment = function () {
            // JS is 0 based month plus Angular uses strings so move to 1-based integer for the server
            this.createSpecialAssessment = parseInt(this.createSpecialAssessment) + 1;
            // Create the special assessment
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/PaymentHistory/SpecialAssessment", this.createSpecialAssessment).then(function () {
                innerThis.isLoading = false;
                innerThis.shouldShowCreateSpecialAssessment = false;
                innerThis.retrievePaymentHistory();
            }, function (httpResponse) {
                innerThis.isLoading = false;
                var errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to add special assessment: " + errorMessage);
            });
        };
        /**
         * Display the modal to create special assessments
         */
        AssessmentHistoryController.prototype.showCreateSpecialAssessment = function () {
            this.shouldShowCreateSpecialAssessment = true;
            this.createSpecialAssessment = {
                year: new Date().getFullYear(),
                month: new Date().getMonth().toString(),
                notes: "",
                amount: null
            };
        };
        /**
         * Go back a few pay periods
         */
        AssessmentHistoryController.prototype.browsePast = function () {
            this.startPeriodValue = this.startPeriodValue - 6;
            while (this.startPeriodValue < 1) {
                this.startPeriodValue = this.maxPeriodRange + this.startPeriodValue;
                --this.startYearValue;
            }
            this.displayPaymentsForRange(this.startYearValue, this.startPeriodValue);
        };
        /**
         * Go ahead a few pay periods
         */
        AssessmentHistoryController.prototype.browseFuture = function () {
            this.startPeriodValue = this.startPeriodValue + 6;
            while (this.startPeriodValue > this.maxPeriodRange) {
                this.startPeriodValue -= this.maxPeriodRange;
                ++this.startYearValue;
            }
            this.displayPaymentsForRange(this.startYearValue, this.startPeriodValue);
        };
        /**
         * Populate the display for a date range
         */
        AssessmentHistoryController.prototype.displayPaymentsForRange = function (startYear, startPeriod) {
            var _this = this;
            this.startYearValue = startYear;
            this.startPeriodValue = startPeriod;
            this.visiblePeriodNames = [];
            var year = this.startYearValue;
            var currentPeriod = this.startPeriodValue;
            for (var columnIndex = 0; columnIndex < this.NumPeriodsVisible; ++columnIndex) {
                if (currentPeriod < 1) {
                    currentPeriod = this.maxPeriodRange;
                    --year;
                }
                var headerName = this.shortPeriodNames[currentPeriod - 1];
                if (currentPeriod === 1 || currentPeriod === this.maxPeriodRange)
                    headerName += " " + year;
                if (AppConfig.appShortName === "pta")
                    headerName = year + " - " + (year + 1);
                this.visiblePeriodNames.push({
                    name: headerName,
                    periodIndex: currentPeriod,
                    arrayIndex: columnIndex,
                    year: year
                });
                --currentPeriod;
            }
            // Make sure every visible period has an valid entry object
            if (AppConfig.appShortName === "pta")
                _.each(this.payers, function (payer) { return payer.displayPayments = _this.fillInEmptyPaymentsForMember(payer); });
            else
                _.each(this.unitPayments, function (unit) { return unit.payments = _this.fillInEmptyPaymentsForUnit(unit); });
        };
        /**
         * Populate the payment grid
         */
        AssessmentHistoryController.prototype.retrievePaymentHistory = function () {
            var _this = this;
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/PaymentHistory?oldestDate=").then(function (httpResponse) {
                var paymentInfo = httpResponse.data;
                // Build the map of unit ID to unit information
                innerThis.unitPayments = {};
                _.each(paymentInfo.units, function (unit) {
                    innerThis.unitPayments[unit.unitId] = unit;
                    // Only take the first two owners for now
                    innerThis.unitPayments[unit.unitId].displayOwners = _.first(unit.owners, 2);
                    while (innerThis.unitPayments[unit.unitId].displayOwners.length < 2)
                        innerThis.unitPayments[unit.unitId].displayOwners.push({ name: "" });
                    innerThis.unitPayments[unit.unitId].payments = [];
                });
                // Add the payment information to the units
                if (AppConfig.appShortName === "pta") {
                    _.each(httpResponse.data.payers, function (payer) {
                        payer.enteredPayments = _.filter(paymentInfo.payments, function (p) { return p.payerUserId === payer.userId; });
                    });
                }
                // Add the payment information to the units
                _.each(paymentInfo.payments, function (payment) {
                    if (innerThis.unitPayments[payment.unitId])
                        innerThis.unitPayments[payment.unitId].payments.push(payment);
                });
                // Store all of the payments rather than just what is visible
                _.each(paymentInfo.units, function (unit) {
                    unit.allPayments = unit.payments;
                });
                // Sort the units by name
                var sortedUnits = [];
                for (var key in innerThis.unitPayments)
                    sortedUnits.push(innerThis.unitPayments[key]);
                innerThis.unitPayments = _.sortBy(sortedUnits, function (unit) { return unit.name; });
                innerThis.payers = _.sortBy(paymentInfo.payers, function (payer) { return payer.name; });
                innerThis.displayPaymentsForRange(innerThis.startYearValue, innerThis.startPeriodValue);
                innerThis.isLoading = false;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve payment history: " + response.data.exceptionMessage);
            });
        };
        /**
         * Get the amount paid by all units in a pay period
         */
        AssessmentHistoryController.prototype.getPaymentSumForPayPeriod = function (periodIndex) {
            var sum = 0;
            if (AppConfig.isChtnSite) {
                var unitIds = _.keys(this.unitPayments);
                for (var i = 0; i < unitIds.length; ++i) {
                    var unitId = unitIds[i];
                    var paymentInfo = this.unitPayments[unitId].payments[periodIndex];
                    if (paymentInfo && paymentInfo.isPaid)
                        sum += paymentInfo.amount;
                }
            }
            else {
                for (var i = 0; i < this.payers.length; ++i) {
                    var paymentInfo = this.payers[i].displayPayments[periodIndex];
                    if (paymentInfo && paymentInfo.isPaid)
                        sum += paymentInfo.amount;
                }
            }
            return sum;
        };
        /**
         * Occurs when the user toggles whether or not to show payment info
         */
        AssessmentHistoryController.prototype.onshowPaymentInfo = function () {
            window.localStorage[this.LocalStorageKey_ShowPaymentInfo] = this.showPaymentInfo;
        };
        /**
         * Occurs when the user clicks a date cell
         */
        AssessmentHistoryController.prototype.onUnitPaymentCellClick = function (unit, periodPayment) {
            periodPayment.unitId = unit.unitId;
            this.editPayment = {
                unit: unit,
                payment: _.clone(periodPayment),
                periodName: this.periodNames[periodPayment.period - 1],
                filteredPayers: _.filter(this.payers, function (payer) {
                    return !_.some(unit.owners, function (owner) {
                        return owner.userId === payer.userId;
                    });
                })
            };
            setTimeout(function () { $("#paid-amount-textbox").focus(); }, 10);
        };
        /**
         * Occurs when the user clicks a date cell
         */
        AssessmentHistoryController.prototype.onMemberPaymentCellClick = function (payer, periodPayment) {
            periodPayment.payerUserId = payer.userId;
            this.editPayment = {
                unit: null,
                payment: _.clone(periodPayment),
                periodName: this.periodNames[periodPayment.period - 1],
                filteredPayers: null
            };
            setTimeout(function () { $("#paid-amount-textbox").focus(); }, 10);
        };
        AssessmentHistoryController.$inject = ["$http", "$location", "SiteInfo", "appCacheService"];
        return AssessmentHistoryController;
    }());
    Ally.AssessmentHistoryController = AssessmentHistoryController;
})(Ally || (Ally = {}));
CA.angularApp.component("assessmentHistory", {
    templateUrl: "/ngApp/chtn/manager/assessment-history.html",
    controller: Ally.AssessmentHistoryController
});

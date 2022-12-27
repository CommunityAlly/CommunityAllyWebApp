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
            /// Indicates if this payment is simply a placeholder entry, i.e. doesn't have a backing entry in the DB
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
    Ally.AssessmentPayment = AssessmentPayment;
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
            this.LocalStorageKey_ShouldColorCodePayments = "AssessmentHistory_ColorCodePayment";
            this.LocalStorageKey_ShowBalanceCol = "AssessmentHistory_ShowBalanceCol";
            // The number of pay periods that are visible on the grid
            this.NumPeriodsVisible = 10;
            this.shouldShowBalanceCol = false;
            this.shouldShowCreateSpecialAssessment = false;
            this.showRowType = "unit";
            this.isForMemberGroup = false;
            this.isSavingPayment = false;
            this.shouldColorCodePayments = false;
            this.shouldShowFillInSection = false;
            this.selectedFillInPeriod = null;
            this.shouldShowNeedsAssessmentSetup = false;
            this.hasAssessments = null;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        AssessmentHistoryController.prototype.$onInit = function () {
            var _this = this;
            this.baseApiUri = this.siteInfo.publicSiteInfo.baseApiUrl;
            this.isForMemberGroup = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
            if (this.isForMemberGroup)
                this.pageTitle = "Membership Dues Payment History";
            else
                this.pageTitle = "Assessment Payment History";
            if (this.isForMemberGroup)
                this.NumPeriodsVisible = 8;
            this.authToken = window.localStorage.getItem("ApiAuthToken");
            if (this.isForMemberGroup)
                this.showRowType = "member";
            else if (AppConfig.isChtnSite)
                this.showRowType = "unit";
            else
                console.log("Unhandled app type for payment history: " + AppConfig.appShortName);
            // Example
            //var payment =
            //{
            //    paymentId: 0,
            //    year: 2014,
            //    period: 1, // 1 = January
            //    isPaid: false,
            //    amount: 1.23,
            //    paymentDate: "1/2/14",
            //    checkNumber: "123",
            //    unitId: 1
            //};
            this.showPaymentInfo = window.localStorage[this.LocalStorageKey_ShowPaymentInfo] === "true";
            this.shouldColorCodePayments = window.localStorage[this.LocalStorageKey_ShouldColorCodePayments] === "true";
            this.shouldShowBalanceCol = window.localStorage[this.LocalStorageKey_ShowBalanceCol] === "true";
            if (!this.siteInfo.privateSiteInfo.assessmentFrequency) {
                this.hasAssessments = this.siteInfo.privateSiteInfo.hasAssessments;
                this.shouldShowNeedsAssessmentSetup = true;
                return;
            }
            this.assessmentFrequency = this.siteInfo.privateSiteInfo.assessmentFrequency;
            if (this.isForMemberGroup)
                this.assessmentFrequency = AssessmentHistoryController.PeriodicPaymentFrequency_Annually;
            // Set the period name
            this.payPeriodName = "month";
            if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly)
                this.payPeriodName = "quarter";
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually)
                this.payPeriodName = "half-year";
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually)
                this.payPeriodName = "year";
            // Set the range values
            this.maxPeriodRange = 12;
            if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly)
                this.maxPeriodRange = 4;
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually)
                this.maxPeriodRange = 2;
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually)
                this.maxPeriodRange = 1;
            this.todaysPayPeriod = this.getTodaysPayPeriod();
            // Set the label values
            //const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            //const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            //const quarterNames = ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"];
            //const shortQuarterNames = ["Q1", "Q2", "Q3", "Q4"];
            //const semiannualNames = ["First Half", "Second Half"];
            //const shortSemiannualNames = ["1st Half", "2nd Half"];
            var payFrequencyInfo = FrequencyIdToInfo(this.assessmentFrequency);
            this.periodNames = GetLongPayPeriodNames(payFrequencyInfo.intervalName);
            this.shortPeriodNames = GetShortPayPeriodNames(payFrequencyInfo.intervalName);
            if (!this.periodNames) {
                this.periodNames = [""];
                this.shortPeriodNames = [""];
            }
            //if( this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly )
            //{
            //    this.periodNames = quarterNames;
            //    this.shortPeriodNames = shortQuarterNames;
            //}
            //else if( this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually )
            //{
            //    this.periodNames = semiannualNames;
            //    this.shortPeriodNames = shortSemiannualNames;
            //}
            //else if( this.assessmentFrequency === PeriodicPaymentFrequency_Annually )
            //{
            //    this.periodNames = [""];
            //    this.shortPeriodNames = [""];
            //}
            // Set the current period. We add 2 to the period so we have a buffer ahead of today's
            // date so we can show some future payments.
            this.startPeriodValue = new Date().getMonth() + 2;
            this.startYearValue = new Date().getFullYear();
            if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly) {
                this.startPeriodValue = Math.floor(new Date().getMonth() / 4) + 2;
            }
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually) {
                this.startPeriodValue = Math.floor(new Date().getMonth() / 6) + 2;
            }
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually) {
                this.startPeriodValue = 1;
                this.startYearValue = new Date().getFullYear() + 1;
            }
            // If we're past the year's number of pay periods, go to the next year
            if (this.startPeriodValue > this.maxPeriodRange) {
                this.startPeriodValue = 1;
                this.startYearValue += 1;
            }
            this.isPeriodicPaymentTrackingEnabled = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled;
            this.retrievePaymentHistory();
            window.setTimeout(function () { return _this.$http.get("/api/DocumentLink/0").then(function (response) { return _this.viewExportViewId = response.data.vid; }); }, 250);
            // Hook up Bootstrap v4 tooltips
            window.setTimeout(function () { return $('[data-toggle="tooltip"]').tooltip(); }, 1000);
        };
        AssessmentHistoryController.prototype.getTodaysPayPeriod = function () {
            // We add 1's to periods because pay periods are 1-based, but Date.getMonth() is 0-based
            var periodValue = new Date().getMonth() + 1;
            var yearValue = new Date().getFullYear();
            if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly) {
                periodValue = Math.floor(new Date().getMonth() / 4) + 1;
            }
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually) {
                periodValue = Math.floor(new Date().getMonth() / 6) + 1;
            }
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually) {
                periodValue = 1; // Years only have one pay period
                yearValue = new Date().getFullYear();
            }
            return {
                periodValue: periodValue,
                yearValue: yearValue
            };
        };
        AssessmentHistoryController.prototype.onChangePeriodicPaymentTracking = function () {
            var _this = this;
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
            this.$http.put("/api/Association/updatePeriodicPaymentTracking?isPeriodicPaymentTrackingEnabled=" + this.isPeriodicPaymentTrackingEnabled, null).then(function () {
                _this.isLoading = false;
            }, function () {
                alert("Failed to update the payment tracking");
                _this.isLoading = false;
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
                // If this pay period has not payment entry then add a filler
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
                        groupId: null,
                        paymentsInfoId: null
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
            this.$location.path("/Financials/OnlinePayments");
        };
        AssessmentHistoryController.prototype.viewOnlinePaymentDetails = function (paymentsInfoId) {
            this.appCacheService.set("onpayid", paymentsInfoId.toString());
            this.$location.path("/Financials/OnlinePayments");
        };
        /**
         * Create a special assessment entry
         */
        AssessmentHistoryController.prototype.addSpecialAssessment = function () {
            var _this = this;
            // JS is 0 based month plus Angular uses strings so move to 1-based integer for the server
            this.createSpecialAssessment = parseInt(this.createSpecialAssessment) + 1;
            // Create the special assessment
            this.isLoading = true;
            this.$http.post("/api/PaymentHistory/SpecialAssessment", this.createSpecialAssessment).then(function () {
                _this.isLoading = false;
                _this.shouldShowCreateSpecialAssessment = false;
                _this.retrievePaymentHistory();
            }, function (httpResponse) {
                _this.isLoading = false;
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
            this.startPeriodValue = startPeriod; // Pay period values start at 1, not 0
            this.visiblePeriodNames = [];
            var year = this.startYearValue;
            // Step from left to right in the output columns, going back a pay period each time
            var currentPeriod = this.startPeriodValue;
            for (var columnIndex = 0; columnIndex < this.NumPeriodsVisible; ++columnIndex) {
                // If we stepped passed the first period, go the previous year
                if (currentPeriod < 1) {
                    currentPeriod = this.maxPeriodRange;
                    --year;
                }
                var headerName = this.shortPeriodNames[currentPeriod - 1];
                if (currentPeriod === 1 || currentPeriod === this.maxPeriodRange)
                    headerName += " " + year;
                if (this.isForMemberGroup)
                    headerName = year + " - " + (year + 1);
                this.visiblePeriodNames.push({
                    name: headerName,
                    periodValue: currentPeriod,
                    arrayIndex: columnIndex,
                    year: year,
                    isTodaysPeriod: year === this.todaysPayPeriod.yearValue && currentPeriod === this.todaysPayPeriod.periodValue
                });
                --currentPeriod;
            }
            // Make sure every visible period has an valid entry object
            if (this.isForMemberGroup)
                _.each(this.payers, function (payer) { return payer.displayPayments = _this.fillInEmptyPaymentsForMember(payer); });
            else
                this.unitPayments.forEach(function (unit) { return unit.payments = _this.fillInEmptyPaymentsForUnit(unit); });
        };
        /**
         * Populate the payment grid
         */
        AssessmentHistoryController.prototype.retrievePaymentHistory = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/PaymentHistory?oldestDate=").then(function (httpResponse) {
                var paymentInfo = httpResponse.data;
                _this.shouldShowFillInSection = _this.siteInfo.userInfo.isAdmin || (paymentInfo.payments.length < 2 && paymentInfo.units.length > 3);
                // Build the map of unit ID to unit information
                _this.unitPayments = new Map();
                _.each(paymentInfo.units, function (unit) {
                    _this.unitPayments.set(unit.unitId, unit);
                    var curEntry = _this.unitPayments.get(unit.unitId);
                    // Only take the first two owners for now
                    curEntry.displayOwners = _.first(unit.owners, 2);
                    while (curEntry.displayOwners.length < 2)
                        curEntry.displayOwners.push({ name: "" });
                    curEntry.payments = [];
                });
                // Add the payment information to the members
                if (_this.isForMemberGroup && httpResponse.data.payers) {
                    _.each(httpResponse.data.payers, function (payer) {
                        payer.enteredPayments = _.filter(paymentInfo.payments, function (p) { return p.payerUserId === payer.userId; });
                    });
                }
                // Add the payment information to the units
                _.each(paymentInfo.payments, function (payment) {
                    if (_this.unitPayments.has(payment.unitId))
                        _this.unitPayments.get(payment.unitId).payments.push(payment);
                });
                // Store all of the payments rather than just what is visible
                _.each(paymentInfo.units, function (unit) {
                    // The newest payment will be at the end
                    unit.payments = _.sortBy(unit.payments, function (p) { return p.year * 100 + p.period; });
                    unit.allPayments = unit.payments;
                    if (unit.allPayments.length > 0) {
                        var mostRecentPayment = unit.allPayments[unit.allPayments.length - 1];
                        var numMissedPayments = _this.getNumMissedPayments(mostRecentPayment);
                        // If the person is ahead on payments, still show 0 rather than negative due
                        if (numMissedPayments <= 0)
                            numMissedPayments = 0;
                        unit.estBalance = numMissedPayments * unit.assessment;
                    }
                });
                // Sort the units by name
                var sortedUnits = Array.from(_this.unitPayments.values());
                _this.nameSortedUnitPayments = Ally.HtmlUtil2.smartSortStreetAddresses(sortedUnits, "name");
                _this.payers = _.sortBy(paymentInfo.payers, function (payer) { return payer.name; });
                _this.displayPaymentsForRange(_this.startYearValue, _this.startPeriodValue);
                _this.isLoading = false;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve payment history: " + response.data.exceptionMessage);
            });
        };
        AssessmentHistoryController.prototype.getNumMissedPayments = function (mostRecentPayment) {
            var todaysPayPeriod = this.getTodaysPayPeriod();
            if (mostRecentPayment.year === todaysPayPeriod.yearValue) {
                return todaysPayPeriod.periodValue - mostRecentPayment.period;
            }
            else {
                var numYearsBack = todaysPayPeriod.yearValue - mostRecentPayment.year;
                var yearsPaymentsMissed = (numYearsBack - 1) * this.maxPeriodRange;
                var periodsMissedForRecentYear = this.maxPeriodRange - mostRecentPayment.period;
                return todaysPayPeriod.periodValue + yearsPaymentsMissed + periodsMissedForRecentYear;
            }
            return 0;
        };
        /**
         * Get the amount paid by all units in a pay period
         */
        AssessmentHistoryController.prototype.getPaymentSumForPayPeriod = function (periodIndex) {
            var sum = 0;
            if (AppConfig.isChtnSite) {
                var unitIds = Array.from(this.unitPayments.keys());
                for (var i = 0; i < unitIds.length; ++i) {
                    var unitId = unitIds[i];
                    var paymentInfo = this.unitPayments.get(unitId).payments[periodIndex];
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
            window.localStorage[this.LocalStorageKey_ShouldColorCodePayments] = this.shouldColorCodePayments;
        };
        /**
         * Occurs when the user toggles whether or not to show the balance column
         */
        AssessmentHistoryController.prototype.onshowBalanceCol = function () {
            window.localStorage[this.LocalStorageKey_ShowBalanceCol] = this.shouldShowBalanceCol;
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
                    return !_.some(unit.owners, function (owner) { return owner.userId === payer.userId; });
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
        AssessmentHistoryController.prototype.onSavePayment = function () {
            var _this = this;
            var onSave = function () {
                _this.isSavingPayment = false;
                _this.editPayment = null;
                _this.retrievePaymentHistory();
            };
            var onError = function (httpResponse) {
                _this.isSavingPayment = false;
                alert(httpResponse.data.message);
                _this.editPayment = null;
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
        AssessmentHistoryController.prototype.populatePaidForPeriod = function () {
            var _this = this;
            if (!this.selectedFillInPeriod)
                return;
            var unitIds = Array.from(this.unitPayments.keys());
            this.isLoading = true;
            var numPosts = 0;
            var _loop_1 = function (i) {
                var unitPayment = this_1.unitPayments.get(unitIds[i]);
                var paymentEntry = _.find(unitPayment.payments, function (p) { return p.year === _this.selectedFillInPeriod.year && p.period === _this.selectedFillInPeriod.periodValue; });
                if (paymentEntry) {
                    if (paymentEntry.isPaid)
                        return "continue";
                }
                var postData = {
                    Year: this_1.selectedFillInPeriod.year,
                    Period: this_1.selectedFillInPeriod.periodValue,
                    IsPaid: true,
                    Amount: unitPayment.assessment || 0,
                    PaymentDate: new Date(),
                    PayerUserId: this_1.siteInfo.userInfo.userId,
                    Notes: "Auto-marking all entries for " + this_1.selectedFillInPeriod.name.trim(),
                    unitId: unitPayment.unitId
                };
                ++numPosts;
                // Poor man's async for-loop
                window.setTimeout(function () { return _this.$http.post("/api/PaymentHistory", postData); }, numPosts * 350);
            };
            var this_1 = this;
            for (var i = 0; i < unitIds.length; ++i) {
                _loop_1(i);
            }
            window.setTimeout(function () {
                _this.isLoading = false;
                _this.retrievePaymentHistory();
            }, (numPosts + 1) * 350);
        };
        AssessmentHistoryController.prototype.onExportClick = function (type) {
            var _this = this;
            // Get a new view token in case the user clicks export again
            window.setTimeout(function () { return _this.$http.get("/api/DocumentLink/0").then(function (response) { return _this.viewExportViewId = response.data.vid; }); }, 500);
            analytics.track('exportAssessment' + type);
            return true;
        };
        AssessmentHistoryController.prototype.showBulkSet = function () {
            this.shouldShowFillInSection = true;
            window.scrollTo(0, 0);
        };
        AssessmentHistoryController.$inject = ["$http", "$location", "SiteInfo", "appCacheService"];
        AssessmentHistoryController.PeriodicPaymentFrequency_Monthly = 50;
        AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly = 51;
        AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually = 52;
        AssessmentHistoryController.PeriodicPaymentFrequency_Annually = 53;
        return AssessmentHistoryController;
    }());
    Ally.AssessmentHistoryController = AssessmentHistoryController;
    var PeriodEntry = /** @class */ (function () {
        function PeriodEntry() {
        }
        return PeriodEntry;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("assessmentHistory", {
    templateUrl: "/ngApp/chtn/manager/financial/assessment-history.html",
    controller: Ally.AssessmentHistoryController
});

namespace Ally
{
    enum PeriodicPaymentFrequency
    {
        Monthly = 50, // Start at number that gives room both before and after
        Quarterly,
        Semiannually,
        Annually
    }


    class PeriodicPayment
    {
        paymentId: number;
        year: number;
        /** The 1-based period index (i.e. 1 = January), PeriodValueSpecial for special assessment entries */
        period: number;
        isPaid: boolean;
        amount: number;
        paymentDate: Date;
        payerUserId: string;
        wePayCheckoutId: number;
        checkNumber: string;
        notes: string;
        payerNotes: string;
        wePayStatus: string;
        groupId: number;
        paymentsInfoId: number | null;
        specialAssessmentId: number | null;

        /// Indicates if this payment is simply a placeholder entry, i.e. doesn't have a backing entry in the DB
        isEmptyEntry: boolean = false;
    }


    export class AssessmentPayment extends PeriodicPayment
    {
        unitId: number;
    }


    class PayerInfo
    {
        userId: string;
        name: string;

        // Not from the server
        enteredPayments: PeriodicPayment[];
        displayPayments: PeriodicPayment[];
    }


    class FullPaymentHistory
    {
        units: UnitWithOwner[];
        payments: PeriodicPayment[];
        specialAssessments: SpecialAssessmentEntry[];
        payers: PayerInfo[];
    }


    class SpecialAssessmentEntry
    {
        specialAssessmentId: number;
        groupId: number;
        createdByUserId: string;
        createdDateUtc: Date;
        assessmentDate: Date;
        dueDate: Date | null;
        assessmentName: string;
        description: string;
        amount: number | null;
        lateFeeAmount: number | null;
        amountDueJson: string;
    }


    /**
     * The controller for the page to view resident assessment payment history
     */
    export class AssessmentHistoryController implements ng.IController
    {
        static $inject = ["$http", "$location", "SiteInfo", "appCacheService"];

        LocalStorageKey_ShowPaymentInfo = "AssessmentHistory_ShowPaymentInfo";
        LocalStorageKey_ShouldColorCodePayments = "AssessmentHistory_ColorCodePayment";
        LocalStorageKey_ShowBalanceCol = "AssessmentHistory_ShowBalanceCol";

        static readonly PeriodicPaymentFrequency_Monthly = 50;
        static readonly PeriodicPaymentFrequency_Quarterly = 51;
        static readonly PeriodicPaymentFrequency_Semiannually = 52;
        static readonly PeriodicPaymentFrequency_Annually = 53;
        static readonly PeriodValueSpecial = 254;

        // The number of pay periods that are visible on the grid
        static readonly ChtnDefaultNumPeriodsVisible = 9;
        static readonly MemberDefaultNumPeriodsVisible = 8;
        numPeriodsVisible = AssessmentHistoryController.ChtnDefaultNumPeriodsVisible;

        pageTitle: string;
        authToken: string;
        showPaymentInfo: boolean;
        shouldShowBalanceCol = false;
        assessmentFrequency: PeriodicPaymentFrequency;
        payPeriodName: string;
        maxPeriodRange: number;
        periodNames: string[];
        shortPeriodNames: string[];
        startPeriodValue: number;
        startYearValue: number;
        isPeriodicPaymentTrackingEnabled: boolean;
        isLoading: boolean;
        editSpecialAssessment: SpecialAssessmentEntry;
        createSpecialAssessment: any;
        visiblePeriodEntries: PeriodEntry[];
        unitPayments: Map<number, UnitWithPayment>;
        nameSortedUnitPayments: UnitWithPayment[];
        payers: PayerInfo[];
        editPayment: EditPaymentInfo;
        showRowType: "unit" | "member" = "unit";
        isForMemberGroup: boolean = false;
        isSavingPayment: boolean = false;
        shouldColorCodePayments: boolean = false;
        shouldShowFillInSection: boolean = false;
        selectedFillInPeriod: PeriodEntry = null;
        baseApiUri: string;
        viewExportViewId: string;
        shouldShowNeedsAssessmentSetup: boolean = false;
        hasAssessments: boolean | null = null;
        todaysPayPeriod: { periodValue: number, yearValue: number };
        totalEstBalance: number;
        specialAssessments: SpecialAssessmentEntry[];


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private $location: ng.ILocationService, private siteInfo: Ally.SiteInfoService, private appCacheService: AppCacheService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit(): void
        {
            this.baseApiUri = this.siteInfo.publicSiteInfo.baseApiUrl;
            this.isForMemberGroup = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";

            if( this.isForMemberGroup )
                this.pageTitle = "Membership Dues Payment History";
            else
                this.pageTitle = "Assessment Payment History";

            // Show less columns for member groups since they're all annual, no need to see a decade
            this.numPeriodsVisible = AssessmentHistoryController.ChtnDefaultNumPeriodsVisible;
            if( this.isForMemberGroup )
                this.numPeriodsVisible = AssessmentHistoryController.MemberDefaultNumPeriodsVisible;

            if( this.shouldShowBalanceCol )
                --this.numPeriodsVisible;

            this.authToken = window.localStorage.getItem( "ApiAuthToken" );

            if( this.isForMemberGroup )
                this.showRowType = "member";
            else if( AppConfig.isChtnSite )
                this.showRowType = "unit";
            else
                console.log( "Unhandled app type for payment history: " + AppConfig.appShortName );

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

            if( !this.siteInfo.privateSiteInfo.assessmentFrequency )
            {
                this.hasAssessments = this.siteInfo.privateSiteInfo.hasAssessments;
                this.shouldShowNeedsAssessmentSetup = true;
                return;
            }
            
            this.assessmentFrequency = <PeriodicPaymentFrequency>this.siteInfo.privateSiteInfo.assessmentFrequency;
            if( this.isForMemberGroup )
                this.assessmentFrequency = AssessmentHistoryController.PeriodicPaymentFrequency_Annually;

            // Set the period name
            this.payPeriodName = "month";
            if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly )
                this.payPeriodName = "quarter";
            else if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually )
                this.payPeriodName = "half-year";
            else if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually )
                this.payPeriodName = "year";


            // Set the range values
            this.maxPeriodRange = 12;
            if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly )
                this.maxPeriodRange = 4;
            else if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually )
                this.maxPeriodRange = 2;
            else if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually )
                this.maxPeriodRange = 1;

            this.todaysPayPeriod = this.getTodaysPayPeriod();

            // Set the label values
            //const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            //const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            //const quarterNames = ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"];
            //const shortQuarterNames = ["Q1", "Q2", "Q3", "Q4"];
            //const semiannualNames = ["First Half", "Second Half"];
            //const shortSemiannualNames = ["1st Half", "2nd Half"];

            const payFrequencyInfo = FrequencyIdToInfo( this.assessmentFrequency );
            this.periodNames = GetLongPayPeriodNames( payFrequencyInfo.intervalName );
            this.shortPeriodNames = GetShortPayPeriodNames( payFrequencyInfo.intervalName );
            if( !this.periodNames )
            {
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
            if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly )
            {
                this.startPeriodValue = Math.floor( new Date().getMonth() / 4 ) + 2;
            }
            else if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually )
            {
                this.startPeriodValue = Math.floor( new Date().getMonth() / 6 ) + 2;
            }
            else if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually )
            {
                this.startPeriodValue = 1;
                this.startYearValue = new Date().getFullYear() + 1;
            }

            // If we're past the year's number of pay periods, go to the next year
            if( this.startPeriodValue > this.maxPeriodRange )
            {
                this.startPeriodValue = 1;
                this.startYearValue += 1;
            }

            this.isPeriodicPaymentTrackingEnabled = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled;

            this.retrievePaymentHistory();

            window.setTimeout( () => this.$http.get( "/api/DocumentLink/0" ).then( ( response: ng.IHttpPromiseCallbackArg<DocLinkInfo> ) => this.viewExportViewId = response.data.vid ), 250 );

            // Hook up Bootstrap v4 tooltips
            window.setTimeout( () => $( '[data-toggle="tooltip"]' ).tooltip(), 1000 );
        }


        getTodaysPayPeriod()
        {
            // We add 1's to periods because pay periods are 1-based, but Date.getMonth() is 0-based
            let periodValue = new Date().getMonth() + 1;
            let yearValue = new Date().getFullYear();

            if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly )
            {
                periodValue = Math.floor( new Date().getMonth() / 4 ) + 1;
            }
            else if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually )
            {
                periodValue = Math.floor( new Date().getMonth() / 6 ) + 1;
            }
            else if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually )
            {
                periodValue = 1; // Years only have one pay period
                yearValue = new Date().getFullYear();
            }

            return {
                periodValue,
                yearValue
            };
        }


        onChangePeriodicPaymentTracking(): void
        {
            if( this.isPeriodicPaymentTrackingEnabled === this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled )
                return;

            // If the user is enabling the tracking then make sure all units have a payment entered
            if( this.isPeriodicPaymentTrackingEnabled )
            {
                //if( Object.keys(vm.unitPayments).length !== SiteInfo.privateSiteInfo.NumUnits )
                //{
                //    vm.isPeriodicPaymentTrackingEnabled = false;
                //    alert( "You must specify this most recent payment for every unit." );
                //    return;
                //}
            }

            this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled = this.isPeriodicPaymentTrackingEnabled;

            this.isLoading = true;

            this.$http.put( "/api/Association/updatePeriodicPaymentTracking?isPeriodicPaymentTrackingEnabled=" + this.isPeriodicPaymentTrackingEnabled, null ).then( () =>
            {
                this.isLoading = false;
            }, () =>
            {
                alert( "Failed to update the payment tracking" );
                this.isLoading = false;
            } );
        }


        /**
         * Add in entries to the payments array so every period has an entry
         */
        populateVisiblePaymentsForUnit( unit: UnitWithPayment )
        {
            const defaultOwnerUserId = ( unit.owners !== null && unit.owners.length > 0 ) ? unit.owners[0].userId : null;

            const sortedPayments = [];
            for( let periodIndex = 0; periodIndex < this.visiblePeriodEntries.length; ++periodIndex )
            {
                const curPeriodEntry = this.visiblePeriodEntries[periodIndex];

                let curPeriodPayment: AssessmentPayment;
                if( curPeriodEntry.specialAssessmentId )
                    curPeriodPayment = _.find( unit.allPayments, p => p.specialAssessmentId === curPeriodEntry.specialAssessmentId );
                else
                    curPeriodPayment = _.find( unit.allPayments, ( p: any ) => p.period === curPeriodEntry.periodValue && p.year === curPeriodEntry.year );

                // If this pay period has not payment entry then add a filler
                if( curPeriodPayment === undefined || curPeriodPayment.isEmptyEntry )
                {
                    curPeriodPayment = {
                        paymentId: 0,
                        isPaid: false,
                        period: curPeriodEntry.periodValue,
                        year: curPeriodEntry.year,
                        amount: unit.assessment,
                        payerUserId: defaultOwnerUserId,
                        paymentDate: new Date(),
                        isEmptyEntry: true,
                        checkNumber: null,
                        wePayCheckoutId: null,
                        groupId: this.siteInfo.publicSiteInfo.groupId,
                        notes: null,
                        payerNotes: null,
                        paymentsInfoId: null,
                        wePayStatus: null,
                        specialAssessmentId: curPeriodEntry.specialAssessmentId,
                        unitId: unit.unitId
                    };
                }

                sortedPayments.push( curPeriodPayment );
            }

            return sortedPayments;
        }


        /**
         * Add in entries to the payments array so every period has an entry
         */
        fillInEmptyPaymentsForMember( member: PayerInfo ): PeriodicPayment[]
        {
            const sortedPayments: PeriodicPayment[] = [];
            for( let periodIndex = 0; periodIndex < this.visiblePeriodEntries.length; ++periodIndex )
            {
                const curPeriod = this.visiblePeriodEntries[periodIndex];

                let curPeriodPayment: PeriodicPayment;
                if( curPeriod.specialAssessmentId )
                    curPeriodPayment = _.find( member.enteredPayments, p => p.specialAssessmentId === curPeriod.specialAssessmentId );
                else
                    curPeriodPayment = _.find( member.enteredPayments, p => p.period === curPeriod.periodValue && p.year === curPeriod.year );

                if( curPeriodPayment === undefined || curPeriodPayment.isEmptyEntry )
                {
                    curPeriodPayment = {
                        isPaid: false,
                        paymentId: null,
                        period: curPeriod.periodValue,
                        year: curPeriod.year,
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
                        paymentsInfoId: null,
                        specialAssessmentId: null
                    };
                }

                sortedPayments.push( curPeriodPayment );
            }

            return sortedPayments;
        }


        viewWePayDetails( wePayCheckoutId: string ): void
        {
            this.appCacheService.set( "hwpid", wePayCheckoutId );
            this.$location.path( "/Financials/OnlinePayments" );
        }


        viewOnlinePaymentDetails( paymentsInfoId: number ): void
        {
            this.appCacheService.set( "onpayid", paymentsInfoId.toString() );
            this.$location.path( "/Financials/OnlinePayments" );
        }


        /**
         * Create a special assessment entry
         */
        onSaveSpecialAssessment(): void
        {
            this.isLoading = true;

            const httpMethod = this.editSpecialAssessment.specialAssessmentId ? this.$http.put : this.$http.post;

            httpMethod( "/api/PaymentHistory/SpecialAssessment", this.editSpecialAssessment ).then(
                () =>
                {
                    this.isLoading = false;
                    this.editSpecialAssessment = null;

                    this.retrievePaymentHistory();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;

                    const errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                    alert( "Failed to save special assessment: " + errorMessage );
                }
            );
        }


        /**
         * Display the modal to create special assessments
         */
        showCreateSpecialAssessment(): void
        {
            this.editSpecialAssessment = new SpecialAssessmentEntry();
            this.editSpecialAssessment.assessmentDate = new Date();
            setTimeout( () => { $( "#specialAssessmentName" ).focus(); }, 10 );
        }


        /**
         * Go back a few pay periods
         */
        public browsePast(): void
        {
            this.startPeriodValue = this.startPeriodValue - 6;

            while( this.startPeriodValue < 1 )
            {
                this.startPeriodValue = this.maxPeriodRange + this.startPeriodValue;
                --this.startYearValue;
            }

            this.displayPaymentsForRange( this.startYearValue, this.startPeriodValue );
        }


        /**
         * Go ahead a few pay periods
         */
        browseFuture(): void
        {
            this.startPeriodValue = this.startPeriodValue + 6;

            while( this.startPeriodValue > this.maxPeriodRange )
            {
                this.startPeriodValue -= this.maxPeriodRange;
                ++this.startYearValue;
            }

            this.displayPaymentsForRange( this.startYearValue, this.startPeriodValue );
        }


        /*
         * Find the first special assessment entry between two dates
         */
        getSpecialAssessmentBetweenDates( startDate: Date, endDate: Date ): SpecialAssessmentEntry[]
        {
            if( !this.specialAssessments || this.specialAssessments.length === 0 )
                return null;

            let didSwapDates = false;
            if( startDate > endDate )
            {
                const temp = endDate;
                endDate = startDate;
                startDate = temp;
                didSwapDates = true;
            }

            const entries = this.specialAssessments.filter( e => e.assessmentDate.getTime() > startDate.getTime() && e.assessmentDate.getTime() < endDate.getTime() );

            if( didSwapDates )
                entries.reverse();

            return entries;
        }


        periodToDate( periodYear: PeriodYear )
        {
            let monthIndex: number;

            if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly )
                monthIndex = periodYear.periodValue * 3;
            else if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually )
                monthIndex = periodYear.periodValue * 6;
            else if( this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually )
                monthIndex = 0;
            else
                monthIndex = periodYear.periodValue - 1;

            return new Date( periodYear.year, monthIndex, 1 );
        }


        /**
         * Populate the display for a date range
         */
        displayPaymentsForRange( startYear: number, startPeriod: number ): void
        {
            this.startYearValue = startYear;
            this.startPeriodValue = startPeriod; // Pay period values start at 1, not 0

            this.visiblePeriodEntries = [];
            
            // Step from left to right in the output columns, going back a pay period each time
            let currentPeriod = new PeriodYear( this.startPeriodValue, this.startYearValue );
            let previousPeriod: PeriodYear = null;
            for( let columnIndex = 0; columnIndex < this.numPeriodsVisible; ++columnIndex )
            {
                // If we stepped passed the first period, go the previous year
                if( currentPeriod.periodValue < 1 )
                {
                    currentPeriod.periodValue = this.maxPeriodRange;
                    --currentPeriod.year;
                }

                if( previousPeriod )
                {
                    const currentPeriodDate = this.periodToDate( currentPeriod );
                    const previousPeriodDate = this.periodToDate( previousPeriod );
                    const specialAssessments = this.getSpecialAssessmentBetweenDates( previousPeriodDate, currentPeriodDate );
                    if( specialAssessments && specialAssessments.length > 0 )
                    {
                        for( const specEntry of specialAssessments )
                        {
                            const specPeriodEntry: PeriodEntry = {
                                name: specEntry.assessmentName,
                                periodValue: AssessmentHistoryController.PeriodValueSpecial,
                                arrayIndex: columnIndex++,
                                year: specEntry.assessmentDate.getFullYear(),
                                isTodaysPeriod: false,
                                specialAssessmentId: specEntry.specialAssessmentId
                            };

                            this.visiblePeriodEntries.push( specPeriodEntry );
                        }
                    }
                }

                let headerName = this.shortPeriodNames[currentPeriod.periodValue - 1];
                if( currentPeriod.periodValue === 1 || currentPeriod.periodValue === this.maxPeriodRange )
                    headerName += " " + currentPeriod.year;

                if( this.isForMemberGroup )
                    headerName = currentPeriod.year + " - " + ( currentPeriod.year + 1 );

                const periodEntry: PeriodEntry = {
                    name: headerName,
                    periodValue: currentPeriod.periodValue,
                    arrayIndex: columnIndex,
                    year: currentPeriod.year,
                    isTodaysPeriod: currentPeriod.year === this.todaysPayPeriod.yearValue && currentPeriod.periodValue === this.todaysPayPeriod.periodValue
                };

                this.visiblePeriodEntries.push( periodEntry );

                previousPeriod = new PeriodYear( currentPeriod.periodValue, currentPeriod.year );
                --currentPeriod.periodValue;
            }

            if( this.visiblePeriodEntries.length > this.numPeriodsVisible )
                this.visiblePeriodEntries = this.visiblePeriodEntries.slice( 0, this.numPeriodsVisible );

            // Make sure every visible period has an valid entry object
            if( this.isForMemberGroup )
                _.each( this.payers, payer => payer.displayPayments = this.fillInEmptyPaymentsForMember( payer ) );
            else
                this.unitPayments.forEach( ( unit: UnitWithPayment ) => unit.displayPayments = this.populateVisiblePaymentsForUnit( unit ) );
        }


        /**
         * Populate the payment grid
         */
        retrievePaymentHistory(): void
        {
            this.isLoading = true;

            this.$http.get( "/api/PaymentHistory?oldestDate=" ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<FullPaymentHistory> ) =>
            {
                const paymentInfo = httpResponse.data;
                this.specialAssessments = httpResponse.data.specialAssessments;
                
                this.shouldShowFillInSection = this.siteInfo.userInfo.isAdmin || ( paymentInfo.payments.length < 2 && paymentInfo.units.length > 3 );

                // Build the map of unit ID to unit information
                this.unitPayments = new Map<number, UnitWithPayment>();
                _.each( paymentInfo.units, ( unit: UnitWithOwner ) =>
                {
                    this.unitPayments.set( unit.unitId, unit as UnitWithPayment );
                    const curEntry: UnitWithPayment = this.unitPayments.get( unit.unitId );

                    // Only take the first two owners for now
                    curEntry.displayOwners = _.first( unit.owners, 2 );
                    while( curEntry.displayOwners.length < 2 )
                        curEntry.displayOwners.push( { name: "" } );

                    curEntry.displayPayments = [];
                } );

                // Add the payment information to the members
                if( this.isForMemberGroup && httpResponse.data.payers )
                {
                    _.each( httpResponse.data.payers, ( payer ) =>
                    {
                        payer.enteredPayments = _.filter( paymentInfo.payments, p => p.payerUserId === payer.userId );
                    } );
                }

                // Add the payment information to the units
                _.each( paymentInfo.payments, ( payment: AssessmentPayment ) =>
                {
                    if( this.unitPayments.has(payment.unitId) )
                        this.unitPayments.get(payment.unitId).displayPayments.push( payment );
                } );

                // Store all of the payments rather than just what is visible
                _.each( paymentInfo.units, ( unit: UnitWithPayment ) =>
                {
                    // The newest payment will be at the start
                    unit.displayPayments = _.sortBy( unit.displayPayments, p => p.year * 100 + p.period );
                    unit.displayPayments.reverse();
                    
                    unit.allPayments = unit.displayPayments;

                    // Since allPayments is sorted newest first, let's grab the first payment marked as paid
                    const mostRecentPayment = unit.allPayments.find( p => p.isPaid );
                    if( mostRecentPayment )
                    {
                        let numMissedPayments = this.getNumMissedPayments( mostRecentPayment );

                        // If the person is ahead on payments, still show 0 rather than negative due
                        if( numMissedPayments <= 0 )
                            numMissedPayments = 0;

                        unit.estBalance = numMissedPayments * unit.assessment;
                    }
                    else
                        unit.estBalance = undefined;
                } );

                this.totalEstBalance = paymentInfo.units
                    .filter( ( u: UnitWithPayment ) => u.estBalance !== undefined && !isNaN( u.estBalance ) )
                    .map(( u: UnitWithPayment ) => u.estBalance || 0 )
                    .reduce( ( total, val ) => total + val, 0 );

                // Sort the units by name
                const sortedUnits: UnitWithPayment[] = Array.from( this.unitPayments.values() );
                this.nameSortedUnitPayments = HtmlUtil2.smartSortStreetAddresses( sortedUnits, "name" );

                this.payers = _.sortBy( paymentInfo.payers, payer => payer.name );

                this.displayPaymentsForRange( this.startYearValue, this.startPeriodValue );

                this.isLoading = false;

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to retrieve payment history: " + response.data.exceptionMessage );
            } );
        }


        getNumMissedPayments( mostRecentPayment: AssessmentPayment )
        {
            const todaysPayPeriod = this.getTodaysPayPeriod();

            if( mostRecentPayment.year === todaysPayPeriod.yearValue )
            {
                return todaysPayPeriod.periodValue - mostRecentPayment.period;
            }
            else
            {
                const numYearsBack = todaysPayPeriod.yearValue - mostRecentPayment.year;
                const yearsPaymentsMissed = ( numYearsBack - 1 ) * this.maxPeriodRange;
                const periodsMissedForRecentYear = this.maxPeriodRange - mostRecentPayment.period;
                return todaysPayPeriod.periodValue + yearsPaymentsMissed + periodsMissedForRecentYear;
            }

            return 0;
        }


        /**
         * Get the amount paid by all units in a pay period
         */
        getPaymentSumForPayPeriod( periodIndex: number ): number
        {
            let sum = 0;

            if( AppConfig.isChtnSite )
            {
                const unitIds = Array.from( this.unitPayments.keys() );

                for( let i = 0; i < unitIds.length; ++i )
                {
                    const unitId = unitIds[i];

                    const paymentInfo = this.unitPayments.get(unitId).displayPayments[periodIndex];
                    if( paymentInfo && paymentInfo.isPaid )
                        sum += paymentInfo.amount;
                }
            }
            else
            {
                for( let i = 0; i < this.payers.length; ++i )
                {
                    const paymentInfo = this.payers[i].displayPayments[periodIndex];
                    if( paymentInfo && paymentInfo.isPaid )
                        sum += paymentInfo.amount;
                }
            }

            return sum;
        }


        /**
         * Occurs when the user toggles whether or not to show payment info
         */
        onshowPaymentInfo(): void
        {
            window.localStorage[this.LocalStorageKey_ShowPaymentInfo] = this.showPaymentInfo;
            window.localStorage[this.LocalStorageKey_ShouldColorCodePayments] = this.shouldColorCodePayments;
        }


        /**
         * Occurs when the user toggles whether or not to show the balance column
         */
        onshowBalanceCol(): void
        {
            window.localStorage[this.LocalStorageKey_ShowBalanceCol] = this.shouldShowBalanceCol;

            // Show one less column so that we don't hang off the right
            if( this.isForMemberGroup )
                this.numPeriodsVisible = AssessmentHistoryController.MemberDefaultNumPeriodsVisible;
            else
                this.numPeriodsVisible = AssessmentHistoryController.ChtnDefaultNumPeriodsVisible;

            if( this.shouldShowBalanceCol )
                --this.numPeriodsVisible;

            this.displayPaymentsForRange( this.startYearValue, this.startPeriodValue );
        }


        /**
         * Occurs when the user clicks a date cell
         */
        onUnitPaymentCellClick( unit: UnitWithPayment, periodPayment: AssessmentPayment ): void
        {
            periodPayment.unitId = unit.unitId;

            let periodName: string = "";
            if( periodPayment.specialAssessmentId )
            {
                // Despite being on TS 4.5.5 as of this writing, the optional chaning feature causes an issue here
                const payEntry = this.specialAssessments.find( a => a.specialAssessmentId === periodPayment.specialAssessmentId );
                if( payEntry )
                    periodName = payEntry.assessmentName;
            }
            else
                periodName = this.periodNames[periodPayment.period - 1];

            this.editPayment = {
                unit: unit,
                payment: _.clone( periodPayment ), // Make a copy of the object so we can edit it without editing the grid
                periodName,
                filteredPayers: _.filter( this.payers, ( payer ) =>
                {
                    return !_.some( unit.owners, ( owner: any ) => owner.userId === payer.userId );
                } )
            };

            setTimeout( () => { $( "#paid-amount-textbox" ).focus(); }, 10 );
        }


        /**
         * Occurs when the user clicks a date cell
         */
        onMemberPaymentCellClick( payer: PayerInfo, periodPayment: PeriodicPayment ): void
        {
            periodPayment.payerUserId = payer.userId;

            this.editPayment = {
                unit: null,
                payment: _.clone( periodPayment ), // Make a copy of the object so we can edit it without editing the grid
                periodName: this.periodNames[periodPayment.period - 1],
                filteredPayers: null
            };

            setTimeout( () => { $( "#paid-amount-textbox" ).focus(); }, 10 );
        }


        onSavePayment(): void
        {
            const onSave = () =>
            {
                this.isSavingPayment = false;

                this.editPayment = null;
                this.retrievePaymentHistory();
            };

            const onError = ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isSavingPayment = false;

                alert( httpResponse.data.message );
                this.editPayment = null;
            };

            this.isSavingPayment = true;

            if( this.editPayment.payment.paymentId )
            {
                analytics.track( "editAssessmentHistoryPayment" );
                this.$http.put( "/api/PaymentHistory", this.editPayment.payment ).then( onSave, onError );
            }
            else
            {
                analytics.track( "addAssessmentHistoryPayment" );
                this.$http.post( "/api/PaymentHistory", this.editPayment.payment ).then( onSave, onError );
            }
        }


        /**
         * Mark all units as paid for a specific period
         */
        populatePaidForPeriod(): void
        {
            // This has a known issue that if there are most special assessments than columns then
            // you won't be able to view all special assessment entries
            if( !this.selectedFillInPeriod )
                return;

            const unitIds: number[] = Array.from( this.unitPayments.keys() );

            this.isLoading = true;

            let numPosts = 0;
            for( let i = 0; i < unitIds.length; ++i )
            {
                const unitPayment: UnitWithPayment = this.unitPayments.get(unitIds[i]);

                const paymentEntry = _.find( unitPayment.displayPayments, p => p.year === this.selectedFillInPeriod.year && p.period === this.selectedFillInPeriod.periodValue );
                if( paymentEntry )
                {
                    if( paymentEntry.isPaid )
                        continue;
                }

                const postData = {
                    Year: this.selectedFillInPeriod.year,
                    Period: this.selectedFillInPeriod.periodValue,
                    IsPaid: true,
                    Amount: unitPayment.assessment || 0,
                    PaymentDate: new Date(),
                    PayerUserId: this.siteInfo.userInfo.userId,
                    Notes: "Auto-marking all entries for " + this.selectedFillInPeriod.name.trim(),
                    unitId: unitPayment.unitId
                };

                ++numPosts;

                // Poor man's async for-loop
                window.setTimeout( () => this.$http.post( "/api/PaymentHistory", postData ), numPosts * 350 );
            }

            window.setTimeout( () =>
            {
                this.isLoading = false;
                this.retrievePaymentHistory();
            }, ( numPosts + 1 ) * 350 );
        }


        onExportClick( type: string )
        {
            // Get a new view token in case the user clicks export again
            window.setTimeout( () => this.$http.get( "/api/DocumentLink/0" ).then( ( response: ng.IHttpPromiseCallbackArg<DocLinkInfo> ) => this.viewExportViewId = response.data.vid ), 500 );

            analytics.track( 'exportAssessment' + type );
            return true;
        }


        showBulkSet()
        {
            this.shouldShowFillInSection = true;
            window.scrollTo( 0, 0 );
        }


        onPeriodHeaderClick( period: PeriodEntry )
        {
            if( !period.specialAssessmentId )
                return;

            this.editSpecialAssessment = this.specialAssessments.find( sa => sa.specialAssessmentId === period.specialAssessmentId );
            setTimeout( () => { $( "#specialAssessmentName" ).focus(); }, 10 );
        }


        onDeleteSpecialAssessment()
        {
            // If, somehow, we get in here with a new special assessment, just bail
            if( !this.editSpecialAssessment.specialAssessmentId )
            {
                this.editSpecialAssessment = null;
                return;
            }

            if( !confirm( "Are you sure you want to delete this special assessment entry? This will delete any associated payment entires and CANNOT BE UNDONE." ) )
                return;

            this.isLoading = true;

            this.$http.delete( "/api/PaymentHistory/SpecialAssessment/" + this.editSpecialAssessment.specialAssessmentId ).then(
                () =>
                {
                    this.isLoading = false;
                    this.editSpecialAssessment = null;

                    this.retrievePaymentHistory();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;

                    const errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                    alert( "Failed to delete special assessment entry: " + errorMessage );
                }
            );
        }
    }


    class PeriodYear
    {
        constructor( periodValue: number, year: number )
        {
            this.periodValue = periodValue;
            this.year = year;
        }

        // Pay period values start at 1, not 0
        periodValue: number;
        year: number;
    }


    class EditPaymentInfo
    {
        unit: UnitWithPayment;
        payment: AssessmentPayment | PeriodicPayment;
        periodName: string;
        filteredPayers: PayerInfo[];
    }


    class PeriodEntry
    {
        name: string;
        periodValue: number;
        arrayIndex: number;
        year: number;
        isTodaysPeriod: boolean;
        specialAssessmentId?: number;
    }
}


CA.angularApp.component( "assessmentHistory", {
    templateUrl: "/ngApp/chtn/manager/financial/assessment-history.html",
    controller: Ally.AssessmentHistoryController
} );

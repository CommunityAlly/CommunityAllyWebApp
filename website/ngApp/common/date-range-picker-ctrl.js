var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    class DateRangePickerController {
        /**
        * The constructor for the class
        */
        constructor(appCacheService, $scope, $timeout) {
            this.appCacheService = appCacheService;
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.filterPresetDateRange = "custom";
            this.lastChangeStart = null;
            this.lastChangeEnd = null;
            this.shouldSuppressCustom = false;
            this.thisYearLabel = new Date().getFullYear().toString();
            this.lastYearLabel = (new Date().getFullYear() - 1).toString();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            //console.log( "In dateRangePicker.onInit", this.startDate, this.endDate );
            // Clear the time portion
            if (this.startDate)
                this.startDate = moment(this.startDate).startOf("day").toDate();
            if (this.endDate)
                this.endDate = moment(this.endDate).startOf("day").toDate();
            if (!this.startDate && !this.endDate)
                this.selectPresetDateRange(true);
            this.$scope.$watch("$ctrl.startDate", (newValue, oldValue) => {
                if (!newValue || newValue === oldValue || this.shouldSuppressCustom)
                    return;
                this.filterPresetDateRange = "custom";
            });
            this.$scope.$watch("$ctrl.endDate", (newValue, oldValue) => {
                if (!newValue || newValue === oldValue || this.shouldSuppressCustom)
                    return;
                this.filterPresetDateRange = "custom";
            });
        }
        selectPresetDateRange(suppressRefresh = false) {
            //console.log( "selectPresetDateRange", this.filterPresetDateRange );
            if (this.filterPresetDateRange === "last30days") {
                this.startDate = moment().subtract(30, 'days').toDate();
                this.endDate = moment().toDate();
            }
            else if (this.filterPresetDateRange === "thisMonth") {
                this.startDate = moment().startOf('month').toDate();
                this.endDate = moment().endOf('month').toDate();
            }
            else if (this.filterPresetDateRange === "lastMonth") {
                const lastMonth = moment().subtract(1, 'months');
                this.startDate = lastMonth.startOf('month').toDate();
                this.endDate = lastMonth.endOf('month').toDate();
            }
            else if (this.filterPresetDateRange === "thisYear") {
                this.startDate = moment().startOf('year').toDate();
                this.endDate = moment().endOf('year').toDate();
            }
            else if (this.filterPresetDateRange === "lastYear") {
                const lastYear = moment().subtract(1, 'years');
                this.startDate = lastYear.startOf('year').toDate();
                this.endDate = lastYear.endOf('year').toDate();
            }
            else if (this.filterPresetDateRange === "oneYear") {
                this.startDate = moment().subtract(1, 'years').toDate();
                this.endDate = moment().toDate();
            }
            // Remove the time portion
            this.startDate = moment(this.startDate).startOf("day").toDate();
            this.endDate = moment(this.endDate).startOf("day").toDate();
            // To prevent the dumb $watch from clearing our preselect label
            this.shouldSuppressCustom = true;
            window.setTimeout(() => this.shouldSuppressCustom = false, 25);
            if (!suppressRefresh && this.onChange)
                window.setTimeout(() => this.onChange(), 50); // Delay a bit to let Angular's digests run on the bound dates
        }
        onInternalChange(suppressChangeEvent = false) {
            //console.log( "In dateRangePicker.onInternalChange", fieldName, this.startDate, this.endDate );
            // Only call the change function if both strings are valid dates
            if (typeof this.startDate === "string") {
                if (this.startDate.length !== 10)
                    return;
                this.startDate = moment(this.startDate, "MM-DD-YYYY").toDate();
            }
            if (typeof this.endDate === "string") {
                if (this.endDate.length !== 10)
                    return;
                this.endDate = moment(this.endDate, "MM-DD-YYYY").toDate();
            }
            const didChangeOccur = !this.lastChangeStart
                || !this.lastChangeEnd
                || this.startDate.getTime() !== this.lastChangeStart.getTime()
                || this.endDate.getTime() !== this.lastChangeEnd.getTime();
            if (didChangeOccur && !suppressChangeEvent) {
                // Delay just a touch to let the model update
                this.$timeout(() => {
                    //console.log( "Call dateRangePicker.onChange", this.startDate.getTime(), this.lastChangeStart && this.lastChangeStart.getTime() || null, this.endDate.getTime(), this.lastChangeEnd && this.lastChangeEnd.getTime() || null );
                    if (this.onChange)
                        this.onChange();
                    this.lastChangeStart = this.startDate;
                    this.lastChangeEnd = this.endDate;
                }, 10);
            }
        }
    }
    DateRangePickerController.$inject = ["appCacheService", "$scope", "$timeout"];
    Ally.DateRangePickerController = DateRangePickerController;
})(Ally || (Ally = {}));
CA.angularApp.component("dateRangePicker", {
    bindings: {
        startDate: "=",
        endDate: "=",
        onChange: "&"
    },
    templateUrl: "/ngApp/common/date-range-picker.html",
    controller: Ally.DateRangePickerController
});

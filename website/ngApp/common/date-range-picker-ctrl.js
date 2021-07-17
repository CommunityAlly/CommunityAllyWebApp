var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    var DateRangePickerController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function DateRangePickerController(appCacheService, $scope, $timeout) {
            this.appCacheService = appCacheService;
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.filterPresetDateRange = "last30days";
            this.shouldSuppressCustom = false;
            this.thisYearLabel = new Date().getFullYear().toString();
            this.lastYearLabel = (new Date().getFullYear() - 1).toString();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        DateRangePickerController.prototype.$onInit = function () {
            var _this = this;
            this.selectPresetDateRange(true);
            this.$scope.$watch("$ctrl.startDate", function (newValue, oldValue) {
                if (!newValue || newValue === oldValue || _this.shouldSuppressCustom)
                    return;
                _this.filterPresetDateRange = "custom";
            });
            this.$scope.$watch("$ctrl.endDate", function (newValue, oldValue) {
                if (!newValue || newValue === oldValue || _this.shouldSuppressCustom)
                    return;
                _this.filterPresetDateRange = "custom";
            });
        };
        DateRangePickerController.prototype.selectPresetDateRange = function (suppressRefresh) {
            var _this = this;
            if (suppressRefresh === void 0) { suppressRefresh = false; }
            if (this.filterPresetDateRange === "last30days") {
                this.startDate = moment().subtract(30, 'days').toDate();
                this.endDate = moment().toDate();
            }
            else if (this.filterPresetDateRange === "thisMonth") {
                this.startDate = moment().startOf('month').toDate();
                this.endDate = moment().endOf('month').toDate();
            }
            else if (this.filterPresetDateRange === "lastMonth") {
                var lastMonth = moment().subtract(1, 'months');
                this.startDate = lastMonth.startOf('month').toDate();
                this.endDate = lastMonth.endOf('month').toDate();
            }
            else if (this.filterPresetDateRange === "thisYear") {
                this.startDate = moment().startOf('year').toDate();
                this.endDate = moment().endOf('year').toDate();
            }
            else if (this.filterPresetDateRange === "lastYear") {
                var lastYear = moment().subtract(1, 'years');
                this.startDate = lastYear.startOf('year').toDate();
                this.endDate = lastYear.endOf('year').toDate();
            }
            else if (this.filterPresetDateRange === "oneYear") {
                this.startDate = moment().subtract(1, 'years').toDate();
                this.endDate = moment().toDate();
            }
            // To prevent the dumb $watch from clearing our preselect label
            this.shouldSuppressCustom = true;
            window.setTimeout(function () { return _this.shouldSuppressCustom = false; }, 25);
            if (!suppressRefresh && this.onChange)
                window.setTimeout(function () { return _this.onChange(); }, 50); // Delay a bit to let Angular's digests run on the bound dates
        };
        DateRangePickerController.prototype.onInternalChange = function () {
            var _this = this;
            // Only call the change functin if both strings are valid dates
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
            // Delay just a touch to let the model update
            this.$timeout(function () {
                if (_this.onChange)
                    _this.onChange();
            }, 10);
        };
        DateRangePickerController.$inject = ["appCacheService", "$scope", "$timeout"];
        return DateRangePickerController;
    }());
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

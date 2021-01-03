var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    var DateRangePickerController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function DateRangePickerController(appCacheService, $scope) {
            this.appCacheService = appCacheService;
            this.$scope = $scope;
            this.filterPresetDateRange = "thisMonth";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        DateRangePickerController.prototype.$onInit = function () {
            var _this = this;
            this.selectPresetDateRange(true);
            this.$scope.$watch("startDate", function () { return _this.filterPresetDateRange = "custom"; });
            this.$scope.$watch("endDate", function () { return _this.filterPresetDateRange = "custom"; });
        };
        DateRangePickerController.prototype.selectPresetDateRange = function (suppressRefresh) {
            var _this = this;
            if (suppressRefresh === void 0) { suppressRefresh = false; }
            if (this.filterPresetDateRange === "thisMonth") {
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
            if (!suppressRefresh && this.onChange)
                window.setTimeout(function () { return _this.onChange(); }, 50); // Delay a bit to let Angular's digests run on the bound dates
        };
        DateRangePickerController.$inject = ["appCacheService", "$scope"];
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

var Ally;
(function (Ally) {
    var ActivityLogEntry = /** @class */ (function () {
        function ActivityLogEntry() {
        }
        return ActivityLogEntry;
    }());
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    var ViewActivityLogController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ViewActivityLogController($http) {
            this.$http = $http;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ViewActivityLogController.prototype.$onInit = function () {
            // Initialize the UI
            this.retrieveEntries();
        };
        /**
         * Load the activity log data
         */
        ViewActivityLogController.prototype.retrieveEntries = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/ActivityLog").then(function (logResponse) {
                innerThis.isLoading = false;
                innerThis.logEntries = logResponse.data;
                // The date comes down as a string so let's convert it to a Date object for the local time zone
                _.each(innerThis.logEntries, function (e) { return e.postDate = moment(e.postDate).toDate(); });
            }, function (errorResponse) {
                innerThis.isLoading = false;
                alert("Failed to load activity log: " + errorResponse.data.exceptionMessage);
            });
        };
        ViewActivityLogController.$inject = ["$http"];
        return ViewActivityLogController;
    }());
    Ally.ViewActivityLogController = ViewActivityLogController;
})(Ally || (Ally = {}));
CA.angularApp.component("viewActivityLog", {
    templateUrl: "/ngApp/admin/view-activity-log.html",
    controller: Ally.ViewActivityLogController
});

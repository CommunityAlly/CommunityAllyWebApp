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
            this.shouldHideLoginAndEmailMessages = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ViewActivityLogController.prototype.$onInit = function () {
            this.shouldHideLoginAndEmailMessages = window.localStorage["activityLog_hideLoginAndEmailMessages"] === "true";
            // Initialize the UI
            this.retrieveEntries();
        };
        /**
         * Occurs when the users toggles the login/email filter checkbox
         */
        ViewActivityLogController.prototype.onHideLoginAndEmailMessagesChange = function () {
            window.localStorage["activityLog_hideLoginAndEmailMessages"] = this.shouldHideLoginAndEmailMessages;
            this.filterMessages();
        };
        /**
         * Load the activity log data
         */
        ViewActivityLogController.prototype.retrieveEntries = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/ActivityLog").then(function (logResponse) {
                _this.isLoading = false;
                _this.allLogEntries = logResponse.data;
                // The date comes down as a string so let's convert it to a Date object for the local time zone
                _.each(_this.allLogEntries, function (e) { return e.postDate = moment(e.postDate).toDate(); });
                _this.filterMessages();
            }, function (errorResponse) {
                _this.isLoading = false;
                alert("Failed to load activity log: " + errorResponse.data.exceptionMessage);
            });
        };
        /**
         * Update the visible messages based on filter criteria
         */
        ViewActivityLogController.prototype.filterMessages = function () {
            if (this.shouldHideLoginAndEmailMessages)
                this.filteredLogEntries = _.filter(this.allLogEntries, function (e) { return e.activityMessage !== "Logged in" && e.activityMessage.indexOf("Group email sent") !== 0; });
            else
                this.filteredLogEntries = this.allLogEntries;
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

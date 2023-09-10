var Ally;
(function (Ally) {
    class ActivityLogEntry {
    }
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    class ViewActivityLogController {
        /**
        * The constructor for the class
        */
        constructor($http) {
            this.$http = $http;
            this.isLoading = false;
            this.shouldHideLoginAndEmailMessages = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.shouldHideLoginAndEmailMessages = window.localStorage["activityLog_hideLoginAndEmailMessages"] === "true";
            // Initialize the UI
            this.retrieveEntries();
        }
        /**
         * Occurs when the users toggles the login/email filter checkbox
         */
        onHideLoginAndEmailMessagesChange() {
            window.localStorage["activityLog_hideLoginAndEmailMessages"] = this.shouldHideLoginAndEmailMessages;
            this.filterMessages();
        }
        /**
         * Load the activity log data
         */
        retrieveEntries() {
            this.isLoading = true;
            this.$http.get("/api/ActivityLog").then((logResponse) => {
                this.isLoading = false;
                this.allLogEntries = logResponse.data;
                // The date comes down as a string so let's convert it to a Date object for the local time zone
                _.each(this.allLogEntries, (e) => e.postDate = moment(e.postDate).toDate());
                this.filterMessages();
            }, (errorResponse) => {
                this.isLoading = false;
                alert("Failed to load activity log: " + errorResponse.data.exceptionMessage);
            });
        }
        /**
         * Update the visible messages based on filter criteria
         */
        filterMessages() {
            if (this.shouldHideLoginAndEmailMessages)
                this.filteredLogEntries = _.filter(this.allLogEntries, e => e.activityMessage !== "Logged in" && e.activityMessage.indexOf("Group email sent") !== 0);
            else
                this.filteredLogEntries = this.allLogEntries;
        }
    }
    ViewActivityLogController.$inject = ["$http"];
    Ally.ViewActivityLogController = ViewActivityLogController;
})(Ally || (Ally = {}));
CA.angularApp.component("viewActivityLog", {
    templateUrl: "/ngApp/admin/view-activity-log.html",
    controller: Ally.ViewActivityLogController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets members see work todo
     */
    class MaintenanceWidgetController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.upcomingWork = [];
            this.recentProjects = [];
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.loadProjects();
        }
        /**
        * Retrieve the maintenance projects from the server
        */
        loadProjects() {
            this.isLoading = true;
            return this.$http.get("/api/Maintenance/Projects").then((response) => {
                this.isLoading = false;
                this.recentProjects = _.take(response.data, 3);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve projects: " + response.data.exceptionMessage);
            });
        }
    }
    MaintenanceWidgetController.$inject = ["$http", "$rootScope", "SiteInfo"];
    Ally.MaintenanceWidgetController = MaintenanceWidgetController;
})(Ally || (Ally = {}));
CA.angularApp.component("maintenanceWidget", {
    templateUrl: "/ngApp/common/maintenance-widget.html",
    controller: Ally.MaintenanceWidgetController
});

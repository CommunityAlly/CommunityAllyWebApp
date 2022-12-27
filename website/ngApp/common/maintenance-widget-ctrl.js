var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets members see work todo
     */
    var MaintenanceWidgetController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function MaintenanceWidgetController($http, $rootScope, siteInfo) {
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
        MaintenanceWidgetController.prototype.$onInit = function () {
            this.loadProjects();
        };
        /**
        * Retrieve the maintenance projects from the server
        */
        MaintenanceWidgetController.prototype.loadProjects = function () {
            var _this = this;
            this.isLoading = true;
            return this.$http.get("/api/Maintenance/Projects").then(function (response) {
                _this.isLoading = false;
                _this.recentProjects = _.take(response.data, 3);
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve projects: " + response.data.exceptionMessage);
            });
        };
        MaintenanceWidgetController.$inject = ["$http", "$rootScope", "SiteInfo"];
        return MaintenanceWidgetController;
    }());
    Ally.MaintenanceWidgetController = MaintenanceWidgetController;
})(Ally || (Ally = {}));
CA.angularApp.component("maintenanceWidget", {
    templateUrl: "/ngApp/common/maintenance-widget.html",
    controller: Ally.MaintenanceWidgetController
});

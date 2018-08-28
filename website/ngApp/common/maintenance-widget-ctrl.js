var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets members send e-mails to the group
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
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        MaintenanceWidgetController.prototype.$onInit = function () {
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

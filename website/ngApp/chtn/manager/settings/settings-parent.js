var Ally;
(function (Ally) {
    /**
     * The controller for the settings parent view
     */
    var SettingsParentController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function SettingsParentController($http, siteInfo, $routeParams) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$routeParams = $routeParams;
            this.shouldShowPremiumPlanSection = true;
            this.selectedView = this.$routeParams.viewName || "SiteSettings";
            this.shouldShowPremiumPlanSection = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            if (!this.shouldShowPremiumPlanSection)
                this.selectedView = "SiteSettings";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        SettingsParentController.prototype.$onInit = function () {
        };
        SettingsParentController.$inject = ["$http", "SiteInfo", "$routeParams"];
        return SettingsParentController;
    }());
    Ally.SettingsParentController = SettingsParentController;
})(Ally || (Ally = {}));
CA.angularApp.component("settingsParent", {
    templateUrl: "/ngApp/chtn/manager/settings/settings-parent.html",
    controller: Ally.SettingsParentController
});

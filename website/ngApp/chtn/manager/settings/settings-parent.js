var Ally;
(function (Ally) {
    /**
     * The controller for the settings parent view
     */
    class SettingsParentController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, $routeParams) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$routeParams = $routeParams;
            this.shouldShowPremiumPlanSection = true;
            this.selectedView = this.$routeParams.viewName || "SiteSettings";
            this.shouldShowPremiumPlanSection = AppConfig.appShortName === CondoAllyAppConfig.appShortName
                || AppConfig.appShortName === HOAAppConfig.appShortName
                || AppConfig.appShortName === BlockClubAppConfig.appShortName;
            if (!this.shouldShowPremiumPlanSection && this.selectedView === "PremiumPlan")
                this.selectedView = "SiteSettings";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
        }
    }
    SettingsParentController.$inject = ["$http", "SiteInfo", "$routeParams"];
    Ally.SettingsParentController = SettingsParentController;
})(Ally || (Ally = {}));
CA.angularApp.component("settingsParent", {
    templateUrl: "/ngApp/chtn/manager/settings/settings-parent.html",
    controller: Ally.SettingsParentController
});

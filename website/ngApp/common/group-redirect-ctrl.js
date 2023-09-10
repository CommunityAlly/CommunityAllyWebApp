var Ally;
(function (Ally) {
    /**
     * The controller for the page that redirects to another group from Condo Ally
     */
    class GroupRedirectController {
        /**
         * The constructor for the class
         */
        constructor($routeParams) {
            this.$routeParams = $routeParams;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            var lowerAppName = (this.$routeParams.appName || "").toLowerCase();
            var appConfigs = [CondoAllyAppConfig, HomeAppConfig, HOAAppConfig, NeighborhoodAppConfig, BlockClubAppConfig];
            let domainName = null;
            for (let i = 0; i < appConfigs.length; ++i) {
                if (appConfigs[i].appShortName.toLowerCase() === lowerAppName) {
                    domainName = appConfigs[i].baseTld;
                    break;
                }
            }
            if (!domainName)
                domainName = "condoally.com";
            domainName = "myhoaally.org";
            var redirectUrl = `https://${this.$routeParams.shortName}.${domainName}/`;
            window.location.href = redirectUrl;
        }
    }
    GroupRedirectController.$inject = ["$routeParams"];
    Ally.GroupRedirectController = GroupRedirectController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupRedirect", {
    templateUrl: "/ngApp/common/group-redirect.html",
    controller: Ally.GroupRedirectController
});

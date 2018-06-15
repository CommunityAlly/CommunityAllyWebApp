var Ally;
(function (Ally) {
    /**
     * The controller for the page that redirects to another group from Condo Ally
     */
    var GroupRedirectController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupRedirectController($routeParams) {
            this.$routeParams = $routeParams;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupRedirectController.prototype.$onInit = function () {
            var lowerAppName = (this.$routeParams.appName || "").toLowerCase();
            var appConfigs = [CondoAllyAppConfig, HomeAppConfig, HOAAppConfig, NeighborhoodAppConfig, BlockClubAppConfig];
            var domainName = null;
            for (var i = 0; i < appConfigs.length; ++i) {
                if (appConfigs[i].appShortName.toLowerCase() === lowerAppName) {
                    domainName = appConfigs[i].baseTld;
                    break;
                }
            }
            if (!domainName)
                domainName = "condoally.com";
            domainName = "myhoaally.org";
            var redirectUrl = "https://" + this.$routeParams.shortName + "." + domainName + "/";
            window.location.href = redirectUrl;
        };
        GroupRedirectController.$inject = ["$routeParams"];
        return GroupRedirectController;
    }());
    Ally.GroupRedirectController = GroupRedirectController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupRedirect", {
    templateUrl: "/ngApp/common/group-redirect.html",
    controller: Ally.GroupRedirectController
});

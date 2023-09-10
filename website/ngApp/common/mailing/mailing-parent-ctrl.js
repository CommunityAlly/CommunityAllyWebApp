var Ally;
(function (Ally) {
    /**
     * The controller for the mailing parent view
     */
    class MailingParentController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, $routeParams, $cacheFactory, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$routeParams = $routeParams;
            this.$cacheFactory = $cacheFactory;
            this.$rootScope = $rootScope;
            this.selectedView = null;
            this.selectedView = this.$routeParams.viewName || "Invoice";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
        }
    }
    MailingParentController.$inject = ["$http", "SiteInfo", "$routeParams", "$cacheFactory", "$rootScope"];
    Ally.MailingParentController = MailingParentController;
})(Ally || (Ally = {}));
CA.angularApp.component("mailingParent", {
    templateUrl: "/ngApp/common/mailing/mailing-parent.html",
    controller: Ally.MailingParentController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the financial parent view
     */
    var FinancialParentController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function FinancialParentController($http, siteInfo, $routeParams, $cacheFactory, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$routeParams = $routeParams;
            this.$cacheFactory = $cacheFactory;
            this.$rootScope = $rootScope;
            this.initialView = "Home";
            this.selectedView = null;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        FinancialParentController.prototype.$onInit = function () {
            if (HtmlUtil.isValidString(this.$routeParams.viewName))
                this.selectedView = this.$routeParams.viewName;
            else
                this.selectedView = "OnlinePayments";
        };
        FinancialParentController.$inject = ["$http", "SiteInfo", "$routeParams", "$cacheFactory", "$rootScope"];
        return FinancialParentController;
    }());
    Ally.FinancialParentController = FinancialParentController;
})(Ally || (Ally = {}));
CA.angularApp.component("financialParent", {
    templateUrl: "/ngApp/chtn/manager/financial/financial-parent.html",
    controller: Ally.FinancialParentController
});

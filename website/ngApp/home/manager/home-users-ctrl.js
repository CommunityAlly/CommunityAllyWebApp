var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets members send emails to the group
     */
    var HomeUsersController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HomeUsersController($http, $rootScope, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.isAdmin = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        HomeUsersController.prototype.$onInit = function () {
            // Placeholder
        };
        HomeUsersController.$inject = ["$http", "$rootScope", "SiteInfo"];
        return HomeUsersController;
    }());
    Ally.HomeUsersController = HomeUsersController;
})(Ally || (Ally = {}));
CA.angularApp.component("homeUsers", {
    templateUrl: "/ngApp/home/manager/home-users.html",
    controller: Ally.HomeUsersController
});

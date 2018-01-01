/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    var CommitteeHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function CommitteeHomeController($http, $rootScope, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        CommitteeHomeController.prototype.$onInit = function () {
        };
        CommitteeHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$cacheFactory"];
        return CommitteeHomeController;
    }());
    Ally.CommitteeHomeController = CommitteeHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeHome", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/committee/committee-home.html",
    controller: Ally.CommitteeHomeController
});

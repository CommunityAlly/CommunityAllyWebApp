/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the HOA Ally home page
     */
    var HoaHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HoaHomeController($http, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.isSiteManager = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        HoaHomeController.prototype.$onInit = function () {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
        };
        HoaHomeController.$inject = ["$http", "SiteInfo", "$cacheFactory"];
        return HoaHomeController;
    }());
    Ally.HoaHomeController = HoaHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("hoaHome", {
    templateUrl: "/ngApp/hoa/member/Home.html",
    controller: Ally.HoaHomeController
});

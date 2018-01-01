/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the HOA info wrapper page
     */
    var HoaInfoController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HoaInfoController($http, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.isSiteManager = false;
            this.hideDocuments = false;
            this.selectedView = "docs";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        HoaInfoController.prototype.$onInit = function () {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.hideDocuments = this.siteInfo.userInfo.isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            if (this.hideDocuments)
                this.selectedView = "info";
            else
                this.selectedView = "docs";
        };
        HoaInfoController.$inject = ["$http", "SiteInfo", "$cacheFactory"];
        return HoaInfoController;
    }());
    Ally.HoaInfoController = HoaInfoController;
})(Ally || (Ally = {}));
CA.angularApp.component("hoaInfo", {
    templateUrl: "/ngApp/hoa/member/HoaInfo.html",
    controller: Ally.HoaInfoController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Services/html-util.ts" />



namespace Ally
{
    /**
     * The controller for the HOA Ally home page
     */
    export class HoaHomeController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$cacheFactory"];

        isSiteManager = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: SiteInfoService, private $cacheFactory: ng.ICacheFactoryService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
        }
    }
}


CA.angularApp.component( "hoaHome", {
    templateUrl: "/ngApp/hoa/member/Home.html",
    controller: Ally.HoaHomeController
});
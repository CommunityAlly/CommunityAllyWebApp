/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Services/html-util.ts" />



namespace Ally
{
    /**
     * The controller for the HOA info wrapper page
     */
    export class HoaInfoController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$cacheFactory"];

        isSiteManager = false;
        hideDocuments = false;
        selectedView = "docs";


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
            this.hideDocuments = this.siteInfo.userInfo.isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;

            if( this.hideDocuments )
                this.selectedView = "info";
            else
                this.selectedView = "docs";
        }
    }
}


CA.angularApp.component( "hoaInfo", {
    templateUrl: "/ngApp/hoa/member/HoaInfo.html",
    controller: Ally.HoaInfoController
});
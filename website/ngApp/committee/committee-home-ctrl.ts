/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />


namespace Ally
{
    /**
     * The controller for the committee home page
     */
    export class CommitteeHomeController implements ng.IController
    {
        static $inject = ["$http", "$rootScope", "SiteInfo", "$cacheFactory"];

        committee: Ally.Committee;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private $rootScope: ng.IRootScopeService, private siteInfo: Ally.SiteInfoService, private $cacheFactory: ng.ICacheFactoryService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
        }
    }
}


CA.angularApp.component( "committeeHome", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/committee/committee-home.html",
    controller: Ally.CommitteeHomeController
} );
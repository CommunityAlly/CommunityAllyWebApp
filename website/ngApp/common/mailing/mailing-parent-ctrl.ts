namespace Ally
{
    interface IMailingParentRouteParams extends ng.route.IRouteParamsService
    {
        viewName: string;
    }


    /**
     * The controller for the mailing parent view
     */
    export class MailingParentController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$routeParams", "$cacheFactory", "$rootScope"];
        selectedView: string = null;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $routeParams: IMailingParentRouteParams, private $cacheFactory: ng.ICacheFactoryService, private $rootScope: ng.IRootScopeService )
        {
            this.selectedView = this.$routeParams.viewName || "Invoice";
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
        }
    }
}


CA.angularApp.component( "mailingParent", {
    templateUrl: "/ngApp/common/mailing/mailing-parent.html",
    controller: Ally.MailingParentController
} );
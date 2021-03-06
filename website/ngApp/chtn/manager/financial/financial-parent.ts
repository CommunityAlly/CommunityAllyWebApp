﻿namespace Ally
{
    interface IFinancialParentRouteParams extends ng.route.IRouteParamsService
    {
        viewName: string;
    }


    /**
     * The controller for the financial parent view
     */
    export class FinancialParentController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$routeParams", "$cacheFactory", "$rootScope"];

        initialView: string;
        selectedView: string = null;
        isLoading: boolean = false;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $routeParams: IFinancialParentRouteParams, private $cacheFactory: ng.ICacheFactoryService, private $rootScope: ng.IRootScopeService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            if( HtmlUtil.isValidString( this.$routeParams.viewName ) )
                this.selectedView = this.$routeParams.viewName;
            else
                this.selectedView = "OnlinePayments";
        }
    }
}


CA.angularApp.component( "financialParent", {
    templateUrl: "/ngApp/chtn/manager/financial/financial-parent.html",
    controller: Ally.FinancialParentController
} );
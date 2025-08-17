namespace Ally
{
    interface IParentPageRouteParams extends ng.route.IRouteParamsService
    {
        viewName: string;
    }


    /**
     * The controller for the settings parent view
     */
    export class SettingsParentController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$routeParams"];

        selectedView: string;// | "SiteSettings" | "PremiumPlan" | "SiteDesignSettings";
        shouldShowPremiumPlanSection = true;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $routeParams: IParentPageRouteParams )
        {
            this.selectedView = this.$routeParams.viewName || "SiteSettings";

            this.shouldShowPremiumPlanSection = AppConfig.appShortName === CondoAllyAppConfig.appShortName
                || AppConfig.appShortName === HOAAppConfig.appShortName
                || AppConfig.appShortName === BlockClubAppConfig.appShortName;

            if( !this.shouldShowPremiumPlanSection && this.selectedView === "PremiumPlan" )
                this.selectedView = "SiteSettings";
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
        }
    }
}


CA.angularApp.component( "settingsParent", {
    templateUrl: "/ngApp/chtn/manager/settings/settings-parent.html",
    controller: Ally.SettingsParentController
} );
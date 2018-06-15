declare var CondoAllyAppConfig: Ally.IAllyAppConfig;
declare var HomeAppConfig: Ally.IAllyAppConfig;
declare var HOAAppConfig: Ally.IAllyAppConfig;
declare var NeighborhoodAppConfig: Ally.IAllyAppConfig;
declare var BlockClubAppConfig: Ally.IAllyAppConfig;

namespace Ally
{
    export interface IAllyAppConfig
    {
        appShortName: string;
        appName: string;
        baseTld: string;
    }

    interface IGroupRedirectRouteParams extends ng.route.IRouteParamsService
    {
        appName: string;
        shortName: string;
    }


    /**
     * The controller for the page that redirects to another group from Condo Ally
     */
    export class GroupRedirectController implements ng.IController
    {
        static $inject = ["$routeParams"];


        /**
         * The constructor for the class
         */
        constructor( private $routeParams: IGroupRedirectRouteParams )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            var lowerAppName = ( this.$routeParams.appName || "" ).toLowerCase();

            var appConfigs = [CondoAllyAppConfig, HomeAppConfig, HOAAppConfig, NeighborhoodAppConfig, BlockClubAppConfig];

            let domainName:string = null;
            for( let i = 0; i < appConfigs.length; ++i )
            {
                if( appConfigs[i].appShortName.toLowerCase() === lowerAppName )
                {
                    domainName = appConfigs[i].baseTld;
                    break;
                }
            }

            if( !domainName )
                domainName = "condoally.com";

            domainName = "myhoaally.org";
            var redirectUrl = `https://${this.$routeParams.shortName}.${domainName}/`;

            window.location.href = redirectUrl;
        }
    }
}


CA.angularApp.component( "groupRedirect", {
    templateUrl: "/ngApp/common/group-redirect.html",
    controller: Ally.GroupRedirectController
} );
namespace Ally
{
    /**
     * The controller for viewing active E-form instances for the logged-in user or creating a new
     * one
     */
    export class EformWidgetController implements ng.IController
    {
        static $inject = ["$http", "fellowResidents", "$location", "SiteInfo"];
        isLoading: boolean = false;
        widgetInfo: EformWidgetInfo;
        shouldShowWidget = false;
        isSiteManager = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private fellowResidents: Ally.FellowResidentsService,
            private $location: ng.ILocationService,
            private siteInfo: Ally.SiteInfoService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.shouldShowWidget = AppConfig.isChtnSite && ["kevinformtest", "qa"].includes( this.siteInfo.publicSiteInfo.shortName );

            if( this.shouldShowWidget )
                this.loadData();
        }


        filterTemplatesOnWhosAllowed( enabledTemplates: EformTemplateDto[] )
        {
            const templateIdsToHide: number[] = [];

            for( const curTemplate of enabledTemplates )
            {
                if( curTemplate.whoCanCreate === "anyBoard" )
                {
                    if( this.siteInfo.userInfo.boardPosition === 0 )
                        templateIdsToHide.push( curTemplate.eformTemplateId );
                }
                else if( curTemplate.whoCanCreate === "anyBoardOrAdmin" )
                {
                    if( this.siteInfo.userInfo.boardPosition === 0 && !this.siteInfo.userInfo.isSiteManager )
                        templateIdsToHide.push( curTemplate.eformTemplateId );
                }
                else if( curTemplate.whoCanCreate === "owners" )
                {
                    if( this.siteInfo.userInfo.isRenter )
                        templateIdsToHide.push( curTemplate.eformTemplateId );
                }
            }

            this.widgetInfo.enabledTemplates = this.widgetInfo.enabledTemplates.filter( t => !templateIdsToHide.includes( t.eformTemplateId ) );
        }


        loadData()
        {
            this.isLoading = true;

            this.$http.get( "/api/EformInstance/ForHomeWidget" ).then(
                ( response: ng.IHttpPromiseCallbackArg<EformWidgetInfo> ) =>
                {
                    this.isLoading = false;
                    this.widgetInfo = response.data;

                    this.filterTemplatesOnWhosAllowed( this.widgetInfo.enabledTemplates );

                    // Only show the widget if there's something to show
                    this.shouldShowWidget = this.widgetInfo.activeInstances.length > 0
                        || this.widgetInfo.assignedToUserInstances.length > 0
                        || this.widgetInfo.enabledTemplates.length > 0;
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    console.log( "Failed to load template: " + response.data.exceptionMessage );
                    this.$location.path( "/Admin/EformTemplateListing" );
                }
            );
        }
    }


    class EformWidgetInfo
    {
        activeInstances: EformInstanceDto[];
        assignedToUserInstances: EformInstanceDto[];
        enabledTemplates: EformTemplateDto[];
    }
}

CA.angularApp.component( "eformWidget", {
    bindings: {
    },
    templateUrl: "/ngApp/common/eforms/eform-widget.html",
    controller: Ally.EformWidgetController
} );

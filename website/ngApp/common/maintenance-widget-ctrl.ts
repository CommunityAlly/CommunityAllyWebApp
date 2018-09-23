namespace Ally
{
    /**
     * The controller for the widget that lets members send e-mails to the group
     */
    export class MaintenanceWidgetController implements ng.IController
    {
        static $inject = ["$http", "$rootScope", "SiteInfo"];

        isLoading: boolean = false;
        upcomingWork: any[] = [];
        recentProjects: MaintenanceProject[] = [];


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private $rootScope: ng.IRootScopeService, private siteInfo: Ally.SiteInfoService )
        {
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            this.loadProjects();
        }


        /**
        * Retrieve the maintenance projects from the server
        */
        loadProjects()
        {
            this.isLoading = true;

            return this.$http.get( "/api/Maintenance/Projects" ).then( ( response: ng.IHttpPromiseCallbackArg<MaintenanceProject[]> ) =>
            {
                this.isLoading = false;
                this.recentProjects = _.take( response.data, 3 );
                
            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to retrieve projects: " + response.data.exceptionMessage );
            } );
        }
    }
}


CA.angularApp.component( "maintenanceWidget", {
    templateUrl: "/ngApp/common/maintenance-widget.html",
    controller: Ally.MaintenanceWidgetController
} );
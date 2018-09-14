namespace Ally
{
    /**
     * The controller for the widget that lets members send e-mails to the group
     */
    export class HomeUsersController implements ng.IController
    {
        static $inject = ["$http", "$rootScope", "SiteInfo"];

        isLoading: boolean = false;
        isAdmin: boolean = false;
        editUser: any;


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
        }
    }
}


CA.angularApp.component( "homeUsers", {
    templateUrl: "/ngApp/home/manager/home-users.html",
    controller: Ally.HomeUsersController
} );
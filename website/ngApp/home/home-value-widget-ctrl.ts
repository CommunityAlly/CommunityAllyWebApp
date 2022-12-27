namespace Ally
{
    class HomeValueResponse
    {
        chartImageUri: string;
        currentZestimate: number;
        zillowDetailsUrl: string;
    }


    /**
     * The controller for the widget that lets members send emails to the group
     */
    export class HomeValueWidgetController implements ng.IController
    {
        static $inject = ["$http", "$rootScope", "SiteInfo"];

        isLoading: boolean = false;
        shouldShowWidget: boolean = false;
        valueInfo: HomeValueResponse;


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
            this.retrieveInfo();
        }


        /**
         * Retrieve the home value information from the server
         */
        retrieveInfo()
        {
            this.isLoading = true;

            this.$http.get( "/api/HomeValue/ZillowInfo" ).then( ( response: ng.IHttpPromiseCallbackArg<HomeValueResponse> ) =>
            {
                this.isLoading = false;
                this.shouldShowWidget = !!response.data && !!response.data.chartImageUri;

                if( this.shouldShowWidget )
                    this.valueInfo = response.data;

            }, ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;
                this.shouldShowWidget = false;
            } );
        }
    }
}


CA.angularApp.component( "homeValueWidget", {
    templateUrl: "/ngApp/home/home-value-widget.html",
    controller: Ally.HomeValueWidgetController
} );
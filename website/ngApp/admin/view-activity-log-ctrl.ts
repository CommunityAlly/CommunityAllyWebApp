namespace Ally
{
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    export class ViewActivityLogController implements ng.IController
    {
        static $inject = ["$http"];
        isLoading: boolean = false;
        logEntries: any[];


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            // Initialize the UI
            this.retrieveEntries();
        }


        /**
         * Load the activity log data
         */
        retrieveEntries()
        {
            this.isLoading = true;

            var innerThis = this;
            this.$http.get( "/api/ActivityLog" ).then(( logResponse: ng.IHttpPromiseCallbackArg<any[]> ) =>
            {
                innerThis.isLoading = false;
                innerThis.logEntries = logResponse.data;

            }, ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                innerThis.isLoading = false;
                alert( "Failed to load activity log: " + errorResponse.data.exceptionMessage );
            } );
        }
    }
}


CA.angularApp.component( "viewActivityLog", {
    templateUrl: "/ngApp/admin/view-activity-log.html",
    controller: Ally.ViewActivityLogController
} );
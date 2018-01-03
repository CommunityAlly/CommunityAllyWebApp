namespace Ally
{
    class ActivityLogEntry
    {
        userName: string;
        postDate: Date;
        activityMessage: string;
        activityData: string;
        url: string;
        ip: string;
    }


    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    export class ViewActivityLogController implements ng.IController
    {
        static $inject = ["$http"];
        isLoading: boolean = false;
        logEntries: ActivityLogEntry[];


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
            this.$http.get( "/api/ActivityLog" ).then(( logResponse: ng.IHttpPromiseCallbackArg<ActivityLogEntry[]> ) =>
            {
                innerThis.isLoading = false;
                innerThis.logEntries = logResponse.data;

                // The date comes down as a string so let's convert it to a Date object for the local time zone
                _.each( innerThis.logEntries, ( e ) => e.postDate = moment(( e as any ).postDate ).toDate() );
                
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
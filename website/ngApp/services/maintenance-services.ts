namespace Ally
{
    export class MaintenanceEntry
    {
        project: MaintenanceProject;
        todo: TodoItem;

        getTitle()
        {
            if( this.project )
                return this.project.title;
            else
                return this.todo.description;
        }

        getTypeName()
        {
            if( this.project )
                return "Maintenance Record";
            else
                return "To-Do";
        }

        getAuthorName()
        {
            if( this.project )
                return this.project.creatorFullName;
            else
                return this.todo.addedByFullName;
        }

        getCreatedDate()
        {
            if( this.project )
                return this.project.createDateUtc;
            else
                return this.todo.addedDateUtc;
        }
    }


    /**
     * Provides methods to accessing maintenance information
     */
    export class MaintenanceService
    {
        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private $q: ng.IQService, private $cacheFactory: ng.ICacheFactoryService )
        { }


        /**
        * Retrieve the maintenance projects from the server
        */
        loadProjects()
        {
            return this.$http.get( "/api/Maintenance/Projects" ).then( ( response: ng.IHttpPromiseCallbackArg<MaintenanceProject[]> ) =>
            {
                return response.data;

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                return this.$q.reject( response.data );
            } );
        }
    }
}

angular.module( "CondoAlly" ).service( "maintenance", ["$http", "$q", "$cacheFactory", Ally.MaintenanceService] );
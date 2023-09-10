var Ally;
(function (Ally) {
    class MaintenanceEntry {
        getTitle() {
            if (this.project)
                return this.project.title;
            else
                return this.todo.description;
        }
        getTypeName() {
            if (this.project)
                return "Maintenance Record";
            else
                return "To-Do";
        }
        getAuthorName() {
            if (this.project)
                return this.project.creatorFullName;
            else
                return this.todo.addedByFullName;
        }
        getCreatedDate() {
            if (this.project)
                return this.project.createDateUtc;
            else
                return this.todo.addedDateUtc;
        }
    }
    Ally.MaintenanceEntry = MaintenanceEntry;
    /**
     * Provides methods to accessing maintenance information
     */
    class MaintenanceService {
        /**
         * The constructor for the class
         */
        constructor($http, $q, $cacheFactory) {
            this.$http = $http;
            this.$q = $q;
            this.$cacheFactory = $cacheFactory;
        }
        /**
        * Retrieve the maintenance projects from the server
        */
        loadProjects() {
            return this.$http.get("/api/Maintenance/Projects").then((response) => {
                return response.data;
            }, (response) => {
                return this.$q.reject(response.data);
            });
        }
    }
    Ally.MaintenanceService = MaintenanceService;
})(Ally || (Ally = {}));
angular.module("CondoAlly").service("maintenance", ["$http", "$q", "$cacheFactory", Ally.MaintenanceService]);

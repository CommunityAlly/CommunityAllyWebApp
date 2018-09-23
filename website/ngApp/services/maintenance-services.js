var Ally;
(function (Ally) {
    var MaintenanceEntry = /** @class */ (function () {
        function MaintenanceEntry() {
        }
        MaintenanceEntry.prototype.getTitle = function () {
            if (this.project)
                return this.project.title;
            else
                return this.todo.description;
        };
        MaintenanceEntry.prototype.getTypeName = function () {
            if (this.project)
                return "Maintenance Record";
            else
                return "To-Do";
        };
        MaintenanceEntry.prototype.getAuthorName = function () {
            if (this.project)
                return this.project.creatorFullName;
            else
                return this.todo.addedByFullName;
        };
        MaintenanceEntry.prototype.getCreatedDate = function () {
            if (this.project)
                return this.project.createDateUtc;
            else
                return this.todo.addedDateUtc;
        };
        return MaintenanceEntry;
    }());
    Ally.MaintenanceEntry = MaintenanceEntry;
    /**
     * Provides methods to accessing maintenance information
     */
    var MaintenanceService = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function MaintenanceService($http, $q, $cacheFactory) {
            this.$http = $http;
            this.$q = $q;
            this.$cacheFactory = $cacheFactory;
        }
        /**
        * Retrieve the maintenance projects from the server
        */
        MaintenanceService.prototype.loadProjects = function () {
            var _this = this;
            return this.$http.get("/api/Maintenance/Projects").then(function (response) {
                return response.data;
            }, function (response) {
                return _this.$q.reject(response.data);
            });
        };
        return MaintenanceService;
    }());
    Ally.MaintenanceService = MaintenanceService;
})(Ally || (Ally = {}));
angular.module("CondoAlly").service("maintenance", ["$http", "$q", "$cacheFactory", Ally.MaintenanceService]);

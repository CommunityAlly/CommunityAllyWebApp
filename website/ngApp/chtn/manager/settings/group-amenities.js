var Ally;
(function (Ally) {
    /**
     * The controller for the manage polls page
     */
    var GroupAmenitiesController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupAmenitiesController($http, siteInfo, $location) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$location = $location;
            this.isLoading = false;
            this.appShortName = AppConfig.appShortName;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupAmenitiesController.prototype.$onInit = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Association/GroupAmenities").then(function (httpResponse) {
                _this.isLoading = false;
                _this.groupAmenities = httpResponse.data;
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve amenity data: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
        * Called when the user clicks the save button
        */
        GroupAmenitiesController.prototype.saveForm = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/Association/GroupAmenities", this.groupAmenities).then(function (httpResponse) {
                _this.$location.path("/Home");
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        };
        GroupAmenitiesController.$inject = ["$http", "SiteInfo", "$location"];
        return GroupAmenitiesController;
    }());
    Ally.GroupAmenitiesController = GroupAmenitiesController;
    var GroupAmenities = /** @class */ (function () {
        function GroupAmenities() {
        }
        return GroupAmenities;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("groupAmenities", {
    templateUrl: "/ngApp/chtn/manager/settings/group-amenities.html",
    controller: Ally.GroupAmenitiesController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the manage polls page
     */
    class GroupAmenitiesController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $location) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$location = $location;
            this.isLoading = false;
            this.appShortName = AppConfig.appShortName;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isLoading = true;
            this.$http.get("/api/Association/GroupAmenities").then((httpResponse) => {
                this.isLoading = false;
                this.groupAmenities = httpResponse.data;
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to retrieve amenity data: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
        * Called when the user clicks the save button
        */
        saveForm() {
            this.isLoading = true;
            this.$http.put("/api/Association/GroupAmenities", this.groupAmenities).then((httpResponse) => {
                this.$location.path("/Home");
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        }
    }
    GroupAmenitiesController.$inject = ["$http", "SiteInfo", "$location"];
    Ally.GroupAmenitiesController = GroupAmenitiesController;
    class GroupAmenities {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("groupAmenities", {
    templateUrl: "/ngApp/chtn/manager/settings/group-amenities.html",
    controller: Ally.GroupAmenitiesController
});

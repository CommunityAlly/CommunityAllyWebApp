var Ally;
(function (Ally) {
    class HomeValueResponse {
    }
    /**
     * The controller for the widget that lets members send emails to the group
     */
    class HomeValueWidgetController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.shouldShowWidget = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.retrieveInfo();
        }
        /**
         * Retrieve the home value information from the server
         */
        retrieveInfo() {
            this.isLoading = true;
            this.$http.get("/api/HomeValue/ZillowInfo").then((response) => {
                this.isLoading = false;
                this.shouldShowWidget = !!response.data && !!response.data.chartImageUri;
                if (this.shouldShowWidget)
                    this.valueInfo = response.data;
            }, (response) => {
                this.isLoading = false;
                this.shouldShowWidget = false;
            });
        }
    }
    HomeValueWidgetController.$inject = ["$http", "$rootScope", "SiteInfo"];
    Ally.HomeValueWidgetController = HomeValueWidgetController;
})(Ally || (Ally = {}));
CA.angularApp.component("homeValueWidget", {
    templateUrl: "/ngApp/home/home-value-widget.html",
    controller: Ally.HomeValueWidgetController
});

var Ally;
(function (Ally) {
    var HomeValueResponse = /** @class */ (function () {
        function HomeValueResponse() {
        }
        return HomeValueResponse;
    }());
    /**
     * The controller for the widget that lets members send e-mails to the group
     */
    var HomeValueWidgetController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HomeValueWidgetController($http, $rootScope, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.shouldShowWidget = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        HomeValueWidgetController.prototype.$onInit = function () {
            this.retrieveInfo();
        };
        /**
         * Retrieve the home value information from the server
         */
        HomeValueWidgetController.prototype.retrieveInfo = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/HomeValue/ZillowInfo").then(function (response) {
                _this.isLoading = false;
                _this.shouldShowWidget = !!response.data && !!response.data.chartImageUri;
                if (_this.shouldShowWidget)
                    _this.valueInfo = response.data;
            }, function (response) {
                _this.isLoading = false;
                _this.shouldShowWidget = false;
            });
        };
        HomeValueWidgetController.$inject = ["$http", "$rootScope", "SiteInfo"];
        return HomeValueWidgetController;
    }());
    Ally.HomeValueWidgetController = HomeValueWidgetController;
})(Ally || (Ally = {}));
CA.angularApp.component("homeValueWidget", {
    templateUrl: "/ngApp/home/home-value-widget.html",
    controller: Ally.HomeValueWidgetController
});

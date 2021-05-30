var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    var CustomPageViewController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function CustomPageViewController($http, siteInfo, $sce) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$sce = $sce;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        CustomPageViewController.prototype.$onInit = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/CustomPage/View/SellPage").then(function (httpResponse) {
                _this.isLoading = false;
                _this.customPage = httpResponse.data;
                _this.markupHtml = _this.$sce.trustAsHtml(_this.customPage.markupHtml);
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to load page, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        CustomPageViewController.$inject = ["$http", "SiteInfo", "$sce"];
        return CustomPageViewController;
    }());
    Ally.CustomPageViewController = CustomPageViewController;
    var CustomPage = /** @class */ (function () {
        function CustomPage() {
        }
        return CustomPage;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("customPageView", {
    templateUrl: "/ngApp/common/custom-page-view.html",
    controller: Ally.CustomPageViewController
});

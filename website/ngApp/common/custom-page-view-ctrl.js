var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    var CustomPageViewController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function CustomPageViewController($http, siteInfo, $sce, $routeParams) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$sce = $sce;
            this.$routeParams = $routeParams;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        CustomPageViewController.prototype.$onInit = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/PublicCustomPage/View/" + this.$routeParams.slug, { cache: true }).then(function (httpResponse) {
                _this.isLoading = false;
                _this.customPage = httpResponse.data;
                _this.markupHtml = _this.$sce.trustAsHtml(_this.customPage.markupHtml);
                // Make <a> links open in new tabs
                setTimeout(function () { return Ally.RichTextHelper.makeLinksOpenNewTab("custom-page-content"); }, 500);
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to load page, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        CustomPageViewController.$inject = ["$http", "SiteInfo", "$sce", "$routeParams"];
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

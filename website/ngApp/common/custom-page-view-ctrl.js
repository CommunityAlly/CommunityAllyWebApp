var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    class CustomPageViewController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, $sce, $routeParams) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$sce = $sce;
            this.$routeParams = $routeParams;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isLoading = true;
            this.$http.get("/api/PublicCustomPage/View/" + this.$routeParams.slug, { cache: true }).then((httpResponse) => {
                this.isLoading = false;
                this.customPage = httpResponse.data;
                this.markupHtml = this.$sce.trustAsHtml(this.customPage.markupHtml);
                // Make <a> links open in new tabs
                setTimeout(() => Ally.RichTextHelper.makeLinksOpenNewTab("custom-page-content"), 500);
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to load page, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        }
    }
    CustomPageViewController.$inject = ["$http", "SiteInfo", "$sce", "$routeParams"];
    Ally.CustomPageViewController = CustomPageViewController;
    class CustomPage {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("customPageView", {
    templateUrl: "/ngApp/common/custom-page-view.html",
    controller: Ally.CustomPageViewController
});

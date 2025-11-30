var Ally;
(function (Ally) {
    /**
     * The controller for viewing active E-form instances for the logged-in user or creating a new
     * one
     */
    class EformWidgetController {
        /**
         * The constructor for the class
         */
        constructor($http, fellowResidents, $location, siteInfo) {
            this.$http = $http;
            this.fellowResidents = fellowResidents;
            this.$location = $location;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.shouldShowWidget = false;
            this.isSiteManager = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.loadData();
        }
        filterTemplatesOnWhosAllowed(enabledTemplates) {
            const templateIdsToHide = [];
            for (const curTemplate of enabledTemplates) {
                if (curTemplate.whoCanCreate === "anyBoard") {
                    if (this.siteInfo.userInfo.boardPosition === 0)
                        templateIdsToHide.push(curTemplate.eformTemplateId);
                }
                else if (curTemplate.whoCanCreate === "anyBoardOrAdmin") {
                    if (this.siteInfo.userInfo.boardPosition === 0 && !this.siteInfo.userInfo.isSiteManager)
                        templateIdsToHide.push(curTemplate.eformTemplateId);
                }
                else if (curTemplate.whoCanCreate === "owners") {
                    if (this.siteInfo.userInfo.isRenter)
                        templateIdsToHide.push(curTemplate.eformTemplateId);
                }
            }
            this.widgetInfo.enabledTemplates = _.sortBy(this.widgetInfo.enabledTemplates.filter(t => !templateIdsToHide.includes(t.eformTemplateId)), t => t.templateName.toUpperCase());
        }
        loadData() {
            this.isLoading = true;
            this.$http.get("/api/EformInstance/ForHomeWidget").then((response) => {
                this.isLoading = false;
                this.widgetInfo = response.data;
                this.filterTemplatesOnWhosAllowed(this.widgetInfo.enabledTemplates);
                // Only show the widget if there's something to show
                this.shouldShowWidget = this.widgetInfo.activeInstances.length > 0
                    || this.widgetInfo.assignedToUserInstances.length > 0
                    || this.widgetInfo.enabledTemplates.length > 0;
            }, (response) => {
                this.isLoading = false;
                console.log("Failed to load template: " + response.data.exceptionMessage);
                this.$location.path("/EformTemplateListing");
            });
        }
    }
    EformWidgetController.$inject = ["$http", "fellowResidents", "$location", "SiteInfo"];
    Ally.EformWidgetController = EformWidgetController;
    class EformWidgetInfo {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("eformWidget", {
    bindings: {},
    templateUrl: "/ngApp/common/eforms/eform-widget.html",
    controller: Ally.EformWidgetController
});

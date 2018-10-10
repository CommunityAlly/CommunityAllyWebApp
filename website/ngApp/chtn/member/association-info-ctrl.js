var Ally;
(function (Ally) {
    /**
     * The controller for the page used to navigate to other group info pages
     */
    var AssociationInfoController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function AssociationInfoController(siteInfo, $routeParams) {
            this.siteInfo = siteInfo;
            this.$routeParams = $routeParams;
            this.hideDocuments = false;
            this.hideVendors = false;
            this.showMaintenance = false;
            this.showVendors = true;
            this.faqMenuText = "Info/FAQs";
            if (AppConfig.appShortName === "home")
                this.faqMenuText = "Notes";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        AssociationInfoController.prototype.$onInit = function () {
            this.hideDocuments = this.siteInfo.userInfo.isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            this.hideVendors = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club";
            this.showMaintenance = AppConfig.appShortName === "home"
                || (AppConfig.appShortName === "condo")
                || (AppConfig.appShortName === "hoa");
            this.showVendors = AppConfig.appShortName !== "pta";
            if (this.hideDocuments)
                this.selectedView = "Info";
            else
                this.selectedView = "Docs";
            if (HtmlUtil.isValidString(this.$routeParams.viewName))
                this.selectedView = this.$routeParams.viewName;
        };
        AssociationInfoController.$inject = ["SiteInfo", "$routeParams"];
        return AssociationInfoController;
    }());
    Ally.AssociationInfoController = AssociationInfoController;
})(Ally || (Ally = {}));
CA.condoAllyControllers.
    directive('contenteditable', ['$sce', function ($sce) {
        return {
            restrict: 'A',
            require: '?ngModel',
            link: function (scope, element, attrs, ngModel) {
                if (!ngModel)
                    return; // do nothing if no ng-model
                // Specify how UI should be updated
                ngModel.$render = function () {
                    element.html($sce.getTrustedHtml(ngModel.$viewValue || ''));
                };
                // Listen for change events to enable binding
                element.on('blur keyup change', function () {
                    scope.$evalAsync(read);
                });
                read(); // initialize
                // Write data to the model
                function read() {
                    var html = element.html();
                    // When we clear the content editable the browser leaves a <br> behind
                    // If strip-br attribute is provided then we strip this out
                    if (attrs.stripBr && html === "<br>") {
                        html = '';
                    }
                    ngModel.$setViewValue(html);
                }
            }
        };
    }]);
// Highlight text that matches a string
CA.angularApp.filter("highlight", ["$sce", function ($sce) {
        return function (text, phrase) {
            text = text || "";
            if (phrase)
                text = text.replace(new RegExp('(' + phrase + ')', 'gi'), '<span class="fileSearchHighlight">$1</span>');
            return $sce.trustAsHtml(text);
        };
    }]);
CA.angularApp.component("associationInfo", {
    templateUrl: "/ngApp/chtn/member/association-info.html",
    controller: Ally.AssociationInfoController
});

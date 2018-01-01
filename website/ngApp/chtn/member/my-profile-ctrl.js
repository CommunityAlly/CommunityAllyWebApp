var Ally;
(function (Ally) {
    /**
     * The controller for the profile page
     */
    var MyProfileController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function MyProfileController($rootScope, $http, $location, appCacheService, siteInfo) {
            this.$rootScope = $rootScope;
            this.$http = $http;
            this.$location = $location;
            this.appCacheService = appCacheService;
            this.siteInfo = siteInfo;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        MyProfileController.prototype.$onInit = function () {
            this.isDemoSite = HtmlUtil.getSubdomain() === "demosite";
            if (this.siteInfo.privateSiteInfo)
                this.canHideContactInfo = this.siteInfo.privateSiteInfo.canHideContactInfo;
            this.retrieveItems();
        };
        /**
         * Populate the page
         */
        MyProfileController.prototype.retrieveItems = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/MyProfile").then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.profileInfo = httpResponse.data;
                // Don't show empty e-mail address
                if (HtmlUtil.endsWith(innerThis.profileInfo.email, "@condoally.com"))
                    innerThis.profileInfo.email = "";
                innerThis.needsToAcceptTerms = innerThis.profileInfo.acceptedTermsDate === null && !this.isDemoSite;
                innerThis.hasAcceptedTerms = !innerThis.needsToAcceptTerms; // Gets set by the checkbox
                innerThis.$rootScope.hideMenu = innerThis.needsToAcceptTerms;
                // Was used before, here for covenience
                innerThis.saveButtonStyle = {
                    width: "100px",
                    "font-size": "1em"
                };
            });
        };
        /**
         * Occurs when the user hits the save button
         */
        MyProfileController.prototype.onSaveInfo = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/MyProfile", this.profileInfo).then(function () {
                innerThis.resultMessage = "Your changes have been saved.";
                // $rootScope.hideMenu is true when this is the user's first login
                if (innerThis.$rootScope.hideMenu) {
                    innerThis.$rootScope.hideMenu = false;
                    innerThis.$location.path("/Home");
                }
                innerThis.isLoading = false;
            }, function (httpResponse) {
                innerThis.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        };
        MyProfileController.$inject = ["$rootScope", "$http", "$location", "appCacheService", "SiteInfo"];
        return MyProfileController;
    }());
    Ally.MyProfileController = MyProfileController;
})(Ally || (Ally = {}));
CA.angularApp.component("myProfile", {
    templateUrl: "/ngApp/chtn/member/my-profile.html",
    controller: Ally.MyProfileController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="../../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the page to add, edit, and delete custom pages
     */
    var ManageCustomPagesController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManageCustomPagesController($http, siteInfo, $scope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.isLoading = false;
            this.includeInactive = false;
            this.allPageListings = [];
            this.menuPageListings = [];
            this.selectedPageEntry = null;
            this.editPage = null;
            this.selectedLandingPageId = null;
            this.pageSizeString = "0 bytes";
            this.pageSizeBytes = 0;
            this.groupBaseUrl = this.siteInfo.publicSiteInfo.baseUrl;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageCustomPagesController.prototype.$onInit = function () {
            var _this = this;
            this.retrievePages();
            Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 900).then(function (e) {
                _this.pageContentTinyMce = e;
                _this.pageContentTinyMce.on("change", function (e) {
                    // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                    _this.$scope.$apply(function () {
                        _this.updatePageSizeLabel();
                    });
                });
            });
            this.$http.get("/api/CustomPage/GroupLandingPage").then(function (response) {
                _this.selectedLandingPageId = response.data ? response.data : null;
            }, function (response) {
                console.log("Failed to retrieve current landing page: " + response.data.exceptionMessage);
            });
        };
        /**
         * Update the label under the editor showing the size of the page to download
         */
        ManageCustomPagesController.prototype.updatePageSizeLabel = function () {
            if (!this.pageContentTinyMce)
                return;
            var bodyText = this.pageContentTinyMce.getContent() || "";
            this.pageSizeBytes = bodyText.length;
            this.pageSizeString = (this.pageSizeBytes / 1048576).toFixed(2) + " MB";
            //if( this.pageSizeBytes < 5 * 1024 )
            //    this.pageSizeString = this.pageSizeBytes.toString() + " bytes";
            //else if( this.pageSizeBytes < 1 * 1024 * 1024 )
            //    this.pageSizeString = Math.round( this.pageSizeBytes / 1024 ).toString() + " KB";
            //else
            //    this.pageSizeString = Math.round( this.pageSizeBytes / 1048576 ).toString() + " MB";
        };
        /**
        * Retrieve the list of custom pages
        */
        ManageCustomPagesController.prototype.retrievePages = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/CustomPage/AllPages").then(function (response) {
                _this.isLoading = false;
                _this.allPageListings = response.data;
                _this.menuPageListings = _.clone(response.data);
                var addPage = new CustomPage();
                addPage.customPageId = -5;
                addPage.title = "Add New Page...";
                _this.menuPageListings.push(addPage);
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve the custom pages: " + response.data.exceptionMessage);
            });
        };
        /**
        * Save the current page
        */
        ManageCustomPagesController.prototype.savePage = function () {
            var _this = this;
            if (HtmlUtil.isNullOrWhitespace(this.editPage.title)) {
                alert("Please enter a title for the page");
                return;
            }
            if (HtmlUtil.isNullOrWhitespace(this.editPage.pageSlug)) {
                alert("Please enter a slug for the page");
                return;
            }
            this.editPage.markupHtml = this.pageContentTinyMce.getContent();
            this.isLoading = true;
            var httpFunc = this.editPage.customPageId ? this.$http.put : this.$http.post;
            httpFunc("/api/CustomPage", this.editPage).then(function () {
                _this.isLoading = false;
                _this.selectedPageEntry = null;
                _this.editPage = null;
                _this.pageContentTinyMce.setContent("");
                _this.updatePageSizeLabel();
                _this.retrievePages();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save the page: " + response.data.exceptionMessage);
            });
        };
        /**
        * Permanently elete the current page
        */
        ManageCustomPagesController.prototype.deletePage = function () {
            var _this = this;
            if (!confirm("Are you sure you want to permanently delete this page? This action CANNOT BE UNDONE."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/CustomPage/" + this.editPage.customPageId).then(function () {
                _this.isLoading = false;
                _this.selectedPageEntry = null;
                _this.editPage = null;
                _this.pageContentTinyMce.setContent("");
                _this.updatePageSizeLabel();
                _this.retrievePages();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete the page: " + response.data.exceptionMessage);
            });
        };
        /**
        * Occurs when focus leaves the title input field
        */
        ManageCustomPagesController.prototype.onTitleBlur = function () {
            if (!this.editPage || this.editPage.pageSlug || !this.editPage.title)
                return;
            this.editPage.pageSlug = (this.editPage.title || "").trim();
            this.editPage.pageSlug = this.editPage.pageSlug.replace(/[^0-9a-z- ]/gi, ''); // Remove non-alphanumeric+dash
            this.editPage.pageSlug = this.editPage.pageSlug.replace(/ /g, '-'); // Replace spaces with dashes
        };
        /**
        * Occurs when focus leaves the slug field, sanitizes the slug to be URL-friendly
        */
        ManageCustomPagesController.prototype.onSlugBlur = function () {
            if (!this.editPage)
                return;
            this.editPage.pageSlug = (this.editPage.pageSlug || "").trim();
            this.editPage.pageSlug = this.editPage.pageSlug.replace(/ /g, '-'); // Replace spaces with dashes
        };
        /**
         * Occurs when the user selects a page to edit
         */
        ManageCustomPagesController.prototype.onPageSelected = function () {
            var _this = this;
            if (this.selectedPageEntry.customPageId > 0) {
                this.isLoading = true;
                this.$http.get("/api/CustomPage/" + this.selectedPageEntry.customPageId).then(function (response) {
                    _this.isLoading = false;
                    _this.editPage = response.data;
                    _this.pageContentTinyMce.setContent(_this.editPage.markupHtml);
                    _this.updatePageSizeLabel();
                }, function (response) {
                    _this.isLoading = false;
                    alert("Failed to retrieve custom page: " + response.data.exceptionMessage);
                });
            }
            else {
                this.editPage = new CustomPage();
                this.pageContentTinyMce.setContent("");
                this.updatePageSizeLabel();
            }
        };
        /**
         * Occurs when the user selects a new landing page for the group
         */
        ManageCustomPagesController.prototype.onLandingPageSelected = function () {
            var _this = this;
            var putUri = "/api/CustomPage/SetGroupLandingPage";
            if (this.selectedLandingPageId)
                putUri += "?customPageId=" + this.selectedLandingPageId;
            this.isLoading = true;
            this.$http.put(putUri, null).then(function (response) {
                _this.isLoading = false;
                if (_this.selectedLandingPageId)
                    _this.siteInfo.publicSiteInfo.customLandingPagePath = null;
                else {
                    var selectedPage = _this.allPageListings.find(function (p) { return p.customPageId === _this.selectedLandingPageId; });
                    if (selectedPage)
                        _this.siteInfo.publicSiteInfo.customLandingPagePath = "#!/Page/" + selectedPage.pageSlug;
                }
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to update landing page: " + response.data.exceptionMessage);
            });
        };
        ManageCustomPagesController.$inject = ["$http", "SiteInfo", "$scope"];
        return ManageCustomPagesController;
    }());
    Ally.ManageCustomPagesController = ManageCustomPagesController;
    var CustomPage = /** @class */ (function () {
        function CustomPage() {
        }
        return CustomPage;
    }());
    var PublicCustomPageEntry = /** @class */ (function () {
        function PublicCustomPageEntry() {
        }
        return PublicCustomPageEntry;
    }());
    Ally.PublicCustomPageEntry = PublicCustomPageEntry;
})(Ally || (Ally = {}));
CA.angularApp.component("manageCustomPages", {
    templateUrl: "/ngApp/chtn/manager/manage-custom-pages.html",
    controller: Ally.ManageCustomPagesController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to add, edit, and delete custom pages
     */
    class ManageCustomPagesController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $scope) {
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
        $onInit() {
            this.retrievePages();
            Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 900).then(e => {
                this.pageContentTinyMce = e;
                this.pageContentTinyMce.on("change", (e) => {
                    // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                    this.$scope.$apply(() => {
                        this.updatePageSizeLabel();
                    });
                });
            });
            this.$http.get("/api/CustomPage/GroupLandingPage").then((response) => {
                this.selectedLandingPageId = response.data ? response.data : null;
            }, (response) => {
                console.log("Failed to retrieve current landing page: " + response.data.exceptionMessage);
            });
        }
        /**
         * Update the label under the editor showing the size of the page to download
         */
        updatePageSizeLabel() {
            if (!this.pageContentTinyMce)
                return;
            const bodyText = this.pageContentTinyMce.getContent() || "";
            this.pageSizeBytes = bodyText.length;
            this.pageSizeString = (this.pageSizeBytes / 1048576).toFixed(2) + " MB";
            //if( this.pageSizeBytes < 5 * 1024 )
            //    this.pageSizeString = this.pageSizeBytes.toString() + " bytes";
            //else if( this.pageSizeBytes < 1 * 1024 * 1024 )
            //    this.pageSizeString = Math.round( this.pageSizeBytes / 1024 ).toString() + " KB";
            //else
            //    this.pageSizeString = Math.round( this.pageSizeBytes / 1048576 ).toString() + " MB";
        }
        /**
        * Retrieve the list of custom pages
        */
        retrievePages() {
            this.isLoading = true;
            this.$http.get("/api/CustomPage/AllPages").then((response) => {
                this.isLoading = false;
                this.allPageListings = response.data;
                this.menuPageListings = _.clone(response.data);
                const addPage = new CustomPage();
                addPage.customPageId = -5;
                addPage.title = "Add New Page...";
                this.menuPageListings.push(addPage);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve the custom pages: " + response.data.exceptionMessage);
            });
        }
        /**
        * Save the current page
        */
        savePage() {
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
            const httpFunc = this.editPage.customPageId ? this.$http.put : this.$http.post;
            httpFunc(`/api/CustomPage`, this.editPage).then(() => {
                this.isLoading = false;
                this.selectedPageEntry = null;
                this.editPage = null;
                this.pageContentTinyMce.setContent("");
                this.updatePageSizeLabel();
                this.retrievePages();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save the page: " + response.data.exceptionMessage);
            });
        }
        /**
        * Permanently elete the current page
        */
        deletePage() {
            if (!confirm("Are you sure you want to permanently delete this page? This action CANNOT BE UNDONE."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/CustomPage/" + this.editPage.customPageId).then(() => {
                this.isLoading = false;
                this.selectedPageEntry = null;
                this.editPage = null;
                this.pageContentTinyMce.setContent("");
                this.updatePageSizeLabel();
                this.retrievePages();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to delete the page: " + response.data.exceptionMessage);
            });
        }
        /**
        * Occurs when focus leaves the title input field
        */
        onTitleBlur() {
            if (!this.editPage || this.editPage.pageSlug || !this.editPage.title)
                return;
            this.editPage.pageSlug = (this.editPage.title || "").trim();
            this.editPage.pageSlug = this.editPage.pageSlug.replace(/[^0-9a-z- ]/gi, ''); // Remove non-alphanumeric+dash
            this.editPage.pageSlug = this.editPage.pageSlug.replace(/ /g, '-'); // Replace spaces with dashes
        }
        /**
        * Occurs when focus leaves the slug field, sanitizes the slug to be URL-friendly
        */
        onSlugBlur() {
            if (!this.editPage)
                return;
            this.editPage.pageSlug = (this.editPage.pageSlug || "").trim();
            this.editPage.pageSlug = this.editPage.pageSlug.replace(/ /g, '-'); // Replace spaces with dashes
        }
        /**
         * Occurs when the user selects a page to edit
         */
        onPageSelected() {
            if (this.selectedPageEntry.customPageId > 0) {
                this.isLoading = true;
                this.$http.get("/api/CustomPage/" + this.selectedPageEntry.customPageId).then((response) => {
                    this.isLoading = false;
                    this.editPage = response.data;
                    this.pageContentTinyMce.setContent(this.editPage.markupHtml);
                    this.updatePageSizeLabel();
                }, (response) => {
                    this.isLoading = false;
                    alert("Failed to retrieve custom page: " + response.data.exceptionMessage);
                });
            }
            else {
                this.editPage = new CustomPage();
                this.pageContentTinyMce.setContent("");
                this.updatePageSizeLabel();
            }
        }
        /**
         * Occurs when the user selects a new landing page for the group
         */
        onLandingPageSelected() {
            let putUri = "/api/CustomPage/SetGroupLandingPage";
            if (this.selectedLandingPageId)
                putUri += "?customPageId=" + this.selectedLandingPageId;
            this.isLoading = true;
            this.$http.put(putUri, null).then((response) => {
                this.isLoading = false;
                if (this.selectedLandingPageId)
                    this.siteInfo.publicSiteInfo.customLandingPagePath = null;
                else {
                    const selectedPage = this.allPageListings.find(p => p.customPageId === this.selectedLandingPageId);
                    if (selectedPage)
                        this.siteInfo.publicSiteInfo.customLandingPagePath = "#!/Page/" + selectedPage.pageSlug;
                }
            }, (response) => {
                this.isLoading = false;
                alert("Failed to update landing page: " + response.data.exceptionMessage);
            });
        }
    }
    ManageCustomPagesController.$inject = ["$http", "SiteInfo", "$scope"];
    Ally.ManageCustomPagesController = ManageCustomPagesController;
    class CustomPage {
    }
    class PublicCustomPageEntry {
    }
    Ally.PublicCustomPageEntry = PublicCustomPageEntry;
})(Ally || (Ally = {}));
CA.angularApp.component("manageCustomPages", {
    templateUrl: "/ngApp/chtn/manager/manage-custom-pages.html",
    controller: Ally.ManageCustomPagesController
});

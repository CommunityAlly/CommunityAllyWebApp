var Ally;
(function (Ally) {
    class BaseSiteSettings {
    }
    Ally.BaseSiteSettings = BaseSiteSettings;
    /**
     * Represents settings for a Condo, HOA, or Neighborhood Ally site
     */
    class ChtnSiteSettings extends BaseSiteSettings {
    }
    Ally.ChtnSiteSettings = ChtnSiteSettings;
    /**
     * The controller for the page to view group site settings
     */
    class ChtnSettingsController {
        //static readonly MovedLoginImageDate = new Date( 2024, 3, 25 ); // Groups created after April 24, 2024 always have discussion enabled
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $scope, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.$rootScope = $rootScope;
            this.settings = new ChtnSiteSettings();
            this.originalSettings = new ChtnSiteSettings();
            this.isLoading = false;
            this.showRightColumnSetting = true;
            this.isPta = false;
            this.shouldShowWelcomeTooLongError = false;
            this.tinyMceDidNotLoad = false;
            this.shouldShowBulletinBoardOptions = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.frontEndVersion = appVer.toString();
            this.defaultBGImage = $(document.documentElement).css("background-image");
            this.shouldShowQaButton = this.siteInfo.userInfo.emailAddress === "president@mycondoally.com" || this.siteInfo.userInfo.userId === "219eb985-613b-4fc0-a523-7474adb706bd";
            this.showRightColumnSetting = this.siteInfo.privateSiteInfo.creationDate < Ally.SiteInfoService.AlwaysDiscussDate;
            this.isPta = AppConfig.appShortName === "pta";
            this.shouldShowBulletinBoardOptions = this.siteInfo.publicSiteInfo.shortName === "qa";
            this.refreshData();
        }
        /**
         * Populate the page from the server
         */
        refreshData() {
            this.isLoading = true;
            this.$http.get("/api/Settings/GetSiteSettings").then((response) => {
                this.isLoading = false;
                this.settings = response.data;
                this.originalSettings = _.clone(response.data);
                if (!this.tinyMceEditor) {
                    const tinyMceOpts = {
                        menubar: "edit format table",
                        toolbar: "styleselect | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link | checklist code formatpainter table"
                    };
                    Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 400, tinyMceOpts).then(e => {
                        this.tinyMceEditor = e;
                        if (this.tinyMceEditor) {
                            if (this.settings.welcomeMessage)
                                this.tinyMceEditor.setContent(this.settings.welcomeMessage);
                            this.tinyMceEditor.on("keyup", () => {
                                // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                                this.$scope.$apply(() => {
                                    this.onWelcomeMessageEdit();
                                });
                            });
                        }
                        else
                            this.tinyMceDidNotLoad = true;
                    });
                }
            });
        }
        static isEmptyHtml(testHtml) {
            if (HtmlUtil.isNullOrWhitespace(testHtml))
                return true;
            testHtml = testHtml.replaceAll("<p>", "");
            testHtml = testHtml.replaceAll("&nbsp;", "");
            testHtml = testHtml.replaceAll("</p>", "");
            return HtmlUtil.isNullOrWhitespace(testHtml);
        }
        /**
         * Save all of the settings
         */
        saveAllSettings() {
            analytics.track("editSettings");
            this.settings.welcomeMessage = this.tinyMceEditor.getContent();
            this.isLoading = true;
            this.$http.put("/api/Settings/UpdateSiteSettings", this.settings).then(() => {
                this.isLoading = false;
                // Update the locally-stored values
                this.siteInfo.privateSiteInfo.homeRightColumnType = this.settings.homeRightColumnType;
                this.siteInfo.privateSiteInfo.welcomeMessage = this.settings.welcomeMessage;
                if (ChtnSettingsController.isEmptyHtml(this.siteInfo.privateSiteInfo.welcomeMessage))
                    this.siteInfo.privateSiteInfo.welcomeMessage = null;
                this.siteInfo.privateSiteInfo.ptaUnitId = this.settings.ptaUnitId;
                const didChangeFullName = this.settings.fullName !== this.originalSettings.fullName;
                // Reload the page to show the page title has changed
                if (didChangeFullName)
                    location.reload();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user clicks a new background image
         */
        onImageClick(bgImage) {
            this.settings.bgImageFileName = bgImage;
            //SettingsJS._defaultBG = bgImage;
            this.$http.put("/api/Settings/NOTUSED", { BGImageFileName: this.settings.bgImageFileName }).then(() => {
                $(".test-bg-image").removeClass("test-bg-image-selected");
                //$( "img[src='" + $rootScope.bgImagePath + bgImage + "']" ).addClass( "test-bg-image-selected" );
                this.isLoading = false;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save: " + response.data);
            });
        }
        onImageHoverOver(bgImage) {
            //$( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + bgImage + ")" );
        }
        onImageHoverOut() {
            //if( typeof ( this.settings.bgImageFileName ) === "string" && this.settings.bgImageFileName.length > 0 )
            //    $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + this.settings.bgImageFileName + ")" );
            //else
            //    $( document.documentElement ).css( "background-image", this.defaultBGImage );
        }
        onQaDeleteSite() {
            this.$http.get("/api/QA/DeleteThisAssociation").then(function () {
                location.reload();
            }, function (httpResponse) {
                alert("Failed to delete site: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user clicks the link to force refresh the page
         */
        forceRefresh() {
            window.location.reload();
        }
        onWelcomeMessageEdit() {
            const MaxWelcomeLength = 10000;
            const welcomeHtml = this.tinyMceEditor.getContent();
            this.shouldShowWelcomeTooLongError = welcomeHtml.length > MaxWelcomeLength;
        }
    }
    ChtnSettingsController.$inject = ["$http", "SiteInfo", "$scope", "$rootScope"];
    Ally.ChtnSettingsController = ChtnSettingsController;
})(Ally || (Ally = {}));
CA.angularApp.component("chtnSiteSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/site-settings.html",
    controller: Ally.ChtnSettingsController
});

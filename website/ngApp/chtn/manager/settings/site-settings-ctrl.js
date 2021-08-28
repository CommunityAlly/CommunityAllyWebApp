var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    var BaseSiteSettings = /** @class */ (function () {
        function BaseSiteSettings() {
        }
        return BaseSiteSettings;
    }());
    Ally.BaseSiteSettings = BaseSiteSettings;
    /**
     * Represents settings for a Condo, HOA, or Neighborhood Ally site
     */
    var ChtnSiteSettings = /** @class */ (function (_super) {
        __extends(ChtnSiteSettings, _super);
        function ChtnSiteSettings() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ChtnSiteSettings;
    }(BaseSiteSettings));
    Ally.ChtnSiteSettings = ChtnSiteSettings;
    /**
     * The controller for the page to view group site settings
     */
    var ChtnSettingsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ChtnSettingsController($http, siteInfo, $timeout, $scope, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.$rootScope = $rootScope;
            this.settings = new ChtnSiteSettings();
            this.originalSettings = new ChtnSiteSettings();
            this.isLoading = false;
            this.showRightColumnSetting = true;
            this.showLocalNewsSetting = false;
            this.isPta = false;
            this.shouldShowWelcomeTooLongError = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        ChtnSettingsController.prototype.$onInit = function () {
            var _this = this;
            this.frontEndVersion = appVer.toString();
            this.defaultBGImage = $(document.documentElement).css("background-image");
            this.showQaButton = this.siteInfo.userInfo.emailAddress === "president@mycondoally.com";
            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;
            this.showRightColumnSetting = this.siteInfo.privateSiteInfo.creationDate < Ally.SiteInfoService.AlwaysDiscussDate;
            this.showLocalNewsSetting = !this.showRightColumnSetting;
            this.isPta = AppConfig.appShortName === "pta";
            // Hook up the file upload control after everything is loaded and setup
            this.$timeout(function () { return _this.hookUpLoginImageUpload(); }, 200);
            this.refreshData();
        };
        /**
         * Populate the page from the server
         */
        ChtnSettingsController.prototype.refreshData = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Settings").then(function (response) {
                _this.isLoading = false;
                _this.settings = response.data;
                _this.originalSettings = _.clone(response.data);
                if (!_this.welcomeRichEditorElem) {
                    _this.$timeout(function () {
                        Ally.RichTextHelper.initToolbarBootstrapBindings();
                        _this.welcomeRichEditorElem = $('#welcome-rich-editor');
                        _this.welcomeRichEditorElem.wysiwyg({ fileUploadError: Ally.RichTextHelper.showFileUploadAlert });
                        // Convert old line breaks to HTML line breaks
                        if (Ally.HtmlUtil2.isValidString(_this.settings.welcomeMessage) && _this.settings.welcomeMessage.indexOf("<") === -1)
                            _this.settings.welcomeMessage = _this.settings.welcomeMessage.replace(/\n/g, "<br>");
                        _this.welcomeRichEditorElem.html(_this.settings.welcomeMessage);
                    }, 100);
                }
            });
        };
        /**
         * Clear the login image
         */
        ChtnSettingsController.prototype.removeLoginImage = function () {
            var _this = this;
            analytics.track("clearLoginImage");
            this.isLoading = true;
            this.$http.get("/api/Settings/ClearLoginImage").then(function () {
                _this.isLoading = false;
                _this.siteInfo.publicSiteInfo.loginImageUrl = "";
                _this.loginImageUrl = "";
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to remove loading image: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Save all of the settings
         */
        ChtnSettingsController.prototype.saveAllSettings = function () {
            var _this = this;
            analytics.track("editSettings");
            this.settings.welcomeMessage = this.welcomeRichEditorElem.html();
            this.isLoading = true;
            this.$http.put("/api/Settings", this.settings).then(function () {
                _this.isLoading = false;
                // Update the locally-stored values
                _this.siteInfo.privateSiteInfo.homeRightColumnType = _this.settings.homeRightColumnType;
                _this.siteInfo.privateSiteInfo.welcomeMessage = _this.settings.welcomeMessage;
                _this.siteInfo.privateSiteInfo.ptaUnitId = _this.settings.ptaUnitId;
                var didChangeFullName = _this.settings.fullName !== _this.originalSettings.fullName;
                // Reload the page to show the page title has changed
                if (didChangeFullName)
                    location.reload();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks a new background image
         */
        ChtnSettingsController.prototype.onImageClick = function (bgImage) {
            var _this = this;
            this.settings.bgImageFileName = bgImage;
            //SettingsJS._defaultBG = bgImage;
            this.$http.put("/api/Settings", { BGImageFileName: this.settings.bgImageFileName }).then(function () {
                $(".test-bg-image").removeClass("test-bg-image-selected");
                //$( "img[src='" + $rootScope.bgImagePath + bgImage + "']" ).addClass( "test-bg-image-selected" );
                _this.isLoading = false;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data);
            });
        };
        ChtnSettingsController.prototype.onImageHoverOver = function (bgImage) {
            //$( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + bgImage + ")" );
        };
        ChtnSettingsController.prototype.onImageHoverOut = function () {
            //if( typeof ( this.settings.bgImageFileName ) === "string" && this.settings.bgImageFileName.length > 0 )
            //    $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + this.settings.bgImageFileName + ")" );
            //else
            //    $( document.documentElement ).css( "background-image", this.defaultBGImage );
        };
        ChtnSettingsController.prototype.onQaDeleteSite = function () {
            this.$http.get("/api/QA/DeleteThisAssociation").then(function () {
                location.reload();
            }, function (httpResponse) {
                alert("Failed to delete site: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Initialize the login image JQuery upload control
         */
        ChtnSettingsController.prototype.hookUpLoginImageUpload = function () {
            var _this = this;
            $(function () {
                $('#JQLoginImageFileUploader').fileupload({
                    autoUpload: true,
                    add: function (e, data) {
                        _this.$scope.$apply(function () {
                            _this.isLoading = true;
                        });
                        analytics.track("setLoginImage");
                        $("#FileUploadProgressContainer").show();
                        data.url = "api/DocumentUpload/LoginImage";
                        if (_this.siteInfo.publicSiteInfo.baseApiUrl)
                            data.url = _this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload/LoginImage";
                        var xhr = data.submit();
                        xhr.done(function (result) {
                            _this.$scope.$apply(function () {
                                _this.isLoading = false;
                                _this.loginImageUrl = result.newUrl + "?cacheBreaker=" + new Date().getTime();
                                _this.siteInfo.publicSiteInfo.loginImageUrl = _this.loginImageUrl;
                            });
                            $("#FileUploadProgressContainer").hide();
                        });
                    },
                    beforeSend: function (xhr) {
                        if (_this.siteInfo.publicSiteInfo.baseApiUrl)
                            xhr.setRequestHeader("Authorization", "Bearer " + _this.$rootScope.authToken);
                        else
                            xhr.setRequestHeader("ApiAuthToken", _this.$rootScope.authToken);
                    },
                    progressall: function (e, data) {
                        var progress = Math.floor((data.loaded * 100) / data.total);
                        $('#FileUploadProgressBar').css('width', progress + '%');
                        if (progress === 100)
                            $("#FileUploadProgressLabel").text("Finalizing Upload...");
                        else
                            $("#FileUploadProgressLabel").text(progress + "%");
                    }
                });
            });
        };
        /**
         * Occurs when the user clicks the link to force refresh the page
         */
        ChtnSettingsController.prototype.forceRefresh = function () {
            window.location.reload(true);
        };
        ChtnSettingsController.prototype.onWelcomeMessageEdit = function () {
            var MaxWelcomeLength = 2000;
            var welcomeHtml = this.welcomeRichEditorElem.html();
            this.shouldShowWelcomeTooLongError = welcomeHtml.length > MaxWelcomeLength;
        };
        ChtnSettingsController.$inject = ["$http", "SiteInfo", "$timeout", "$scope", "$rootScope"];
        return ChtnSettingsController;
    }());
    Ally.ChtnSettingsController = ChtnSettingsController;
})(Ally || (Ally = {}));
CA.angularApp.component("chtnSiteSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/site-settings.html",
    controller: Ally.ChtnSettingsController
});

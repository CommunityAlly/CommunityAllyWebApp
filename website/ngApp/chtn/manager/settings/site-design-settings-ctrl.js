var Ally;
(function (Ally) {
    /**
     * The controller for the site design settings page
     */
    class SiteDesignSettingsController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $rootScope, $timeout, $scope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$rootScope = $rootScope;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.isLoading = false;
            this.siteDesignSettings = new Ally.SiteDesignSettings();
            this.isCustomLoaded = false;
            this.headerBgType = "classic";
            this.siteBgType = "color";
            this.siteBgColor = "#ffffff";
            this.siteBgColor2 = "#ffffff";
            this.headerBgColor = "#eee";
            this.isSaving = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            //console.log( "In SiteDesignSettingsController.$onInit" );
            if (!this.siteInfo.publicSiteInfo.siteDesignSettingsJson)
                this.siteDesignSettings = Ally.SiteDesignSettings.GetDefault();
            else
                this.siteDesignSettings = JSON.parse(this.siteInfo.publicSiteInfo.siteDesignSettingsJson);
            this.populateBgColorFromPreset();
            this.previousChangeSiteDesignSettings = { ...this.siteDesignSettings };
            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;
            // Hook up the file upload control after everything is loaded and setup
            this.$timeout(() => this.hookUpLoginImageUpload(), 200);
            // Retrieve the custom site design settings
            this.$http.get("/api/Settings/GetSiteDesignSettings").then((response) => {
                this.isLoading = false;
                this.isCustomLoaded = true;
                this.customSiteDesignSettingsJson = response.data.customSiteDesignSettingsJson;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to load custom settings: " + response.data.exceptionMessage);
            });
        }
        selectPreset(presetName) {
            //console.log( "in selectPreset", presetName );
            this.siteDesignSettings.presetTemplateName = presetName;
            if (presetName !== "custom") {
                this.siteDesignSettings = Ally.SiteDesignSettings.GetPreset(presetName);
            }
            else {
                this.siteDesignSettings = JSON.parse(this.customSiteDesignSettingsJson);
            }
            this.$rootScope.siteDesignSettings = this.siteDesignSettings;
            window.localStorage.setItem(Ally.SiteDesignSettings.SettingsCacheKey, JSON.stringify(this.siteDesignSettings));
            // Populate the header BG setting
            if (this.siteDesignSettings.headerBg === Ally.SiteDesignSettings.HeaderBgClassic)
                this.headerBgType = "classic";
            else if (this.siteDesignSettings.headerBg === Ally.SiteDesignSettings.HeaderBgPink)
                this.headerBgType = "pink";
            else {
                this.headerBgType = "color";
                this.headerBgColor = this.siteDesignSettings.headerBg;
            }
            // Populate the site BG setting
            this.populateBgColorFromPreset();
            Ally.SiteDesignSettings.ApplySiteDesignSettings(this.siteDesignSettings);
            this.previousChangeSiteDesignSettings = { ...this.siteDesignSettings };
            this.saveSettings();
        }
        populateBgColorFromPreset() {
            if (this.siteDesignSettings.background && this.siteDesignSettings.background.endsWith(Ally.SiteDesignSettings.SiteBgImgHexagons)) {
                if (this.siteDesignSettings.background.indexOf(" ") > 1)
                    this.siteBgColor = this.siteDesignSettings.background.split(" ")[0];
                this.siteBgType = "hexagons";
            }
            else if (this.siteDesignSettings.background && this.siteDesignSettings.background.endsWith(Ally.SiteDesignSettings.SiteBgImgPinstripes)) {
                if (this.siteDesignSettings.background.indexOf(" ") > 1)
                    this.siteBgColor = this.siteDesignSettings.background.split(" ")[0];
                this.siteBgType = "pinstripes";
            }
            else if (this.siteDesignSettings.background && this.siteDesignSettings.background.startsWith(SiteDesignSettingsController.LinearGradientPrefix)) {
                this.splitLinearGradientString(this.siteDesignSettings.background);
                this.siteBgType = "linearGradient";
            }
            else {
                this.siteBgType = "color";
                this.siteBgColor = this.siteDesignSettings.background;
            }
        }
        splitLinearGradientString(linearGradient) {
            if (!linearGradient || !linearGradient.startsWith(SiteDesignSettingsController.LinearGradientPrefix))
                return;
            const trimmed = linearGradient.substring(SiteDesignSettingsController.LinearGradientPrefix.length);
            const splitParts = trimmed.split(" 0%, #");
            if (splitParts.length !== 2)
                return;
            this.siteBgColor2 = "#" + splitParts[0];
            const endIndex = splitParts[1].indexOf(" ");
            if (endIndex === -1)
                return;
            this.siteBgColor = "#" + splitParts[1].substring(0, endIndex);
            //console.log( "splitLinearGradientString", this.siteBgColor, this.siteBgColor2 );
        }
        saveSettings() {
            this.isSaving = true;
            const updateInfo = {
                siteDesignSettingsJson: JSON.stringify(this.siteDesignSettings),
                customSiteDesignSettingsJson: this.customSiteDesignSettingsJson
            };
            this.$http.put("/api/Settings/UpdateSiteDesignSettings", updateInfo).then(() => {
                this.isSaving = false;
                this.siteInfo.publicSiteInfo.siteDesignSettingsJson = updateInfo.siteDesignSettingsJson;
            }, (response) => {
                this.isSaving = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        }
        /**
         * Clear the login image
         */
        removeLoginImage() {
            analytics.track("clearLoginImage");
            this.isLoading = true;
            this.$http.get("/api/Settings/ClearLoginImage").then(() => {
                this.isLoading = false;
                this.siteInfo.publicSiteInfo.loginImageUrl = "";
                this.loginImageUrl = "";
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to remove loading image: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Initialize the login image JQuery upload control
         */
        hookUpLoginImageUpload() {
            $(() => {
                $('#JQLoginImageFileUploader').fileupload({
                    dropZone: null,
                    pasteZone: null,
                    autoUpload: true,
                    add: (e, data) => {
                        this.$scope.$apply(() => {
                            this.isLoading = true;
                        });
                        analytics.track("setLoginImage");
                        $("#FileUploadProgressContainer").show();
                        data.url = "api/DocumentUpload/LoginImage";
                        if (this.siteInfo.publicSiteInfo.baseApiUrl)
                            data.url = this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload/LoginImage";
                        const xhr = data.submit();
                        xhr.done((result) => {
                            this.$scope.$apply(() => {
                                this.isLoading = false;
                                this.loginImageUrl = result.newUrl + "?cacheBreaker=" + new Date().getTime();
                                this.siteInfo.publicSiteInfo.loginImageUrl = this.loginImageUrl;
                            });
                            $("#FileUploadProgressContainer").hide();
                        });
                        xhr.error((jqXHR) => {
                            alert("Upload failed: " + jqXHR.responseJSON.exceptionMessage);
                            //console.log( "fail", jqXHR, textStatus, errorThrown );
                            this.$scope.$apply(() => this.isLoading = false);
                        });
                    },
                    beforeSend: (xhr) => {
                        if (this.siteInfo.publicSiteInfo.baseApiUrl)
                            xhr.setRequestHeader("Authorization", "Bearer " + this.$rootScope.authToken);
                        else
                            xhr.setRequestHeader("ApiAuthToken", this.$rootScope.authToken);
                    },
                    progressall: (e, data) => {
                        const progress = Math.floor((data.loaded * 100) / data.total);
                        $('#FileUploadProgressBar').css('width', progress + '%');
                        if (progress === 100)
                            $("#FileUploadProgressLabel").text("Finalizing Upload...");
                        else
                            $("#FileUploadProgressLabel").text(progress + "%");
                    },
                    fail: (e, xhr) => {
                        console.log("Failed to upload document", e, xhr);
                        //alert( "Failed to upload login image, please let support know if this continues: " + xhr.response().jqXHR.responseJSON.exceptionMessage );
                        //console.log( "Failed to upload document", xhr );
                        //this.$scope.$apply( () => this.isLoading = false );
                    }
                });
            });
        }
        /**
         * Occurs when the user changes a set design setting in the custom area
         */
        onCustomSettingChanged() {
            //console.log( "onCustomSettingChanged" );
            // If the site is using a preset design and they're about to customize it and they have
            // a saved custom design, then warn them
            if (this.previousChangeSiteDesignSettings.presetTemplateName !== "custom") {
                if (this.customSiteDesignSettingsJson) {
                    if (!confirm("You're about to create a new custom design that will overwrite you're previous custom design. Are you sure you want to make this change?")) {
                        this.siteDesignSettings = this.previousChangeSiteDesignSettings;
                        this.$rootScope.siteDesignSettings = this.siteDesignSettings;
                        return;
                    }
                }
            }
            this.siteDesignSettings.presetTemplateName = "custom";
            console.log("In onCustomSettingChanged", this.siteDesignSettings);
            Ally.SiteDesignSettings.ApplySiteDesignSettings(this.siteDesignSettings);
            this.$rootScope.siteDesignSettings = this.siteDesignSettings;
            this.previousChangeSiteDesignSettings = { ...this.siteDesignSettings };
            this.customSiteDesignSettingsJson = JSON.stringify(this.siteDesignSettings);
            this.saveSettings();
        }
        onCustomHeaderBgChanged() {
            if (this.headerBgType === "classic") {
                this.siteDesignSettings.headerBg = Ally.SiteDesignSettings.HeaderBgClassic;
                this.siteDesignSettings.headerBgSize = "auto 100%";
            }
            else if (this.headerBgType === "pink") {
                this.siteDesignSettings.headerBg = Ally.SiteDesignSettings.HeaderBgPink;
                this.siteDesignSettings.headerBgSize = "auto";
            }
            else {
                this.siteDesignSettings.headerBg = this.headerBgColor;
                this.siteDesignSettings.headerBgSize = "auto";
            }
            this.onCustomSettingChanged();
        }
        onCustomSiteBgChanged() {
            if (this.siteBgType === "hexagons") {
                this.siteDesignSettings.background = this.siteBgColor + " " + Ally.SiteDesignSettings.SiteBgImgHexagons;
            }
            else if (this.siteBgType === "pinstripes") {
                this.siteDesignSettings.background = this.siteBgColor + " " + Ally.SiteDesignSettings.SiteBgImgPinstripes;
            }
            else if (this.siteBgType === "linearGradient") {
                this.siteDesignSettings.background = `linear-gradient(0deg, ${this.siteBgColor2} 0%, ${this.siteBgColor} 100%)`;
            }
            else {
                this.siteDesignSettings.background = this.siteBgColor;
            }
            this.onCustomSettingChanged();
        }
    }
    SiteDesignSettingsController.$inject = ["$http", "SiteInfo", "$rootScope", "$timeout", "$scope"];
    SiteDesignSettingsController.LinearGradientPrefix = "linear-gradient(0deg, #";
    Ally.SiteDesignSettingsController = SiteDesignSettingsController;
    class UpdateDesignSettings {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("siteDesignSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/site-design-settings.html",
    controller: Ally.SiteDesignSettingsController
});

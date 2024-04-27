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
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            console.log("In SiteDesignSettingsController.$onInit");
            if (!this.siteInfo.publicSiteInfo.siteDesignSettingsJson)
                this.siteDesignSettings = Ally.SiteDesignSettings.GetDefault();
            else
                this.siteDesignSettings = JSON.parse(this.siteInfo.publicSiteInfo.siteDesignSettingsJson);
            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;
            // Hook up the file upload control after everything is loaded and setup
            this.$timeout(() => this.hookUpLoginImageUpload(), 200);
        }
        selectPreset(presetName) {
            console.log("in selectPreset", presetName);
            this.siteDesignSettings.presetTemplateName = presetName;
            if (presetName !== "custom") {
                this.siteDesignSettings = Ally.SiteDesignSettings.GetPreset(presetName);
                this.$rootScope.siteDesignSettings = this.siteDesignSettings;
            }
            window.localStorage.setItem(Ally.SiteDesignSettings.SettingsCacheKey, JSON.stringify(this.siteDesignSettings));
            Ally.SiteDesignSettings.ApplySiteDesignSettings(this.siteDesignSettings);
            this.isLoading = true;
            const updateInfo = {
                siteDesignSettingsJson: JSON.stringify(this.siteDesignSettings)
            };
            this.$http.put("/api/Settings/UpdateSiteDesignSettings", updateInfo).then(() => {
                this.isLoading = false;
                this.siteInfo.publicSiteInfo.siteDesignSettingsJson = updateInfo.siteDesignSettingsJson;
            }, (response) => {
                this.isLoading = false;
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
                        //alert( "Failed to upload login image, please let support know if this continues: " + xhr.response().jqXHR.responseJSON.exceptionMessage );
                        //console.log( "Failed to upload document", xhr );
                        //this.$scope.$apply( () => this.isLoading = false );
                    }
                });
            });
        }
    }
    SiteDesignSettingsController.$inject = ["$http", "SiteInfo", "$rootScope", "$timeout", "$scope"];
    Ally.SiteDesignSettingsController = SiteDesignSettingsController;
})(Ally || (Ally = {}));
CA.angularApp.component("siteDesignSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/site-design-settings.html",
    controller: Ally.SiteDesignSettingsController
});

namespace Ally
{
    /**
     * The controller for the site design settings page
     */
    export class SiteDesignSettingsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$rootScope", "$timeout", "$scope"];

        isLoading = false;
        siteDesignSettings: SiteDesignSettings = new SiteDesignSettings();
        previousChangeSiteDesignSettings: SiteDesignSettings;
        loginImageUrl: string;
        customSiteDesignSettingsJson: string;
        isCustomLoaded = false;
        headerBgType: "color" | "classic" | "pink" = "classic";
        headerBgColor: string = "#eee";
        isSaving = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private siteInfo: SiteInfoService,
            private $rootScope: ng.IRootScopeService,
            private $timeout: ng.ITimeoutService,
            private $scope: ng.IScope )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            //console.log( "In SiteDesignSettingsController.$onInit" );

            if( !this.siteInfo.publicSiteInfo.siteDesignSettingsJson )
                this.siteDesignSettings = SiteDesignSettings.GetDefault();
            else
                this.siteDesignSettings = JSON.parse( this.siteInfo.publicSiteInfo.siteDesignSettingsJson );

            this.previousChangeSiteDesignSettings = { ...this.siteDesignSettings };

            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;

            // Hook up the file upload control after everything is loaded and setup
            this.$timeout( () => this.hookUpLoginImageUpload(), 200 );
            
            // Retrieve the custom site design settings
            this.$http.get( "/api/Settings/GetSiteDesignSettings" ).then(
                ( response: ng.IHttpPromiseCallbackArg<UpdateDesignSettings> ) =>
                {
                    this.isLoading = false;
                    this.isCustomLoaded = true;
                    this.customSiteDesignSettingsJson = response.data.customSiteDesignSettingsJson
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to load custom settings: " + response.data.exceptionMessage );
                }
            );
        }


        selectPreset( presetName: "default" | "modern" | "peacefulPink" | "gatedCommunity" | "custom" )
        {
            //console.log( "in selectPreset", presetName );

            this.siteDesignSettings.presetTemplateName = presetName;

            if( presetName !== "custom" )
            {
                this.siteDesignSettings = SiteDesignSettings.GetPreset( presetName );
            }
            else
            {
                this.siteDesignSettings = JSON.parse( this.customSiteDesignSettingsJson );
            }

            this.$rootScope.siteDesignSettings = this.siteDesignSettings;

            window.localStorage.setItem( SiteDesignSettings.SettingsCacheKey, JSON.stringify( this.siteDesignSettings ) );

            if( this.siteDesignSettings.headerBg === SiteDesignSettings.HeaderBgClassic )
                this.headerBgType = "classic";
            else if( this.siteDesignSettings.headerBg === SiteDesignSettings.HeaderBgPink )
                this.headerBgType = "pink";
            else
            {
                this.headerBgType = "color";
                this.headerBgColor = this.siteDesignSettings.headerBg;
            }   

            SiteDesignSettings.ApplySiteDesignSettings( this.siteDesignSettings );
            this.previousChangeSiteDesignSettings = { ...this.siteDesignSettings };

            this.saveSettings();
        }


        saveSettings()
        {
            this.isSaving = true;

            const updateInfo: UpdateDesignSettings = {
                siteDesignSettingsJson: JSON.stringify( this.siteDesignSettings ),
                customSiteDesignSettingsJson: this.customSiteDesignSettingsJson
            };

            this.$http.put( "/api/Settings/UpdateSiteDesignSettings", updateInfo ).then(
                () =>
                {
                    this.isSaving = false;
                    this.siteInfo.publicSiteInfo.siteDesignSettingsJson = updateInfo.siteDesignSettingsJson;
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isSaving = false;
                    alert( "Failed to save: " + response.data.exceptionMessage );
                }
            );
        }


        /**
         * Clear the login image
         */
        removeLoginImage()
        {
            analytics.track( "clearLoginImage" );

            this.isLoading = true;

            this.$http.get( "/api/Settings/ClearLoginImage" ).then(
                () =>
                {
                    this.isLoading = false;
                    this.siteInfo.publicSiteInfo.loginImageUrl = "";
                    this.loginImageUrl = "";

                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to remove loading image: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Initialize the login image JQuery upload control
         */
        hookUpLoginImageUpload()
        {
            $( () =>
            {
                $( '#JQLoginImageFileUploader' ).fileupload( {
                    dropZone: null, // Disable dropping of files
                    pasteZone: null, // Disable paste of data causing a file upload
                    autoUpload: true,
                    add: ( e: any, data: any ) =>
                    {
                        this.$scope.$apply( () =>
                        {
                            this.isLoading = true;
                        } );

                        analytics.track( "setLoginImage" );

                        $( "#FileUploadProgressContainer" ).show();
                        data.url = "api/DocumentUpload/LoginImage";
                        if( this.siteInfo.publicSiteInfo.baseApiUrl )
                            data.url = this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload/LoginImage";

                        const xhr = data.submit();
                        xhr.done( ( result: any ) =>
                        {
                            this.$scope.$apply( () =>
                            {
                                this.isLoading = false;
                                this.loginImageUrl = result.newUrl + "?cacheBreaker=" + new Date().getTime();
                                this.siteInfo.publicSiteInfo.loginImageUrl = this.loginImageUrl;
                            } );

                            $( "#FileUploadProgressContainer" ).hide();
                        } );

                        xhr.error( ( jqXHR: any ) =>
                        {
                            alert( "Upload failed: " + jqXHR.responseJSON.exceptionMessage );
                            //console.log( "fail", jqXHR, textStatus, errorThrown );
                            this.$scope.$apply( () => this.isLoading = false );
                        } );
                    },
                    beforeSend: ( xhr: any ) =>
                    {
                        if( this.siteInfo.publicSiteInfo.baseApiUrl )
                            xhr.setRequestHeader( "Authorization", "Bearer " + this.$rootScope.authToken );
                        else
                            xhr.setRequestHeader( "ApiAuthToken", this.$rootScope.authToken );
                    },
                    progressall: ( e: any, data: any ) =>
                    {
                        const progress = Math.floor( ( data.loaded * 100 ) / data.total );
                        $( '#FileUploadProgressBar' ).css( 'width', progress + '%' );

                        if( progress === 100 )
                            $( "#FileUploadProgressLabel" ).text( "Finalizing Upload..." );
                        else
                            $( "#FileUploadProgressLabel" ).text( progress + "%" );
                    },
                    fail: ( e: any, xhr: any ) =>
                    {
                        //alert( "Failed to upload login image, please let support know if this continues: " + xhr.response().jqXHR.responseJSON.exceptionMessage );
                        //console.log( "Failed to upload document", xhr );

                        //this.$scope.$apply( () => this.isLoading = false );
                    }
                } );
            } );
        }


        /**
         * Occurs when the user changes a set design setting in the custom area
         */
        onCustomSettingChanged()
        {
            //console.log( "onCustomSettingChanged" );

            // If the site is using a preset design and they're about to customize it and they have
            // a saved custom design, then warn them
            if( this.previousChangeSiteDesignSettings.presetTemplateName !== "custom" )
            {
                if( this.customSiteDesignSettingsJson )
                {
                    if( !confirm( "You're about to create a new custom design that will overwrite you're previous custom design. Are you sure you want to make this change?" ) )
                    {
                        this.siteDesignSettings = this.previousChangeSiteDesignSettings;
                        this.$rootScope.siteDesignSettings = this.siteDesignSettings;
                        return;
                    }
                }
            }

            this.siteDesignSettings.presetTemplateName = "custom";
            console.log( "In onCustomSettingChanged", this.siteDesignSettings );

            SiteDesignSettings.ApplySiteDesignSettings( this.siteDesignSettings );

            this.$rootScope.siteDesignSettings = this.siteDesignSettings;

            this.previousChangeSiteDesignSettings = { ...this.siteDesignSettings };
            this.customSiteDesignSettingsJson = JSON.stringify( this.siteDesignSettings );

            this.saveSettings();
        }


        onCustomHeaderBgChanged()
        {
            if( this.headerBgType === "classic" )
            {
                this.siteDesignSettings.headerBg = SiteDesignSettings.HeaderBgClassic;
                this.siteDesignSettings.headerBgSize = "auto 100%";
            }
            else if( this.headerBgType === "pink" )
            {
                this.siteDesignSettings.headerBg = SiteDesignSettings.HeaderBgPink;
                this.siteDesignSettings.headerBgSize = "auto";
            }
            else
            {
                this.siteDesignSettings.headerBg = this.headerBgColor;
                this.siteDesignSettings.headerBgSize = "auto";
            }
            
            this.onCustomSettingChanged();
        }
    }


    class UpdateDesignSettings
    {
        siteDesignSettingsJson: string;
        customSiteDesignSettingsJson: string;
    }
}


CA.angularApp.component( "siteDesignSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/site-design-settings.html",
    controller: Ally.SiteDesignSettingsController
} );
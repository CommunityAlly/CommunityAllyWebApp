declare var appVer: number; // Defined in index.html


namespace Ally
{
    export class BaseSiteSettings
    {
        backgroundImageFiles: string[];
        bgImageFileName: string;
        siteTitle: string;
        fullName: string;
        welcomeMessage: string;

        premiumPlanExpirationDate: Date;
        premiumPlanIsAutoRenewed: boolean;
        premiumPlanCostDollars: number;
    }


    /**
     * Represents settings for a Condo, HOA, or Neighborhood Ally site
     */
    export class ChtnSiteSettings extends BaseSiteSettings
    {
        allowOwnersToSendEmail: boolean;
        allowRentersToSendEmail: boolean;
        homeRightColumnType: string;
        rentersCanViewDocs: boolean;
        canHideContactInfo: boolean;
        isDiscussionEmailGroupEnabled: boolean;
        whoCanCreateDiscussionThreads: string;
        hasStripeAchAccount: string;
        stripeAchAccountBankHint: string;
        ptaUnitId: number;
    }


    /**
     * The controller for the page to view group site settings
     */
    export class ChtnSettingsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$timeout", "$scope", "$rootScope"];

        settings: ChtnSiteSettings = new ChtnSiteSettings();
        originalSettings: ChtnSiteSettings = new ChtnSiteSettings();
        defaultBGImage: string;
        shouldShowQaButton: boolean;
        loginImageUrl: string;
        isLoading: boolean = false;
        showRightColumnSetting: boolean = true;
        showLocalNewsSetting: boolean = false;
        isPta: boolean = false;
        frontEndVersion: string;
        welcomeRichEditorElem: JQuery;
        shouldShowWelcomeTooLongError: boolean = false;
        tinyMceEditor: ITinyMce;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private $timeout: ng.ITimeoutService,
            private $scope: ng.IScope,
            private $rootScope: ng.IRootScopeService )
        {
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            this.frontEndVersion = appVer.toString();

            this.defaultBGImage = $( document.documentElement ).css( "background-image" );

            this.shouldShowQaButton = this.siteInfo.userInfo.emailAddress === "president@mycondoally.com" || this.siteInfo.userInfo.userId === "219eb985-613b-4fc0-a523-7474adb706bd";

            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;

            this.showRightColumnSetting = this.siteInfo.privateSiteInfo.creationDate < Ally.SiteInfoService.AlwaysDiscussDate;
            this.showLocalNewsSetting = !this.showRightColumnSetting;

            this.isPta = AppConfig.appShortName === "pta";

            // Hook up the file upload control after everything is loaded and setup
            this.$timeout( () => this.hookUpLoginImageUpload(), 200 );

            this.refreshData();
        }


        /**
         * Populate the page from the server
         */
        refreshData()
        {
            this.isLoading = true;
            
            this.$http.get( "/api/Settings" ).then( ( response: ng.IHttpPromiseCallbackArg<ChtnSiteSettings> ) =>
            {
                this.isLoading = false;
                this.settings = response.data;
                this.originalSettings = _.clone( response.data );

                if( !this.tinyMceEditor )
                {
                    const tinyMceOpts = {
                        menubar: "edit format table",
                        toolbar: "styleselect | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link | checklist code formatpainter table"
                    };

                    HtmlUtil2.initTinyMce( "tiny-mce-editor", 400, tinyMceOpts ).then( e =>
                    {
                        this.tinyMceEditor = e;
                        this.tinyMceEditor.setContent( this.settings.welcomeMessage );
                        this.tinyMceEditor.on( "keyup", () =>
                        {
                            // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                            this.$scope.$apply( () =>
                            {
                                this.onWelcomeMessageEdit();
                            } );
                        } );
                    } );
                }
            } );
        }


        /**
         * Clear the login image
         */
        removeLoginImage()
        {
            analytics.track( "clearLoginImage" );

            this.isLoading = true;

            this.$http.get( "/api/Settings/ClearLoginImage" ).then( () =>
            {
                this.isLoading = false;
                this.siteInfo.publicSiteInfo.loginImageUrl = "";
                this.loginImageUrl = "";                

            }, ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to remove loading image: " + httpResponse.data.exceptionMessage );
            } );
        }


        /**
         * Save all of the settings
         */
        saveAllSettings()
        {
            analytics.track( "editSettings" );

            this.settings.welcomeMessage = this.tinyMceEditor.getContent();
            
            this.isLoading = true;
            
            this.$http.put( "/api/Settings", this.settings ).then(
                () =>
                {
                    this.isLoading = false;

                    // Update the locally-stored values
                    this.siteInfo.privateSiteInfo.homeRightColumnType = this.settings.homeRightColumnType;
                    this.siteInfo.privateSiteInfo.welcomeMessage = this.settings.welcomeMessage;
                    this.siteInfo.privateSiteInfo.ptaUnitId = this.settings.ptaUnitId;

                    const didChangeFullName = this.settings.fullName !== this.originalSettings.fullName;

                    // Reload the page to show the page title has changed
                    if( didChangeFullName )
                        location.reload();

                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to save: " + response.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user clicks a new background image
         */
        onImageClick( bgImage: string )
        {
            this.settings.bgImageFileName = bgImage;
            //SettingsJS._defaultBG = bgImage;

            this.$http.put( "/api/Settings", { BGImageFileName: this.settings.bgImageFileName } ).then( () =>
            {
                $( ".test-bg-image" ).removeClass( "test-bg-image-selected" );

                //$( "img[src='" + $rootScope.bgImagePath + bgImage + "']" ).addClass( "test-bg-image-selected" );

                this.isLoading = false;

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to save: " + response.data );
            } );
        }


        onImageHoverOver( bgImage: string )
        {
            //$( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + bgImage + ")" );
        }


        onImageHoverOut()
        {
            //if( typeof ( this.settings.bgImageFileName ) === "string" && this.settings.bgImageFileName.length > 0 )
            //    $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + this.settings.bgImageFileName + ")" );
            //else
            //    $( document.documentElement ).css( "background-image", this.defaultBGImage );
        }


        onQaDeleteSite()
        {
            this.$http.get( "/api/QA/DeleteThisAssociation" ).then( function()
            {
                location.reload();
            }, function( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> )
                {
                    alert( "Failed to delete site: " + httpResponse.data.exceptionMessage );
                } );
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
                        const progress = Math.floor(( data.loaded * 100 ) / data.total );
                        $( '#FileUploadProgressBar' ).css( 'width', progress + '%' );

                        if( progress === 100 )
                            $( "#FileUploadProgressLabel" ).text( "Finalizing Upload..." );
                        else
                            $( "#FileUploadProgressLabel" ).text( progress + "%" );
                    }
                } );
            } );
        }


        /**
         * Occurs when the user clicks the link to force refresh the page
         */
        forceRefresh()
        {
            window.location.reload( true );
        }

        onWelcomeMessageEdit()
        {
            const MaxWelcomeLength = 10000;
            const welcomeHtml = this.tinyMceEditor.getContent();
            this.shouldShowWelcomeTooLongError = welcomeHtml.length > MaxWelcomeLength;
        }
    }
}


CA.angularApp.component( "chtnSiteSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/site-settings.html",
    controller: Ally.ChtnSettingsController
} );
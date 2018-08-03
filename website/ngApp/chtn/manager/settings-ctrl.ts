namespace Ally
{
    export class BaseSiteSettings
    {
        backgroundImageFiles: string[];
        bgImageFileName: string;
        siteTitle: string;
        fullName: string;
        welcomeMessage: string;
    }


    /**
     * Represents settings for a Condo, HOA, or Neighborhood Ally site
     */
    export class CondoSiteSettings extends BaseSiteSettings
    {
        allowOwnersToSendEmail: boolean;
        allowRentersToSendEmail: boolean;
        homeRightColumnType: string;
        rentersCanViewDocs: boolean;
        canHideContactInfo: boolean;
        isDiscussionEmailGroupEnabled: boolean;
    }


    /**
     * The controller for the page to view group site settings
     */
    export class ChtnSettingsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$timeout", "$scope"];

        settings: CondoSiteSettings = new CondoSiteSettings();
        defaultBGImage: string;
        showQaButton: boolean;
        loginImageUrl: string;
        isLoading: boolean;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $timeout: ng.ITimeoutService, private $scope: ng.IScope )
        {
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            this.defaultBGImage = $( document.documentElement ).css( "background-image" );

            this.showQaButton = this.siteInfo.userInfo.emailAddress === "president@mycondoally.com";

            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;

            // Hook up the file upload control after everything is loaded and setup
            var innerThis = this;
            this.$timeout(() => innerThis.hookUpFileUpload(), 200 );

            this.refreshData();
        }


        /**
         * Populate the page from the server
         */
        refreshData()
        {
            this.isLoading = true;

            var innerThis = this;
            this.$http.get( "/api/Settings" ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<CondoSiteSettings> )
            {
                innerThis.isLoading = false;
                innerThis.settings = httpResponse.data;
            } );
        }


        /**
         * Clear the login image
         */
        removeLoginImage()
        {
            analytics.track( "clearLoginImage" );

            this.isLoading = true;

            var innerThis = this;
            this.$http.get( "/api/Settings/ClearLoginImage" ).then( function()
            {
                innerThis.isLoading = false;
                innerThis.siteInfo.publicSiteInfo.loginImageUrl = "";
                innerThis.loginImageUrl = "";                

            }, function( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> )
            {
                innerThis.isLoading = false;
                alert( "Failed to remove loading image: " + httpResponse.data.exceptionMessage );
            } );
        }


        /**
         * Save all of the settings
         */
        saveSettings( shouldReload: boolean = false )
        {
            analytics.track( "editSettings" );

            this.isLoading = true;

            this.$http.put( "/api/Settings", this.settings ).then( () =>
            {
                this.isLoading = false;
                this.siteInfo.privateSiteInfo.homeRightColumnType = this.settings.homeRightColumnType;

                // Reload the page to show the page title has changed
                if( shouldReload )
                    location.reload();
            } );
        }


        /**
         * Occurs when the user wants to save a new site title
         */
        onSiteTitleChange()
        {
            analytics.track( "editSiteTitle" );

            this.isLoading = true;

            var innerThis = this;
            this.$http.put( "/api/Settings", { siteTitle: this.settings.siteTitle } ).then( function()
            {
                // Reload the page to show the page title has changed
                location.reload();
            } );
        }


        /**
         * Occurs when the user wants to save a new welcome message
         */
        onWelcomeMessageUpdate()
        {
            analytics.track( "editWelcomeMessage" );

            this.isLoading = true;

            var innerThis = this;
            this.$http.put( "/api/Settings", { welcomeMessage: this.settings.welcomeMessage } ).then( function()
            {
                innerThis.isLoading = false;
                innerThis.siteInfo.privateSiteInfo.welcomeMessage = innerThis.settings.welcomeMessage;
            } );
        }


        /**
         * Occurs when the user clicks a new background image
         */
        onImageClick( bgImage: string )
        {
            this.settings.bgImageFileName = bgImage;
            //SettingsJS._defaultBG = bgImage;

            var innerThis = this;
            this.$http.put( "/api/Settings", { BGImageFileName: this.settings.bgImageFileName } ).then( function()
            {
                $( ".test-bg-image" ).removeClass( "test-bg-image-selected" );

                //$( "img[src='" + $rootScope.bgImagePath + bgImage + "']" ).addClass( "test-bg-image-selected" );

                innerThis.isLoading = false;
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
         * Hooked up the login image JQuery upload control
         */
        hookUpFileUpload()
        {
            var innerThis = this;

            $( function()
            {
                $( '#JQFileUploader' ).fileupload( {
                    autoUpload: true,
                    add: function( e: any, data: any )
                    {
                        innerThis.$scope.$apply( function()
                        {
                            this.isLoading = true;
                        } );

                        analytics.track( "setLoginImage" );

                        $( "#FileUploadProgressContainer" ).show();
                        data.url = "api/DocumentUpload/LoginImage?ApiAuthToken=" + innerThis.siteInfo.authToken;

                        var xhr = data.submit();
                        xhr.done( function( result: any )
                        {
                            innerThis.$scope.$apply( function()
                            {
                                innerThis.isLoading = false;
                                innerThis.loginImageUrl = result.newUrl + "?cacheBreaker=" + new Date().getTime();
                                innerThis.siteInfo.publicSiteInfo.loginImageUrl = this.loginImageUrl;
                            } );

                            $( "#FileUploadProgressContainer" ).hide();
                        } );
                    },
                    progressall: function( e: any, data: any )
                    {
                        var progress = Math.floor(( data.loaded * 100 ) / data.total );
                        $( '#FileUploadProgressBar' ).css( 'width', progress + '%' );

                        if( progress === 100 )
                            $( "#FileUploadProgressLabel" ).text( "Finalizing Upload..." );
                        else
                            $( "#FileUploadProgressLabel" ).text( progress + "%" );
                    }
                } );
            } );
        }
    }
}


CA.angularApp.component( "chtnSettings", {
    templateUrl: "/ngApp/chtn/manager/settings.html",
    controller: Ally.ChtnSettingsController
} );
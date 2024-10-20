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
        hasStripePremiumPendingAchAccount: boolean;
        nonAdminCanAddVendors: boolean;
    }


    /**
     * The controller for the page to view group site settings
     */
    export class ChtnSettingsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$scope", "$rootScope"];

        settings: ChtnSiteSettings = new ChtnSiteSettings();
        originalSettings: ChtnSiteSettings = new ChtnSiteSettings();
        defaultBGImage: string;
        shouldShowQaButton: boolean;
        isLoading: boolean = false;
        showRightColumnSetting = true;
        isPta: boolean = false;
        frontEndVersion: string;
        welcomeRichEditorElem: JQuery;
        shouldShowWelcomeTooLongError: boolean = false;
        tinyMceEditor: ITinyMce;
        tinyMceDidNotLoad = false;
        newRightShouldShowBulletinOption = false;
        newRightIsLocalNewsEnabled = false;
        newRightIsBulletinBoardEnabled = false;
        //static readonly MovedLoginImageDate = new Date( 2024, 3, 25 ); // Groups created after April 24, 2024 always have discussion enabled


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
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

            this.showRightColumnSetting = this.siteInfo.privateSiteInfo.creationDate < Ally.SiteInfoService.AlwaysDiscussDate;
            this.newRightShouldShowBulletinOption =  this.siteInfo.privateSiteInfo.creationDate >= Ally.SiteInfoService.AlwaysDiscussDate
                && this.siteInfo.privateSiteInfo.creationDate < Ally.SiteInfoService.AlwaysBulletinBoardDate;
            this.newRightIsLocalNewsEnabled = this.siteInfo.privateSiteInfo.homeRightColumnType && this.siteInfo.privateSiteInfo.homeRightColumnType.includes( "localnews" );
            this.newRightIsBulletinBoardEnabled = this.siteInfo.privateSiteInfo.homeRightColumnType && this.siteInfo.privateSiteInfo.homeRightColumnType.includes( "bulletinboard" );
            this.isPta = AppConfig.appShortName === "pta";

            this.refreshData();
        }


        /**
         * Populate the page from the server
         */
        refreshData()
        {
            this.isLoading = true;
            
            this.$http.get( "/api/Settings/GetSiteSettings" ).then( ( response: ng.IHttpPromiseCallbackArg<ChtnSiteSettings> ) =>
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

                        if( this.tinyMceEditor )
                        {
                            if( this.settings.welcomeMessage )
                                this.tinyMceEditor.setContent( this.settings.welcomeMessage );

                            this.tinyMceEditor.on( "keyup", () =>
                            {
                                // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                                this.$scope.$apply( () =>
                                {
                                    this.onWelcomeMessageEdit();
                                } );
                            } );
                        }
                        else
                            this.tinyMceDidNotLoad = true;
                    } );
                }
            } );
        }


        static isEmptyHtml( testHtml: string )
        {
            if( HtmlUtil.isNullOrWhitespace( testHtml ) )
                return true;

            testHtml = testHtml.replaceAll( "<p>", "" );
            testHtml = testHtml.replaceAll( "&nbsp;", "" );
            testHtml = testHtml.replaceAll( "</p>", "" );

            return HtmlUtil.isNullOrWhitespace( testHtml );
        }


        /**
         * Save all of the settings
         */
        saveAllSettings()
        {
            analytics.track( "editSettings" );

            this.settings.welcomeMessage = this.tinyMceEditor.getContent();
            
            this.isLoading = true;
            
            this.$http.put( "/api/Settings/UpdateSiteSettings", this.settings ).then(
                () =>
                {
                    this.isLoading = false;

                    // Update the locally-stored values
                    this.siteInfo.privateSiteInfo.homeRightColumnType = this.settings.homeRightColumnType;
                    this.siteInfo.privateSiteInfo.welcomeMessage = this.settings.welcomeMessage;
                    if( ChtnSettingsController.isEmptyHtml( this.siteInfo.privateSiteInfo.welcomeMessage ) )
                        this.siteInfo.privateSiteInfo.welcomeMessage = null;
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

            this.$http.put( "/api/Settings/NOTUSED", { BGImageFileName: this.settings.bgImageFileName } ).then( () =>
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
         * Occurs when the user clicks the link to force refresh the page
         */
        forceRefresh()
        {
            window.location.reload();
        }


        onWelcomeMessageEdit()
        {
            const MaxWelcomeLength = 10000;
            const welcomeHtml = this.tinyMceEditor.getContent();
            this.shouldShowWelcomeTooLongError = welcomeHtml.length > MaxWelcomeLength;
        }


        onRightSettingChange()
        {
            this.settings.homeRightColumnType = "";

            if( this.newRightIsLocalNewsEnabled )
                this.settings.homeRightColumnType = "localnews";

            if( this.newRightIsBulletinBoardEnabled )
            {
                if( this.settings.homeRightColumnType )
                    this.settings.homeRightColumnType += ",";

                this.settings.homeRightColumnType += "bulletinboard";
            }
            console.log( "homeRightColumnType", this.settings.homeRightColumnType );
        }
    }
}


CA.angularApp.component( "chtnSiteSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/site-settings.html",
    controller: Ally.ChtnSettingsController
} );
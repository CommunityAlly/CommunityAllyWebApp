declare var appVer: number;


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
        showQaButton: boolean;
        loginImageUrl: string;
        isLoading: boolean = false;;
        isLoadingPremiumPlanInfo: boolean = false;
        showRightColumnSetting: boolean = true;
        showLocalNewsSetting: boolean = false;
        isPta: boolean = false;
        frontEndVersion: string;
        shouldShowPremiumPlanSection: boolean = true;
        homeNamePlural: string;
        isPremiumPlanActive: boolean;
        premiumPlanRenewDate: Date;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private $timeout: ng.ITimeoutService,
            private $scope: ng.IScope,
            private $rootScope: ng.IRootScopeService )
        {
            this.shouldShowPremiumPlanSection = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            this.homeNamePlural = AppConfig.homeName.toLowerCase() + "s";
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            this.frontEndVersion = appVer.toString();

            this.defaultBGImage = $( document.documentElement ).css( "background-image" );

            this.showQaButton = this.siteInfo.userInfo.emailAddress === "president@mycondoally.com";

            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;

            this.showRightColumnSetting = this.siteInfo.privateSiteInfo.creationDate < Ally.SiteInfoService.AlwaysDiscussDate;
            this.showLocalNewsSetting = !this.showRightColumnSetting;

            this.isPta = AppConfig.appShortName === "pta";

            // Hook up the file upload control after everything is loaded and setup
            this.$timeout( () => this.hookUpLoginImageUpload(), 200 );

            this.refreshData();
        }


        /**
         * Occurs when the user clicks the button to cancel the premium plan auto-renewal
         */
        cancelPremiumAutoRenew()
        {
            this.isLoadingPremiumPlanInfo = true;

            this.$http.put( "/api/Settings/CancelPremium", null ).then(
                ( response: ng.IHttpPromiseCallbackArg<ChtnSiteSettings> ) =>
                {
                    this.isLoadingPremiumPlanInfo = false;
                    this.settings.premiumPlanIsAutoRenewed = false;
                },
                () =>
                {
                    this.isLoadingPremiumPlanInfo = false;
                    alert( "Failed to cancel the premium plan. Refresh the page and try again or contact support if the problem persists." );
                }
            );
        }


        /**
         * Occurs when the user clicks the button to enable premium plan auto-renewal
         */
        activatePremiumRenewal()
        {
            //if( this.numPaperLettersToSend === 0 )
            //{
            //    if( this.numEmailsToSend === 0 )
            //        alert( "No e-mails or paper letters selected to send." );
            //    else
            //        this.submitFullMailingAfterCharge();

            //    return;
            //}

            this.isLoadingPremiumPlanInfo = true;

            this.$http.put( "/api/Settings/ActivatePremium", null ).then(
                ( response: ng.IHttpPromiseCallbackArg<ChtnSiteSettings> ) =>
                {
                    this.isLoadingPremiumPlanInfo = false;
                    this.settings.premiumPlanIsAutoRenewed = true;
                },
                () =>
                {
                    this.isLoadingPremiumPlanInfo = false;
                    alert( "Failed to cancel the premium plan. Refresh the page and try again or contact support if the problem persists." );
                }
            );

            return;

            //let stripeKey = "pk_test_FqHruhswHdrYCl4t0zLrUHXK";
            let stripeKey = "pk_live_fV2yERkfAyzoO9oWSfORh5iH";

            let checkoutHandler = StripeCheckout.configure( {
                key: stripeKey,
                image: '/assets/images/icons/Icon-144.png',
                locale: 'auto',
                email: this.siteInfo.userInfo.emailAddress,
                token: ( token: any ) =>
                {
                    // You can access the token ID with `token.id`.
                    // Get the token ID to your server-side code for use.
                    //this.fullMailingInfo.stripeToken = token.id;

                    //this.submitFullMailingAfterCharge();
                }
            } );

            this.isLoadingPremiumPlanInfo = true;

            // Open Checkout with further options:
            checkoutHandler.open( {
                name: 'Community Ally',
                description: `Premium Plan`,
                zipCode: true,
                amount: this.settings.premiumPlanCostDollars * 100 // Stripe uses cents
            } );

            // Close Checkout on page navigation:
            window.addEventListener( 'popstate', function ()
            {
                checkoutHandler.close();
            } );
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

                this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
                this.premiumPlanRenewDate = new Date();
                this.premiumPlanRenewDate.setDate( this.settings.premiumPlanExpirationDate.getDate() + 1 );
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

            this.isLoading = true;
            
            this.$http.put( "/api/Settings", this.settings ).then( () =>
            {
                this.isLoading = false;

                // Update the locally-stored values
                this.siteInfo.privateSiteInfo.homeRightColumnType = this.settings.homeRightColumnType;
                this.siteInfo.privateSiteInfo.welcomeMessage = this.settings.welcomeMessage;
                this.siteInfo.privateSiteInfo.ptaUnitId = this.settings.ptaUnitId;
                
                var didChangeFullName = this.settings.fullName !== this.originalSettings.fullName;

                // Reload the page to show the page title has changed
                if( didChangeFullName )
                    location.reload();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to save: " + response.data );
            } );
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

                        var xhr = data.submit();
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


        /**
         * Occurs when the user clicks the link to force refresh the page
         */
        forceRefresh()
        {
            window.location.reload( true );
        }
    }
}


CA.angularApp.component( "chtnSettings", {
    templateUrl: "/ngApp/chtn/manager/settings.html",
    controller: Ally.ChtnSettingsController
} );
declare var AppConfig: any;
declare var PeriodicPaymentFrequencies: any[];
declare var $zopim: any;
declare var analytics: any;
declare var OverrideBaseApiPath: string;
declare function GlobalRedirect( path: string ): void;

namespace Ally
{
    /**
     * The logged-in user's info
     */
    export class UserInfo
    {
        emailAddress: string;
        userId: string;
        firstName: string;
        lastName: string;
        isSiteManager: boolean;
        isAdmin: boolean;
        acceptedTermsDate: Date;
        fullName: string;
        lastLoginDateUtc: Date;
        postmarkReportedBadEmailUtc: Date;

        boardPosition: string;
        assessmentPaymentHistory: string[];
        assessmentAmount: number;
        isRenter: boolean;
        usersUnits: any[];
        recentPayments: any[];
        isAutoPayActive: boolean;
        nextAutoPayText: string;
    }


    /**
     * Represents the group descriptive information that can only be accessed by a member of the
     * group
     */
    export class PrivateSiteInfo
    {
        /** The "ISO Alpha-2" 2 character country code */
        country: string;
        groupAddress: any;
        welcomeMessage: string;
        gpsPosition: any;
    }


    /**
     * Represents the descriptive information for a CHTN group (condo, HOA, townhome, neighborhood)
     */
    export class ChtnPrivateSiteInfo extends PrivateSiteInfo
    {
        isPaymentEnabled: boolean;
        payerPaysAchFee: boolean;
        payerPaysCCFee: string;
        numUnits: number;
        isLargeGroup: boolean;
        hasAssessments: boolean;
        assessmentFrequency: any;
        isPeriodicPaymentTrackingEnabled: boolean;
        homeRightColumnType: string;
        siteLaunchedDateUtc: Date;
        rentersCanViewDocs: boolean;
        canHideContactInfo: boolean;


        // Not from the server
        googleGpsPosition: google.maps.LatLng;
    }


    /**
     * The current group's site information
     */
    export class SiteInfoService
    {
        publicSiteInfo: any = {};
        privateSiteInfo: ChtnPrivateSiteInfo = new ChtnPrivateSiteInfo();
        userInfo: UserInfo = new Ally.UserInfo();
        isLoggedIn: boolean = false;
        xdLocalStorage: any;
        _rootScope: ng.IRootScopeService;
        authToken: string;


        // Retrieve the basic information for the current site
        refreshSiteInfo( $rootScope: ng.IRootScopeService, $http: ng.IHttpService, $q: ng.IQService )
        {
            this._rootScope = $rootScope;

            var deferred = $q.defer();

            $rootScope.isLoadingSite = true;

            var innerThis = this;


            var onSiteInfoReceived = ( siteInfo: any ) =>
            {
                $rootScope.isLoadingSite = false;

                innerThis.handleSiteInfo( siteInfo, $rootScope );

                deferred.resolve();
            };

            var onRequestFailed = () =>
            {
                $rootScope.isLoadingSite = false;
                deferred.reject();
            };


            // Retrieve information for the current association
            $http.get( "/api/GroupSite" ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<any> )
            {
                // If we received data but the user isn't logged-in
                if( httpResponse.data && !httpResponse.data.userInfo )
                {
                    // Check the cross-domain localStorage for an auth token
                    innerThis.xdLocalStorage.getItem("allyApiAuthToken").then( function( response:any )
                    {
                        // If we received an auth token then retry accessing the group data
                        if( response && HtmlUtil.isValidString( response.value ) )
                        {
                            //console.log( "Received cross domain token:" + response.value );
                            innerThis.setAuthToken( response.value );

                            $http.get( "/api/GroupSite" ).then(( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                            {
                                onSiteInfoReceived( httpResponse.data );
                            }, onRequestFailed );
                        }
                        // Otherwise just handle what we received
                        else
                            onSiteInfoReceived( httpResponse.data );

                    }, function()
                    {
                        // We failed to get a cross domain token so continue on with what we received
                        onSiteInfoReceived( httpResponse.data );
                    });
                    
                }
                else
                    onSiteInfoReceived( httpResponse.data );

            }, onRequestFailed );

            return deferred.promise;
        };


        // Returns if a page is for a neutral (public, no login required) page
        testIfIsNeutralPage( locationHash: string )
        {
            // We only care about Angular paths
            var HashPrefix = "#!/";
            if( !HtmlUtil.startsWith( locationHash, HashPrefix ) )
                return false;

            // Remove that prefix and add a slash as that's what the menu item stores
            locationHash = "/" + locationHash.substring( HashPrefix.length );

            var menuItem = _.find( AppConfig.menu, ( menuItem: any ) => menuItem.path === locationHash );

            return typeof ( menuItem ) === "object";
        };


        // Log-in and application start both retrieve information about the current association's site.
        // This function should be used to properly populate the scope with the information.
        handleSiteInfo( siteInfo: any, $rootScope: ng.IRootScopeService )
        {
            var subdomain = HtmlUtil.getSubdomain( window.location.host );

            if( !this.authToken && $rootScope.authToken )
                this.setAuthToken( $rootScope.authToken );

            // If we're at an unknown subdomain
            if( siteInfo === null || siteInfo === "null" )
            {
                // Allow the user to log-in with no subdomain, create a temp site info object
                var isNeutralSubdomain = subdomain === null || subdomain === "www" || subdomain === "login";
                var isNeutralPage = this.testIfIsNeutralPage( window.location.hash );

                if( isNeutralSubdomain && isNeutralPage )
                {
                    // Create a default object used to populate a site
                    siteInfo = {};
                    siteInfo.publicSiteInfo =
                        {
                            bgImagePath: "",
                            fullName: AppConfig.appName,
                            //siteLogo: "<span style='font-size: 22pt; color: #FFF;'>Welcome to <a style='color:#a3e0ff; text-decoration: underline;' href='https://" + AppConfig.baseTld + "'>" + AppConfig.appName + "</a></span>"
                            siteLogo: "<span style='font-size: 22pt; color: #FFF;'>Welcome to " + AppConfig.appName + "</span>"
                        };
                }
                // Otherwise we are at an unknown, non-neutral subdomain so get back to safety!
                else
                {
                    // Go to generic login                
                    GlobalRedirect( "https://login." + AppConfig.baseTld + "/#!/Login" );
                    return;
                }
            }

            // Store the site info to the root scope for access by the app module
            $rootScope.publicSiteInfo = siteInfo.publicSiteInfo;
            this.publicSiteInfo = siteInfo.publicSiteInfo;

            // Handle private (logged-in only) info
            var privateSiteInfo = siteInfo.privateSiteInfo;
            if( !privateSiteInfo )
                privateSiteInfo = {};

            if( privateSiteInfo.gpsPosition && typeof ( google ) !== "undefined" )
                privateSiteInfo.googleGpsPosition = new google.maps.LatLng( privateSiteInfo.gpsPosition.lat, privateSiteInfo.gpsPosition.lon );

            this.privateSiteInfo = privateSiteInfo;

            // Set the site title
            document.title = this.publicSiteInfo.fullName;

            this.userInfo = siteInfo.userInfo;
            $rootScope.userInfo = siteInfo.userInfo;

            if( HtmlUtil.isLocalStorageAllowed() )
                window.localStorage.setItem( "siteInfo", angular.toJson( this.publicSiteInfo ) );

            // If the user is logged-in
            this.isLoggedIn = $rootScope.userInfo !== null && $rootScope.userInfo !== undefined;
            $rootScope.isLoggedIn = this.isLoggedIn;

            if( this.isLoggedIn )
            {
                if( typeof ( $zopim ) !== "undefined" )
                {
                    $zopim( function()
                    {
                        $zopim.livechat.setName( $rootScope.userInfo.firstName + " " + $rootScope.userInfo.lastName );

                        if( $rootScope.userInfo.emailAddress.indexOf( "@" ) !== -1 )
                            $zopim.livechat.setEmail( $rootScope.userInfo.emailAddress );
                    } );
                }

                $rootScope.isAdmin = $rootScope.userInfo.isAdmin;
                $rootScope.isSiteManager = $rootScope.userInfo.isSiteManager;

                // Tell Segment we know who the user is
                if( typeof ( analytics ) !== "undefined" )
                {
                    analytics.identify( $rootScope.userInfo.emailAddress, {
                        name: $rootScope.userInfo.fullName
                    } );
                }
            }
            // Otherwise the user is not logged-in
            else
            {
                $rootScope.userInfo = null;

                // If we're not at the log-in page, the get us there
                var LoginPath = "#!/Login";
                if( window.location.hash != LoginPath && !AppConfig.isPublicRoute( window.location.hash ) )
                {
                    // If we're at a valid subdomain
                    if( this.publicSiteInfo && this.publicSiteInfo.baseUrl )
                    {
                        // Need to set the hash "manually" as $location is not available in the config
                        // block and GlobalRedirect will go to the wrong TLD when working locally
                        window.location.hash = LoginPath;
                        //$location.path( "/Login" );
                        //GlobalRedirect( this.publicSiteInfo.baseUrl + loginPath );
                    }
                    else
                        GlobalRedirect( AppConfig.baseUrl + LoginPath );
                }
            }

            // Update the background
            if( !HtmlUtil.isNullOrWhitespace( this.publicSiteInfo.bgImagePath ) )
                $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + this.publicSiteInfo.bgImagePath + ")" );

            // If we need to redirect
            if( this.publicSiteInfo.baseUrl )
            {
                if( ( subdomain === null || subdomain !== this.publicSiteInfo.shortName )
                    && HtmlUtil.isNullOrWhitespace( OverrideBaseApiPath ) )
                {
                    GlobalRedirect( this.publicSiteInfo.baseUrl + "/#!/Home" );
                }
            }
        }


        setAuthToken( authToken: string )
        {
            if( window.localStorage )
                window.localStorage.setItem( "ApiAuthToken", authToken );

            this._rootScope.authToken = authToken;

            this.xdLocalStorage.setItem( "allyApiAuthToken", authToken ).then( function( response: any )
            {
                //console.log( "Set cross domain auth token" );
            } );

            this.authToken = authToken;

            //appCacheService.clear( appCacheService.Key_AfterLoginRedirect );
        }
    }


    export class SiteInfoHelper
    {
        public static loginInit( $q: ng.IQService, $http: ng.IHttpService, $rootScope: ng.IRootScopeService, $sce: ng.ISCEService, xdLocalStorage: any ): ng.IPromise<SiteInfoService>
        {
            var deferred = $q.defer<SiteInfoService>();

            SiteInfoProvider.siteInfo.xdLocalStorage = xdLocalStorage;
            
            if( SiteInfoProvider.isSiteInfoLoaded )
            {
                deferred.resolve( SiteInfoProvider.siteInfo );
            }
            else
            {
                SiteInfoProvider.siteInfo.refreshSiteInfo( $rootScope, $http, $q ).then( function()
                {
                    SiteInfoProvider.isSiteInfoLoaded = true;

                    // Used to control the loading indicator on the site
                    $rootScope.isSiteInfoLoaded = true;

                    $rootScope.siteTitle = {
                        text: $rootScope.publicSiteInfo.siteTitleText
                    };

                    // The logo contains markup so use sce to display HTML content
                    if( $rootScope.publicSiteInfo.siteLogo )
                        $rootScope.siteTitle.logoHtml = $sce.trustAsHtml( $rootScope.publicSiteInfo.siteLogo );

                    //$rootScope.siteTitleText = $rootScope.publicSiteInfo.siteTitleText;

                    // Occurs when the user saves changes to the site title
                    $rootScope.onUpdateSiteTitleText = function()
                    {
                        analytics.track( "updateSiteTitle" );

                        $http.put( "/api/Settings", { siteTitle: $rootScope.siteTitle.text } );
                    };

                    deferred.resolve( SiteInfoProvider.siteInfo );
                } );
            }

            return deferred.promise;
        };
    }


    export class SiteInfoProvider implements ng.IServiceProvider
    {
        public static isSiteInfoLoaded = false;

        // Use statics because this class is used to resolve the route before the Angular app is
        // allowed to run
        public static siteInfo = new Ally.SiteInfoService();
        
        public $get() : SiteInfoService
        {
            if( !SiteInfoProvider.isSiteInfoLoaded )
                alert( "Not yet loaded!" );

            return SiteInfoProvider.siteInfo;
        }
    }
}

angular.module( 'CondoAlly' ).provider( "SiteInfo", Ally.SiteInfoProvider );


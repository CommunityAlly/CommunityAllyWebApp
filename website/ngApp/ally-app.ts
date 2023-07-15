// DEVLOCAL - Specify your group's API path to make all API requests to the live server, regardless
// of the local URL. This is useful when developing locally.
var OverrideBaseApiPath: string = null; // Should be something like "https://1234.webappapi.communityally.org/api/"
var OverrideOriginalUrl: string = null; // Should be something like "https://example.condoally.com/" or "https://example.hoaally.org/"

//OverrideBaseApiPath = "https://28.webappapi.communityally.org/api/";
//OverrideBaseApiPath = "https://7478.webappapi.mycommunityally.org/api/";
//OverrideOriginalUrl = "https://qa.condoally.com/";





// Values defined in app-config.js, used in generating the site menu
declare var Role_All: string;
declare var Role_Authorized: string;
declare var Role_Manager: string;
declare var Role_Admin: string;

//const StripeApiKey = "pk_test_FqHruhswHdrYCl4t0zLrUHXK";
const StripeApiKey = "pk_live_fV2yERkfAyzoO9oWSfORh5iH";

CA.angularApp.config(
    ['$routeProvider', '$httpProvider', '$provide', "SiteInfoProvider", "$locationProvider",
    function( $routeProvider: ng.route.IRouteProvider,
        $httpProvider: ng.IHttpProvider,
        $provide: ng.auto.IProvideService,
        siteInfoProvider: Ally.SiteInfoProvider,
        $locationProvider: ng.ILocationProvider )
{
    $locationProvider.hashPrefix( '!' );

    const isLoginRequired = function( $location: ng.ILocationService, $q: ng.IQService, siteInfo: Ally.SiteInfoService, appCacheService: AppCacheService )
    {
        const deferred = $q.defer();

        // We have no user information so they must login
        const isPublicHash = $location.path() === "/Home" || $location.path() === "/Login" || AppConfig.isPublicRoute( $location.path() );
        if( !siteInfo.userInfo && !isPublicHash )
        {
            // Home, the default page, and login don't need special redirection or user messaging
            if( $location.path() !== "/Home" || $location.path() !== "/Login" )
            {
                appCacheService.set( AppCacheService.Key_AfterLoginRedirect, $location.path() );
                appCacheService.set( AppCacheService.Key_WasLoggedIn401, "true" );
            }

            deferred.reject();
            $location.path( '/Login' );
        }
        // The user does not need to login
        else
            deferred.resolve();

        return deferred.promise;
    };

    const universalResolvesWithLogin = {
        app: ["$q", "$http", "$rootScope", "$sce", "$location", "xdLocalStorage", "appCacheService",
        function( $q: ng.IQService, $http: ng.IHttpService, $rootScope: ng.IRootScopeService, $sce: ng.ISCEService, $location: ng.ILocationService, xdLocalStorage: any, appCacheService: AppCacheService )
        {
            return Ally.SiteInfoHelper.loginInit( $q, $http, $rootScope, $sce, xdLocalStorage ).then( function( siteInfo: Ally.SiteInfoService )
            {
                return isLoginRequired( $location, $q, siteInfo, appCacheService );
            } );
        }]
    };

    const universalResolves = {
        app: ["$q", "$http", "$rootScope", "$sce", "xdLocalStorage", Ally.SiteInfoHelper.loginInit]
    };

    // This allows us to require SiteInfo to be retrieved before the app runs
    const customRouteProvider = angular.extend( {}, $routeProvider,
        {
            when: function( path: string, route: any )
            {
                route.resolve = ( route.resolve ) ? route.resolve : {};

                if( route.allyRole === Role_All )
                    angular.extend( route.resolve, universalResolves );
                else
                    angular.extend( route.resolve, universalResolvesWithLogin );

                $routeProvider.when( path, route );
                return this;
            }
        }
    );

    // Build our Angular routes
    for( let i = 0; i < AppConfig.menu.length; ++i )
    {
        const menuItem = AppConfig.menu[i];

        const routeObject: any = {
            controller: menuItem.controller,
            allyRole: menuItem.role,
            reloadOnSearch: menuItem.reloadOnSearch
        };

        if( menuItem.templateUrl )
            routeObject.templateUrl = menuItem.templateUrl;
        else
            routeObject.template = menuItem.templateHtml;

        if( menuItem.controllerAs )
            routeObject.controllerAs = menuItem.controllerAs;

        customRouteProvider.when( menuItem.path, routeObject );
    }

    $routeProvider.otherwise( { redirectTo: "/Home" } );
        
    // Create an interceptor to redirect to the login page when unauthorized
    $provide.factory( "http403Interceptor", ["$q", "$location", "$rootScope", "appCacheService", "$injector", function( $q: ng.IQService, $location: ng.ILocationService, $rootScope: ng.IRootScopeService, appCacheService: AppCacheService, $injector: ng.auto.IInjectorService )
    {
        return {
            response: function( response: any )
            {
                // Let success pass through
                return response;
            },

            responseError: function( response: any )
            {
                const status = response.status;

                // 401 - Unauthorized (not logged-in)
                // 403 - Forbidden (Logged-in, but not allowed to perform the action
                if( status === 401 || status === 403 )
                {
                    // If the user's action is forbidden and we should not auto-handle the response
                    if( status === 403 && $rootScope.dontHandle403 )
                        return $q.reject( response );

                    // If the user's action is forbidden and is logged-in then set this flag so we
                    // can display a helpful error message
                    if( status === 403 && $rootScope.isLoggedIn )
                        appCacheService.set( AppCacheService.Key_WasLoggedIn403, "true" );

                    // If the user is unauthorized but has saved credentials, try to log-in then retry the request
                    if( status === 401 && HtmlUtil.isValidString( window.localStorage["rememberMe_Email"] ) )
                    {
                        const $http = <ng.IHttpService>$injector.get( "$http" );

                        // Multiple requests can come in at the same time with 401, so let's store
                        // our login promise so subsequent calls can tie into the first login
                        // request
                        if( !$rootScope.retryLoginDeffered )
                        {
                            $rootScope.retryLoginDeffered = $q.defer();

                            const loginInfo = {
                                emailAddress: window.localStorage["rememberMe_Email"],
                                password: atob( window.localStorage["rememberMe_Password"] )
                            };

                            const retryLogin = function()
                            {
                                $http.post( "/api/Login", loginInfo ).then( function( httpResponse )
                                {
                                    const loginData: any = httpResponse.data;

                                    const siteInfo = <Ally.SiteInfoService>$injector.get( "SiteInfo" );

                                    // Store the new auth token
                                    siteInfo.setAuthToken( loginData.authToken );

                                    const loginDeffered = $rootScope.retryLoginDeffered;

                                    loginDeffered.resolve();

                                }, function()
                                {
                                    // Login failed so bail out all the way
                                    const loginDeffered = $rootScope.retryLoginDeffered;


                                    $rootScope.onLogOut_ClearData();
                                    loginDeffered.reject();

                                } ).finally( function()
                                {
                                    $rootScope.retryLoginDeffered = null;
                                } );
                            };

                            // Wait, just a bit, to let any other requests come in with a 401
                            setTimeout( retryLogin, 1000 );
                        }

                        const retryRequestDeferred = $q.defer();

                        $rootScope.retryLoginDeffered.promise.then( function()
                        {
                            // Retry the request
                            retryRequestDeferred.resolve( $http( response.config ) );

                            //$http( response.config ).then( function( newResponse )
                            //{
                            //    retryRequestDeferred.resolve( newResponse );
                            //}, function()
                            //{
                            //    retryRequestDeferred.reject( response );
                            //} );
                        }, function()
                            {
                                retryRequestDeferred.reject( response );
                            } );

                        return retryRequestDeferred.promise;
                    }

                    // Home, the default page, and login don't need special redirection or user messaging
                    if( $location.path() !== "/Home" && $location.path() !== "/Login" )
                    {
                        appCacheService.set( AppCacheService.Key_AfterLoginRedirect, $location.path() );
                        appCacheService.set( AppCacheService.Key_WasLoggedIn401, "true" );
                    }

                    // The use is not authorized so let's clear the session data
                    $rootScope.onLogOut_ClearData();
                }


                // If we didn't handle the response up above then simply reject it
                return $q.reject( response );
            }
        };
    }] );

    $httpProvider.interceptors.push( 'http403Interceptor' );

    // Make date strings convert to date objects
    ( <any>$httpProvider.defaults.transformResponse ).push( function( responseData: any )
    {
        // Fast skip HTML templates
        if( Ally.HtmlUtil2.isString( responseData ) && responseData.length > 30 )
            return responseData;

        Ally.HtmlUtil2.convertStringsToDates( responseData );

        return responseData;
    } );


    // Create an interceptor so we can add our auth token header. Also, this allows us to set our
    // own base URL for API calls so local testing can use the live API.
        $provide.factory( "apiUriInterceptor", ["$rootScope", "SiteInfo", function( $rootScope: ng.IRootScopeService, siteInfo: Ally.SiteInfoService )
    {
        // If we're making a request because the Angular app's run block, then see if we have
        // a cached auth token
        if( typeof ( $rootScope.authToken ) !== "string" && window.localStorage )
            $rootScope.authToken = window.localStorage.getItem( "ApiAuthToken" );
        
        return {
            request: function( reqConfig: ng.IRequestConfig ): ng.IRequestConfig
            {
                const BaseGenericUri = "https://0.webappapi.mycommunityally.org/api/";
                const BaseLocalGenericUri = "https://0.webappapi.communityally.org/api/";

                const isMakingGenericApiRequest = HtmlUtil.startsWith( reqConfig.url, BaseGenericUri )
                    || HtmlUtil.startsWith( reqConfig.url, BaseLocalGenericUri );

                // If we're talking to the Community Ally API server, then we need to complete the
                // relative URL and add the auth token
                const isMakingApiRequest = HtmlUtil.startsWith( reqConfig.url, "/api/" ) || isMakingGenericApiRequest;

                if( isMakingApiRequest ) 
                {
                    //console.log( `ApiBaseUrl: ${siteInfo.publicSiteInfo.baseApiUrl}, request URL: ${reqConfig.url}` );

                    // If we have an overridden URL to use for API requests
                    if( !HtmlUtil.startsWith( reqConfig.url, "http" ) )
                    {
                        if( !HtmlUtil.isNullOrWhitespace( OverrideBaseApiPath ) )
                            reqConfig.url = OverrideBaseApiPath + reqConfig.url.substr( "/api/".length );
                        else if( siteInfo.publicSiteInfo.baseApiUrl )
                            reqConfig.url = siteInfo.publicSiteInfo.baseApiUrl + reqConfig.url.substr( "/api/".length );
                    }
                    else if( isMakingGenericApiRequest && !HtmlUtil.isNullOrWhitespace( OverrideBaseApiPath ) )
                    {
                        if( HtmlUtil.startsWith( reqConfig.url, BaseGenericUri ) )
                            reqConfig.url = OverrideBaseApiPath + reqConfig.url.substr( BaseGenericUri.length );
                        else if( HtmlUtil.startsWith( reqConfig.url, BaseLocalGenericUri ) )
                            reqConfig.url = OverrideBaseApiPath + reqConfig.url.substr( BaseLocalGenericUri.length );
                    }

                    // Add the auth token
                    reqConfig.headers["Authorization"] = "Bearer " + $rootScope.authToken;

                    // Certain folks with ad-blockers or using private browsing mode will not send
                    // the referrer up so we need to send it ourselves
                    //if( !HtmlUtil.isNullOrWhitespace( OverrideOriginalUrl ) )
                        reqConfig.headers["ReferrerOverride"] = OverrideOriginalUrl || window.location.href;
                }

                return reqConfig;
            }
        };
    }] );

    $httpProvider.interceptors.push( "apiUriInterceptor" );
    
}] );


CA.angularApp.run( ["$rootScope", "$http", "$sce", "$location", "$templateCache", "$cacheFactory", "xdLocalStorage",
    function( $rootScope: ng.IRootScopeService, $http: ng.IHttpService, $sce: ng.ISCEService, $location: ng.ILocationService, $templateCache: ng.ITemplateCacheService, $cacheFactory: ng.ICacheFactoryService, xdLocalStorage: any )
    {
        $rootScope.bgImagePath = "/assets/images/Backgrounds/";
        $rootScope.appConfig = AppConfig;
        $rootScope.isLoggedIn = false;

        $rootScope.publicSiteInfo = {};

        $rootScope.shouldHideMenu = false;

        $rootScope.isAdmin = false;
        $rootScope.isSiteManager = false;

        $rootScope.menuItems = _.where( AppConfig.menu, function( menuItem: Ally.MenuItem_v3 ) { return !HtmlUtil.isNullOrWhitespace( menuItem.menuTitle ); } );

        $rootScope.mainMenuItems = _.where( $rootScope.menuItems, function( menuItem: Ally.MenuItem_v3 ) { return menuItem.role === Role_Authorized; } );
        $rootScope.manageMenuItems = _.where( $rootScope.menuItems, function( menuItem: Ally.MenuItem_v3 ) { return menuItem.role === Role_Manager; } );
        $rootScope.adminMenuItems = _.where( $rootScope.menuItems, function( menuItem: Ally.MenuItem_v3 ) { return menuItem.role === Role_Admin; } );
        $rootScope.publicMenuItems = null;

        // Populate the custom page list, setting to null if not valid
        $rootScope.populatePublicPageMenu = () =>
        {
            $rootScope.publicMenuItems = null;

            if( !$rootScope.publicSiteInfo || !$rootScope.publicSiteInfo.customPages )
                return;

            const customPages: Ally.PublicCustomPageEntry[] = $rootScope.publicSiteInfo.customPages;
            if( customPages.length == 0 )
                return;

            customPages.forEach( p => p.path = "/Page/" + p.pageSlug );

            $rootScope.publicMenuItems = customPages;
        };

        // Test localStorage here, fails in private browsing mode
        // If we have the association's public info cached then use it to load faster
        if( HtmlUtil.isLocalStorageAllowed() ) 
        {
            if( window.localStorage )
            {
                $rootScope.publicSiteInfo = angular.fromJson( window.localStorage.getItem( "siteInfo" ) );
                $rootScope.authToken = window.localStorage.getItem( "ApiAuthToken" );

                if( $rootScope.publicSiteInfo === null || $rootScope.publicSiteInfo === undefined )
                    $rootScope.publicSiteInfo = {};
                else
                {
                    // Update the background
                    //if( !HtmlUtil.isNullOrWhitespace( $rootScope.publicSiteInfo.bgImagePath ) )
                    //    $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + $rootScope.publicSiteInfo.bgImagePath + ")" );
                }

                $rootScope.populatePublicPageMenu();
            }
        }

        xdLocalStorage.init(
            {
                iframeUrl: "https://www.communityally.org/xd-local-storage.html"
            } ).then( function()
            {
                //console.log( 'Got xdomain iframe ready' );
            } );
        

        // Clear all local information about the logged-in user
        $rootScope.onLogOut_ClearData = function()
        {
            $rootScope.userInfo = {};
            $rootScope.isLoggedIn = false;
            $rootScope.isAdmin = false;
            $rootScope.isSiteManager = false;
            $rootScope.authToken = "";
            window.localStorage["rememberMe_Email"] = null;
            window.localStorage["rememberMe_Password"] = null;
            xdLocalStorage.removeItem( "allyApiAuthToken" );

            // Clear cached request results
            $cacheFactory.get( '$http' ).removeAll();

            if( window.localStorage )
                window.localStorage.removeItem( "siteInfo" );
            $location.path( '/Login' );
        };


        // Log-out and notify the server
        $rootScope.onLogOut = function()
        {
            $http.get( "/api/Login/Logout" ).then( $rootScope.onLogOut_ClearData, $rootScope.onLogOut_ClearData );
        };


        // Clear the cache if needed
        $rootScope.$on( '$routeChangeStart', function()
        {
            if( CA.clearTemplateCacheIfNeeded )
                CA.clearTemplateCacheIfNeeded( $templateCache );
        } );


        // Keep track of our current page
        $rootScope.$on( "$routeChangeSuccess", function( event, toState, toParams, fromState )
        {
            //console.log( "In $routeChangeSuccess", event, toState );

            $rootScope.curPath = $location.path();

            // If there is a query string, track it
            let queryString = "";
            const path = $location.path();
            if( path.indexOf( "?" ) !== -1 )
                queryString = path.substring( path.indexOf( "?" ), path.length );

            // If there is a referrer, track it
            let referrer = "";
            if( fromState && fromState.name )
                referrer = $location.protocol() + "://" + $location.host() + "/#" + fromState.url;

            // Tell Segment about the route change
            analytics.page( {
                path: path,
                referrer: referrer,
                search: queryString,
                url: $location.absUrl()
            } );

            // Set the browser title
            if( $rootScope.publicSiteInfo && $rootScope.publicSiteInfo.fullName )
            {
                document.title = $rootScope.publicSiteInfo.fullName;
                if( toState.$$route && toState.$$route.originalPath )
                {
                    const menuItem = _.find( AppConfig.menu, menuItem => menuItem.path === toState.$$route.originalPath );

                    if( menuItem )
                    {
                        if( menuItem.pageTitle )
                            document.title = $rootScope.publicSiteInfo.fullName + " - " + menuItem.pageTitle;
                        else if( menuItem.menuTitle )
                            document.title = $rootScope.publicSiteInfo.fullName + " - " + menuItem.menuTitle;
                    }
                }
            }
        } );
    }
] );

 
//CA.angularApp.provider( '$exceptionHandler', {
//    $get: function( errorLogService )
//    {
//        return errorLogService;
//    }
//} );

//CA.angularApp.factory( "errorLogService", ["$log", function( $log )
//{
//    return function( exception )
//    {
//        $log.error.apply( $log, arguments );

//        if( typeof ( analytics ) !== "undefined" )
//            analytics.track( "AngularJS Error", { error: exception.message, stack: exception.stack } );
//    }
//}] );


namespace Ally
{
    export class MenuItem_v3
    {
        path: string;
        templateHtml: string;
        menuTitle: string;
        role: string;
    }
}
var Ally;
(function (Ally) {
    /**
     * Represents a home owned or rented by a user
     */
    class UsersHome {
    }
    Ally.UsersHome = UsersHome;
    class PayPeriod {
    }
    Ally.PayPeriod = PayPeriod;
    /**
     * The logged-in user's info
     */
    class UserInfo {
    }
    Ally.UserInfo = UserInfo;
    /**
     * Information that is provided to anyone that visits the group's site, even if not logged-in
     */
    class PublicSiteInfo {
    }
    Ally.PublicSiteInfo = PublicSiteInfo;
    class RecentPayment {
    }
    Ally.RecentPayment = RecentPayment;
    /**
     * Represents the group descriptive information that can only be accessed by a member of the
     * group
     */
    class PrivateSiteInfo {
    }
    Ally.PrivateSiteInfo = PrivateSiteInfo;
    /**
     * Represents the descriptive information for a CHTN group (condo, HOA, townhome, neighborhood)
     */
    class ChtnPrivateSiteInfo extends PrivateSiteInfo {
    }
    Ally.ChtnPrivateSiteInfo = ChtnPrivateSiteInfo;
    /**
     * The current group's site information
     */
    class SiteInfoService {
        constructor() {
            this.publicSiteInfo = new PublicSiteInfo();
            this.privateSiteInfo = new ChtnPrivateSiteInfo();
            this.userInfo = new Ally.UserInfo();
            this.isLoggedIn = false;
        }
        // Retrieve the basic information for the current site
        refreshSiteInfo($rootScope, $http, $q) {
            this._rootScope = $rootScope;
            const deferred = $q.defer();
            $rootScope.isLoadingSite = true;
            if (HtmlUtil.getSubdomain() === "login") {
                $rootScope.isLoadingSite = false;
                this.handleSiteInfo(null, $rootScope);
                deferred.resolve();
                return deferred.promise;
            }
            const onSiteInfoReceived = (siteInfo) => {
                $rootScope.isLoadingSite = false;
                this.handleSiteInfo(siteInfo, $rootScope);
                deferred.resolve(siteInfo);
            };
            const onRequestFailed = (errorResult) => {
                $rootScope.isLoadingSite = false;
                deferred.reject(errorResult);
            };
            // Retrieve information for the current association
            //const GetInfoUri = "/api/GroupSite";
            const GetInfoUri = "https://0.webappapi.communityally.org/api/GroupSite";
            //const GetInfoUri = "https://0.webappapi.mycommunityally.org/api/GroupSite";
            $http.get(GetInfoUri).then((httpResponse) => {
                // If we received data but the user isn't logged-in
                if (httpResponse.data && !httpResponse.data.userInfo) {
                    // Check the cross-domain localStorage for an auth token
                    this.xdLocalStorage.getItem("allyApiAuthToken").then((xdResponse) => {
                        // If we received an auth token then retry accessing the group data
                        if (xdResponse && HtmlUtil.isValidString(xdResponse.value)) {
                            //console.log( "Received cross domain token:" + response.value );
                            this.setAuthToken(xdResponse.value);
                            $http.get(GetInfoUri).then((httpResponse) => {
                                onSiteInfoReceived(httpResponse.data);
                            }, onRequestFailed);
                        }
                        // Otherwise just handle what we received
                        else
                            onSiteInfoReceived(httpResponse.data);
                    }, () => {
                        // We failed to get a cross domain token so continue on with what we received
                        onSiteInfoReceived(httpResponse.data);
                    });
                }
                else
                    onSiteInfoReceived(httpResponse.data);
            }, (httpResponse) => {
                onRequestFailed(httpResponse.data);
            });
            return deferred.promise;
        }
        ;
        // Returns if a page is for a neutral (public, no login required) page
        testIfIsNeutralPage(locationHash) {
            // We only care about Angular paths
            const HashPrefix = "#!/";
            if (!HtmlUtil.startsWith(locationHash, HashPrefix))
                return false;
            // Remove that prefix and add a slash as that's what the menu item stores
            locationHash = "/" + locationHash.substring(HashPrefix.length);
            const menuItem = _.find(AppConfig.menu, (menuItem) => menuItem.path === locationHash);
            return typeof (menuItem) === "object";
        }
        ;
        // Log-in and application start both retrieve information about the current association's site.
        // This function should be used to properly populate the scope with the information.
        // Returns true if we redirected the user, otherwise false
        handleSiteInfo(siteInfo, $rootScope) {
            const subdomain = HtmlUtil.getSubdomain(window.location.host);
            if (!this.authToken && $rootScope.authToken)
                this.setAuthToken($rootScope.authToken);
            // If we're at an unknown subdomain
            if (!siteInfo) {
                // Allow the user to log-in with no subdomain, create a temp site info object
                const isNeutralSubdomain = subdomain === null || subdomain === "www" || subdomain === "login";
                const isNeutralPage = this.testIfIsNeutralPage(window.location.hash);
                if (isNeutralSubdomain && isNeutralPage) {
                    // Create a default object used to populate a site
                    siteInfo = new AllySiteInfo();
                    siteInfo.publicSiteInfo = new PublicSiteInfo();
                    siteInfo.publicSiteInfo.fullName = AppConfig.appName;
                    //siteLogo: "<span style='font-size: 22pt; color: #FFF;'>Welcome to <a style='color:#a3e0ff; text-decoration: underline;' href='https://" + AppConfig.baseTld + "'>" + AppConfig.appName + "</a></span>"
                    siteInfo.publicSiteInfo.siteLogo = "<span style='font-size: 22pt; color: #FFF;'>Welcome to " + AppConfig.appName + "</span>";
                    siteInfo.publicSiteInfo.baseApiUrl = "https://0.webappapi.communityally.org/api/";
                }
                // Otherwise we are at an unknown, non-neutral subdomain so get back to safety!
                else {
                    // Go to generic login                
                    GlobalRedirect("https://login." + AppConfig.baseTld + "/#!/Login");
                    // Indicate we redirected
                    return true;
                }
            }
            // Store the site info to the root scope for access by the app module
            $rootScope.publicSiteInfo = siteInfo.publicSiteInfo;
            this.publicSiteInfo = siteInfo.publicSiteInfo;
            $rootScope.populatePublicPageMenu();
            // Handle private (logged-in only) info
            let privateSiteInfo = siteInfo.privateSiteInfo;
            if (!privateSiteInfo)
                privateSiteInfo = new PrivateSiteInfo();
            this.privateSiteInfo = privateSiteInfo;
            // Store the Google lat/lon object to make life easier later
            if (this.privateSiteInfo.gpsPosition && typeof (google) !== "undefined")
                this.privateSiteInfo.googleGpsPosition = new google.maps.LatLng(this.privateSiteInfo.gpsPosition.lat, this.privateSiteInfo.gpsPosition.lon);
            // Set the site title
            document.title = this.publicSiteInfo.fullName;
            $rootScope.isPremiumPlanActive = this.privateSiteInfo.isPremiumPlanActive;
            $rootScope.isPremiumPlanTrial = moment().isBefore(moment(this.privateSiteInfo.creationDate).add(3, "months"));
            this.userInfo = siteInfo.userInfo;
            $rootScope.userInfo = siteInfo.userInfo;
            if (HtmlUtil.isLocalStorageAllowed())
                window.localStorage.setItem("siteInfo", angular.toJson(this.publicSiteInfo));
            // If the user is logged-in
            this.isLoggedIn = $rootScope.userInfo !== null && $rootScope.userInfo !== undefined;
            const didLoginJustNow = this.isLoggedIn && !$rootScope.isLoggedIn;
            $rootScope.isLoggedIn = this.isLoggedIn;
            // Update the background
            if (!HtmlUtil.isNullOrWhitespace(this.publicSiteInfo.bgImagePath))
                $(document.documentElement).css("background-image", "url(" + $rootScope.bgImagePath + this.publicSiteInfo.bgImagePath + ")");
            if (this.isLoggedIn) {
                const prepopulateZopim = () => {
                    if (typeof ($zopim) !== "undefined") {
                        $zopim(() => {
                            if ($rootScope.userInfo) {
                                $zopim.livechat.setName($rootScope.userInfo.firstName + " " + $rootScope.userInfo.lastName);
                                if ($rootScope.userInfo.emailAddress && $rootScope.userInfo.emailAddress.indexOf("@") !== -1)
                                    $zopim.livechat.setEmail($rootScope.userInfo.emailAddress);
                            }
                        });
                    }
                };
                setTimeout(prepopulateZopim, 8000); // Zopim delays 5sec before setup so wait longer than than
                $rootScope.isAdmin = $rootScope.userInfo.isAdmin;
                $rootScope.isSiteManager = $rootScope.userInfo.isSiteManager;
                // Tell Segment we know who the user is
                if (typeof (analytics) !== "undefined") {
                    analytics.identify($rootScope.userInfo.emailAddress, {
                        name: $rootScope.userInfo.fullName
                    });
                }
            }
            // Otherwise the user is not logged-in
            else {
                $rootScope.userInfo = null;
                // If we're not at the log-in page, the get us there
                const LoginPath = "#!/Login";
                if (window.location.hash != LoginPath && !AppConfig.isPublicRoute(window.location.hash)) {
                    // If we're at a valid subdomain
                    if (this.publicSiteInfo && this.publicSiteInfo.baseUrl) {
                        if (window.location.hash && window.location.hash !== "#!/Home") {
                            // An ugly sidestep becuase AppCacheService isn't ready when this code is
                            // called
                            window.sessionStorage[AppCacheService.KeyPrefix + AppCacheService.Key_AfterLoginRedirect] = window.location.hash.substr(2); // Remove the leading #!
                            window.sessionStorage[AppCacheService.KeyPrefix + AppCacheService.Key_WasLoggedIn401] = "true";
                        }
                        // Need to set the hash "manually" as $location is not available in the config
                        // block and GlobalRedirect will go to the wrong TLD when working locally
                        if (this.publicSiteInfo.customLandingPagePath)
                            window.location.hash = this.publicSiteInfo.customLandingPagePath;
                        else
                            window.location.hash = LoginPath;
                        //$location.path( "/Login" );
                        //GlobalRedirect( this.publicSiteInfo.baseUrl + loginPath );
                    }
                    else
                        GlobalRedirect("https://login." + AppConfig.baseTld + LoginPath);
                    // Indicate we redirected
                    return true;
                }
            }
            // If we need to redirect from the login subdomain
            if (this.publicSiteInfo.baseUrl && subdomain === "login") {
                if ((subdomain === null || subdomain !== this.publicSiteInfo.shortName)
                    && HtmlUtil.isNullOrWhitespace(OverrideBaseApiPath)) {
                    // Since we're leaving the site, don't let the menu show up for a cleaner experience
                    if (didLoginJustNow)
                        $rootScope.isLoggedIn = false;
                    GlobalRedirect(this.publicSiteInfo.baseUrl + "/#!/Home");
                    // Indicate we redirected
                    return true;
                }
            }
            // We did not redirect
            return false;
        }
        setAuthToken(authToken) {
            if (window.localStorage)
                window.localStorage.setItem("ApiAuthToken", authToken);
            this._rootScope.authToken = authToken;
            this.xdLocalStorage.setItem("allyApiAuthToken", authToken).then(() => {
                console.log("Set cross domain auth token");
            }, (response) => {
                console.log("Failed to set cross domain auth token", response);
            });
            this.authToken = authToken;
            //appCacheService.clear( appCacheService.Key_AfterLoginRedirect );
        }
    }
    SiteInfoService.AlwaysDiscussDate = new Date(2018, 7, 1); // Groups created after August 1, 2018 always have discussion enabled
    Ally.SiteInfoService = SiteInfoService;
    class SiteInfoHelper {
        static loginInit($q, $http, $rootScope, $sce, xdLocalStorage) {
            const deferred = $q.defer();
            SiteInfoProvider.siteInfo.xdLocalStorage = xdLocalStorage;
            if (SiteInfoProvider.isSiteInfoLoaded) {
                deferred.resolve(SiteInfoProvider.siteInfo);
            }
            else {
                SiteInfoProvider.siteInfo.refreshSiteInfo($rootScope, $http, $q).then(() => {
                    SiteInfoProvider.isSiteInfoLoaded = true;
                    // Used to control the loading indicator on the site
                    $rootScope.isSiteInfoLoaded = true;
                    $rootScope.siteTitle = {
                        text: $rootScope.publicSiteInfo.siteTitleText
                    };
                    // The logo contains markup so use sce to display HTML content
                    if ($rootScope.publicSiteInfo.siteLogo)
                        $rootScope.siteTitle.logoHtml = $sce.trustAsHtml($rootScope.publicSiteInfo.siteLogo);
                    //$rootScope.siteTitleText = $rootScope.publicSiteInfo.siteTitleText;
                    // Occurs when the user saves changes to the site title
                    $rootScope.onUpdateSiteTitleText = () => {
                        analytics.track("updateSiteTitle");
                        $http.put("/api/Settings", { siteTitle: $rootScope.siteTitle.text });
                    };
                    deferred.resolve(SiteInfoProvider.siteInfo);
                }, (errorResult) => {
                    // For some reason, this does not invoke the caller's error callback, so we need to redirect here
                    //deferred.reject( errorResult );
                    GlobalRedirect("https://login." + AppConfig.baseTld + "/#!/Login");
                });
            }
            return deferred.promise;
        }
        ;
    }
    Ally.SiteInfoHelper = SiteInfoHelper;
    class SiteInfoProvider {
        $get() {
            if (!SiteInfoProvider.isSiteInfoLoaded)
                console.log("Not yet loaded!");
            return SiteInfoProvider.siteInfo;
        }
    }
    SiteInfoProvider.isSiteInfoLoaded = false;
    // Use statics because this class is used to resolve the route before the Angular app is
    // allowed to run
    SiteInfoProvider.siteInfo = new Ally.SiteInfoService();
    Ally.SiteInfoProvider = SiteInfoProvider;
    class AllySiteInfo {
    }
    Ally.AllySiteInfo = AllySiteInfo;
    class LoginResults {
    }
    Ally.LoginResults = LoginResults;
})(Ally || (Ally = {}));
angular.module('CondoAlly').provider("SiteInfo", Ally.SiteInfoProvider);

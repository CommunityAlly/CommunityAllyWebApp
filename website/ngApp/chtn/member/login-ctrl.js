var Ally;
(function (Ally) {
    var LoginInfo = /** @class */ (function () {
        function LoginInfo() {
            this.emailAddress = "";
            this.password = "";
        }
        return LoginInfo;
    }());
    Ally.LoginInfo = LoginInfo;
    /**
     * The controller for the login page
     */
    var LoginController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function LoginController($http, $rootScope, $location, appCacheService, siteInfo, xdLocalStorage) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$location = $location;
            this.appCacheService = appCacheService;
            this.siteInfo = siteInfo;
            this.xdLocalStorage = xdLocalStorage;
            this.isDemoSite = false;
            this.loginInfo = new LoginInfo();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        LoginController.prototype.$onInit = function () {
            if (!HtmlUtil.isLocalStorageAllowed())
                this.loginResult = "You have cookies/local storage disabled. Condo Ally requires these features, please enable to continue. You may be in private browsing mode.";
            var nav = navigator.userAgent.toLowerCase();
            var ieVersion = (nav.indexOf('msie') != -1) ? parseInt(nav.split('msie')[1]) : 0;
            //var isIEBrowser = window.navigator.userAgent.indexOf( "MSIE " ) >= 0;
            if (ieVersion > 0 && ieVersion < 10)
                document.getElementById("bad-browser-panel").style.display = "block";
            this.isDemoSite = HtmlUtil.getSubdomain() === "demosite";
            // Allow admin to login if needed
            if (HtmlUtil.GetQueryStringParameter("s") === "1")
                this.isDemoSite = false;
            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;
            this.sectionStyle = {
                position: "relative"
            };
            if (!this.isDemoSite) {
                this.sectionStyle["left"] = "50%";
                if (this.loginImageUrl) {
                    this.sectionStyle["width"] = "760px";
                    this.sectionStyle["margin-left"] = "-380px";
                }
                else {
                    this.sectionStyle["width"] = "450px";
                    this.sectionStyle["margin-left"] = "-225px";
                }
            }
            // If we got sent here for a 403, but the user was already logged in
            if (this.appCacheService.getAndClear(this.appCacheService.Key_WasLoggedIn403) === "true") {
                if (this.$rootScope.isSiteManager)
                    this.loginResult = "You are not authorized to perform that action. Please contact support.";
                else
                    this.loginResult = "You are not authorized to perform that action. Please contact an admin.";
            }
            else if (this.appCacheService.getAndClear(this.appCacheService.Key_WasLoggedIn401) === "true")
                this.loginResult = "Please login first.";
            // Focus on the e-mail text box
            setTimeout(function () {
                $("#login-email-textbox").focus();
            }, 200);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button when they forgot their password
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LoginController.prototype.onForgotPassword = function () {
            this.appCacheService.set("forgotEmail", this.loginInfo.emailAddress);
            this.$location.path("/ForgotPassword");
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Log-in 
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LoginController.prototype.demoLogin = function () {
            this.loginInfo = {
                emailAddress: "testuser",
                password: "demosite"
            };
            this.onLogin();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the log-in button
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LoginController.prototype.onLogin = function () {
            this.isLoading = true;
            // Retrieve information for the current association
            var innerThis = this;
            this.$http.post("/api/Login", this.loginInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                var data = httpResponse.data;
                var redirectPath = innerThis.appCacheService.getAndClear(innerThis.appCacheService.Key_AfterLoginRedirect);
                innerThis.siteInfo.setAuthToken(data.authToken);
                innerThis.siteInfo.handleSiteInfo(data.siteInfo, innerThis.$rootScope);
                if (innerThis.rememberMe) {
                    window.localStorage["rememberMe_Email"] = innerThis.loginInfo.emailAddress;
                    window.localStorage["rememberMe_Password"] = btoa(innerThis.loginInfo.password);
                }
                else {
                    window.localStorage["rememberMe_Email"] = null;
                    window.localStorage["rememberMe_Password"] = null;
                }
                // If the user hasn't accepted the terms yet then make them go to the profile page
                if (data.siteInfo.userInfo.acceptedTermsDate === null && !innerThis.isDemoSite)
                    innerThis.$location.path("/MyProfile");
                else {
                    if (!HtmlUtil.isValidString(redirectPath) && redirectPath !== "/Login")
                        redirectPath = "/Home";
                    innerThis.$location.path(redirectPath);
                }
            }, function (httpResponse) {
                innerThis.isLoading = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                innerThis.loginResult = "Failed to log in: " + errorMessage;
            });
        };
        LoginController.$inject = ["$http", "$rootScope", "$location", "appCacheService", "SiteInfo", "xdLocalStorage"];
        return LoginController;
    }());
    Ally.LoginController = LoginController;
})(Ally || (Ally = {}));
CA.angularApp.component("loginPage", {
    templateUrl: "/ngApp/chtn/member/login.html",
    controller: Ally.LoginController
});

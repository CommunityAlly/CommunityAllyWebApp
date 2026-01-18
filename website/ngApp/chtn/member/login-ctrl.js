var Ally;
(function (Ally) {
    class LoginInfo {
        constructor() {
            this.emailAddress = "";
            this.password = "";
        }
    }
    Ally.LoginInfo = LoginInfo;
    /**
     * The controller for the login page
     */
    class LoginController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, $location, appCacheService, siteInfo, $timeout) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$location = $location;
            this.appCacheService = appCacheService;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.isDemoSite = false;
            this.loginInfo = new LoginInfo();
            this.showNeedAccessModal = false;
            this.isEnteringMfaCode = false;
            this.mfaCode = "";
            this.mfaCountdownSecs = 0;
            this.mfaExpirationCountdownText = "";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            //console.log( "In LoginController.$onInit" );
            if (!HtmlUtil.isLocalStorageAllowed())
                this.loginResultMessage = "You have cookies/local storage disabled. Condo Ally requires these features, please enable to continue. You may be in private browsing mode.";
            const nav = navigator.userAgent.toLowerCase();
            const ieVersion = (nav.indexOf('msie') != -1) ? parseInt(nav.split('msie')[1]) : 0;
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
                this.welcomeImageContainerStyle = {
                    "margin-bottom": "21px",
                    "max-width": "100%"
                };
                // Pre-size the welcome image container to avoid jumping around
                const savedWelcomeImageWidth = window.localStorage["welcomeImage_width"];
                if (savedWelcomeImageWidth && savedWelcomeImageWidth != "0" && !HtmlUtil.isNullOrWhitespace(this.loginImageUrl)) {
                    this.welcomeImageContainerStyle["width"] = savedWelcomeImageWidth + "px";
                    this.welcomeImageContainerStyle["height"] = window.localStorage["welcomeImage_height"] + "px";
                }
                //this.sectionStyle["left"] = "50%";
                if (!HtmlUtil.isNullOrWhitespace(this.loginImageUrl)) {
                    this.sectionStyle["max-width"] = "760px";
                    //this.sectionStyle["margin-left"] = "-380px";
                }
                else {
                    this.sectionStyle["max-width"] = "500px";
                    //this.sectionStyle["max-width"] = "450px";
                    //this.sectionStyle["margin-left"] = "-225px";
                }
                this.sectionStyle["margin-left"] = "auto";
                this.sectionStyle["margin-right"] = "auto";
            }
            // If we got sent here for a 403, but the user was already logged in
            if (this.appCacheService.getAndClear(AppCacheService.Key_WasLoggedIn403) === "true") {
                if (this.$rootScope.isSiteManager)
                    this.loginResultMessage = "You are not authorized to perform that action. Please contact support.";
                else
                    this.loginResultMessage = "You are not authorized to perform that action. Please contact an admin.";
            }
            // Or if we got sent here for a 401
            else if (this.appCacheService.getAndClear(AppCacheService.Key_WasLoggedIn401) === "true")
                this.loginResultMessage = "Please login first.";
            // Focus on the email text box
            setTimeout(function () {
                $("#login-email-textbox").focus();
            }, 200);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the welcome image loads
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onWelcomeImageLoaded() {
            const welcomeImageElem = document.getElementById("welcome-image");
            //console.log( `Welcome image loaded ${welcomeImageElem.width}x${welcomeImageElem.height}` );
            window.localStorage["welcomeImage_width"] = welcomeImageElem.naturalWidth;
            window.localStorage["welcomeImage_height"] = welcomeImageElem.naturalHeight;
            this.welcomeImageContainerStyle["width"] = welcomeImageElem.naturalWidth + "px";
            this.welcomeImageContainerStyle["height"] = "auto";
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the welcome image fails to load
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onWelcomeImageError() {
            //var welcomeImageElem = document.getElementById( "welcome-image" ) as HTMLImageElement;
            console.log(`Welcome image error`);
            window.localStorage.removeItem("welcomeImage_width");
            window.localStorage.removeItem("welcomeImage_height");
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button when they forgot their password
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onForgotPassword() {
            this.appCacheService.set("forgotEmail", this.loginInfo.emailAddress);
            this.$location.path("/ForgotPassword");
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Log-in 
        ///////////////////////////////////////////////////////////////////////////////////////////////
        demoLogin() {
            this.loginInfo = {
                emailAddress: "testuser",
                password: "demosite"
            };
            this.onLogin(null);
        }
        completeLogin(loginResult) {
            let redirectPath = this.appCacheService.getAndClear(AppCacheService.Key_AfterLoginRedirect);
            if (!redirectPath && loginResult.redirectUrl)
                redirectPath = loginResult.redirectUrl;
            this.siteInfo.setAuthToken(loginResult.authToken);
            if (this.rememberMe) {
                window.localStorage["rememberMe_Email"] = this.loginInfo.emailAddress;
                window.localStorage["rememberMe_Password"] = btoa(this.loginInfo.password);
            }
            else {
                window.localStorage["rememberMe_Email"] = null;
                window.localStorage["rememberMe_Password"] = null;
            }
            // handleSiteInfo returns true if we redirect the user so stop processing if we did
            if (this.siteInfo.handleSiteInfo(loginResult.siteInfo, this.$rootScope, this.$http))
                return;
            // If the user hasn't accepted the terms yet then make them go to the profile
            // page. But no need if this is a demo site.
            const shouldSendToProfile = !loginResult.siteInfo.userInfo.acceptedTermsDate && !this.isDemoSite;
            if (shouldSendToProfile)
                this.$location.path("/MyProfile");
            else {
                if (!HtmlUtil.isValidString(redirectPath) && redirectPath !== "/Login")
                    redirectPath = "/Home";
                this.$location.path(redirectPath);
            }
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the log-in button
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onLogin(event) {
            if (event)
                event.preventDefault();
            this.isLoading = true;
            this.mfaLoginResults = null;
            // Retrieve information for the current association
            this.$http.post("/api/Login/FromForm", this.loginInfo).then((httpResponse) => {
                this.isLoading = false;
                const loginResult = httpResponse.data;
                // If the user needs to complete MFA via SMS
                if (loginResult.mfaMethodsCsv === "sms" && loginResult.userId) {
                    this.isEnteringMfaCode = true;
                    this.loginResultMessage = null;
                    this.mfaLoginResults = loginResult;
                    this.mfaCountdownSecs = LoginController.MfaCountdownExpirationSecs + 1; // Add one since we tick immediately
                    this.tickMfaCountdown();
                    // Focus on the code field
                    window.setTimeout(() => document.getElementById("login-mfa-textbox").focus(), 100);
                    return;
                }
                this.completeLogin(loginResult);
            }, (httpResponse) => {
                this.isLoading = false;
                this.loginResultMessage = "Failed to log in: " + httpResponse.data.exceptionMessage;
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs every second while waiting for the user to enter the MFA code
        ///////////////////////////////////////////////////////////////////////////////////////////////
        tickMfaCountdown() {
            --this.mfaCountdownSecs;
            //console.log( "In tickMfaCountdown", this.mfaCountdownSecs );
            if (this.mfaCountdownSecs < 0) {
                alert("Your MFA code has expired, please restart the login process");
                window.location.reload();
                return;
            }
            let secsString = Math.floor(this.mfaCountdownSecs % 60).toString();
            if (secsString.length < 2)
                secsString = "0" + secsString;
            this.mfaExpirationCountdownText = Math.floor(this.mfaCountdownSecs / 60).toString() + ":" + secsString;
            this.mfaCountdownTimer = this.$timeout(() => this.tickMfaCountdown(), 1000);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the log-in button for the MFA form
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onLoginViaMfa(event) {
            if (event)
                event.preventDefault();
            this.isLoading = true;
            const mfaLoginInfo = {
                userId: this.mfaLoginResults.userId,
                mfaLoginId: this.mfaLoginResults.mfaLoginId,
                mfaCode: this.mfaCode
            };
            // Retrieve information for the current association
            this.$http.post("/api/Login/ViaMfa", mfaLoginInfo).then((httpResponse) => {
                this.isLoading = false;
                if (this.mfaCountdownTimer)
                    this.$timeout.cancel(this.mfaCountdownTimer);
                const loginResult = httpResponse.data;
                this.completeLogin(loginResult);
            }, (httpResponse) => {
                this.isLoading = false;
                this.loginResultMessage = "Failed to log in: " + httpResponse.data.exceptionMessage;
                // Put focus back on the code field
                const mfaTextBox = document.getElementById("login-mfa-textbox");
                if (mfaTextBox) {
                    mfaTextBox.focus();
                    mfaTextBox.select();
                }
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the link to reload/restart login
        ///////////////////////////////////////////////////////////////////////////////////////////////
        reload() {
            window.location.reload();
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user pastes content into the MFA code input field
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onLoginMfaPaste(event) {
            const afterModelUpdate = () => {
                //console.log( "In onLoginMfaPaste after delay", this.mfaCode );
                if (!this.mfaCode || this.mfaCode.length !== 6)
                    return;
                // The user pasted a 6-character code so let's auto-login
                this.onLoginViaMfa(event);
            };
            // The ngPaste occurs before the model updates so we need to delay a bit for the model
            // to catch up
            this.$timeout(afterModelUpdate, 1);
        }
    }
    LoginController.$inject = ["$http", "$rootScope", "$location", "appCacheService", "SiteInfo", "$timeout"];
    LoginController.MfaCountdownExpirationSecs = 5 * 60;
    Ally.LoginController = LoginController;
})(Ally || (Ally = {}));
CA.angularApp.component("loginPage", {
    templateUrl: "/ngApp/chtn/member/login.html",
    controller: Ally.LoginController
});

var Ally;
(function (Ally) {
    class SimpleUserEntry {
    }
    Ally.SimpleUserEntry = SimpleUserEntry;
    class SimpleUserEntryWithTerms extends SimpleUserEntry {
    }
    Ally.SimpleUserEntryWithTerms = SimpleUserEntryWithTerms;
    class ProfileUserInfo extends SimpleUserEntryWithTerms {
    }
    class PtaMember extends SimpleUserEntry {
    }
    Ally.PtaMember = PtaMember;
    /**
     * The controller for the profile page
     */
    class MyProfileController {
        /**
         * The constructor for the class
         */
        constructor($rootScope, $http, $location, appCacheService, siteInfo, $scope) {
            this.$rootScope = $rootScope;
            this.$http = $http;
            this.$location = $location;
            this.appCacheService = appCacheService;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.isResultMessageGood = false;
            this.showPassword = false;
            this.shouldShowPassword = false;
            this.selectedProfileView = "Primary";
            this.passwordComplexity = "short";
            this.emailFlagsNonBoard = true;
            this.emailFlagsDiscussion = true;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isDemoSite = HtmlUtil.getSubdomain() === "demosite";
            if (this.siteInfo.privateSiteInfo)
                this.canHideContactInfo = this.siteInfo.privateSiteInfo.canHideContactInfo;
            this.retrieveProfileData();
            const hookUpPhotoFileUpload = () => {
                const uploader = $('#JQFileUploader');
                uploader.fileupload({
                    dropZone: null,
                    pasteZone: null,
                    add: (e, data) => {
                        data.url = "api/DocumentUpload/ProfileImage?ApiAuthToken=" + this.siteInfo.authToken;
                        if (this.siteInfo.publicSiteInfo.baseApiUrl)
                            data.url = this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload/ProfileImage";
                        this.$scope.$apply(() => this.isLoading = true);
                        const xhr = data.submit();
                        xhr.done(() => {
                            this.$scope.$apply(() => {
                                // Reload the page to see the changes
                                window.location.reload();
                            });
                        });
                    },
                    beforeSend: (xhr) => {
                        if (this.siteInfo.publicSiteInfo.baseApiUrl)
                            xhr.setRequestHeader("Authorization", "Bearer " + this.$rootScope.authToken);
                        else
                            xhr.setRequestHeader("ApiAuthToken", this.$rootScope.authToken);
                    },
                    fail: (e, data) => {
                        this.$scope.$apply(() => {
                            this.isLoading = false;
                            alert("Upload Failed: " + data.jqXHR.responseJSON.exceptionMessage);
                        });
                    }
                });
            };
            setTimeout(hookUpPhotoFileUpload, 500);
        }
        /**
         * Save the user's profile photo setting
         */
        saveProfilePhoto(type) {
            if (this.initialProfileImageType === "upload") {
                if (!confirm("Are you sure you want to change your profile image away from your uploaded photo? Your uploaded photo will be deleted.")) {
                    this.profileImageType = this.initialProfileImageType;
                    return;
                }
            }
            this.isLoading = true;
            this.$http.put("/api/MyProfile/ProfileImage?type=" + type, null).then(() => {
                this.isLoading = false;
                this.initialProfileImageType = this.profileImageType;
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user checks to box to see what they're typing
         */
        onShowPassword() {
            const passwordTextBox = document.getElementById("passwordTextBox");
            passwordTextBox.type = this.shouldShowPassword ? "text" : "password";
        }
        /**
         * Populate the page
         */
        retrieveProfileData() {
            this.isLoading = true;
            this.$http.get("/api/MyProfile").then((httpResponse) => {
                this.isLoading = false;
                this.profileInfo = httpResponse.data;
                this.initialProfileImageType = "blank";
                if (!this.profileInfo.avatarUrl || this.profileInfo.avatarUrl.indexOf("blank-headshot") !== -1)
                    this.initialProfileImageType = "blank";
                else if (this.profileInfo.avatarUrl && this.profileInfo.avatarUrl.indexOf("gravatar") !== -1)
                    this.initialProfileImageType = "gravatar";
                else if (this.profileInfo.avatarUrl && this.profileInfo.avatarUrl.length > 0)
                    this.initialProfileImageType = "upload";
                if (this.initialProfileImageType !== "upload")
                    this.profileInfo.avatarUrl = null;
                this.profileImageType = this.initialProfileImageType;
                this.gravatarUrl = "https://www.gravatar.com/avatar/" + md5((this.profileInfo.email || "").toLowerCase()) + "?s=80&d=identicon";
                // Don't show empty email address
                if (HtmlUtil.endsWith(this.profileInfo.email, "@condoally.com"))
                    this.profileInfo.email = "";
                this.needsToAcceptTerms = this.profileInfo.acceptedTermsDate === null && !this.isDemoSite;
                this.hasAcceptedTerms = !this.needsToAcceptTerms; // Gets set by the checkbox
                this.$rootScope.shouldHideMenu = this.needsToAcceptTerms;
                this.emailFlagsNonBoard = (this.profileInfo.enabledEmailsFlags & 2) === 2;
                this.emailFlagsDiscussion = (this.profileInfo.enabledEmailsFlags & 4) === 4;
                // Was used before, here for convenience
                this.saveButtonStyle = {
                    width: "100px",
                    "font-size": "1em"
                };
            });
        }
        /**
         * Occurs when the user hits the save button
         */
        onSaveInfo() {
            this.isLoading = true;
            this.resultMessage = "";
            this.$http.put("/api/MyProfile", this.profileInfo).then((httpResponse) => {
                this.isLoading = false;
                this.profileInfo.password = null;
                this.isResultMessageGood = true;
                this.resultMessage = "Your changes have been saved.";
                if (httpResponse.data.failedToUpdateEmail) {
                    this.resultMessage = "Profile changes have been saved, except we were unable to update your email address: " + httpResponse.data.failureDetails;
                }
                else if (httpResponse.data.emailUpdatedWasInitiated) {
                    this.profileInfo.pendingEmailAddress = this.profileInfo.email;
                    this.resultMessage = "Your changes have been saved. An email has been sent to confirm your email address change before it can take effect.";
                }
                // $rootScope.hideMenu is true when this is the user's first login
                if (this.$rootScope.shouldHideMenu) {
                    this.$rootScope.shouldHideMenu = false;
                    this.$location.path("/Home");
                }
                // Make sure our local data matches
                this.siteInfo.userInfo.firstName = this.profileInfo.firstName;
                this.siteInfo.userInfo.lastName = this.profileInfo.lastName;
            }, (httpResponse) => {
                this.isLoading = false;
                this.resultMessage = httpResponse.data.exceptionMessage;
                this.isResultMessageGood = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user modifies the password field
         */
        onPasswordChange() {
            if (!this.profileInfo.password || this.profileInfo.password.length < 6) {
                this.passwordComplexity = "short";
                return;
            }
            const hasLetter = !!this.profileInfo.password.match(/[a-z]+/i);
            const hasNumber = !!this.profileInfo.password.match(/[0-9]+/);
            const hasSymbol = !!this.profileInfo.password.match(/[^a-z0-9]+/i);
            const isComplex = this.profileInfo.password.length >= 12
                && hasLetter
                && hasNumber
                && hasSymbol;
            this.passwordComplexity = isComplex ? "complex" : "simple";
        }
        onEmailFlagsChanged() {
            //public enum EnabledEmailsFlags : byte
            //{
            //    None = 0,
            //    BoardGroupEmails = 1,
            //    NonBoardGroupEmails = 2,
            //    Discussion = 4
            //}
            this.profileInfo.enabledEmailsFlags = 1 | (this.emailFlagsNonBoard ? 2 : 0) | (this.emailFlagsDiscussion ? 4 : 0);
            //console.log( "this.profileInfo.enabledEmailsFlags", this.profileInfo.enabledEmailsFlags );
        }
    }
    MyProfileController.$inject = ["$rootScope", "$http", "$location", "appCacheService", "SiteInfo", "$scope"];
    Ally.MyProfileController = MyProfileController;
    class MyProfileSaveResult {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("myProfile", {
    templateUrl: "/ngApp/chtn/member/my-profile.html",
    controller: Ally.MyProfileController
});

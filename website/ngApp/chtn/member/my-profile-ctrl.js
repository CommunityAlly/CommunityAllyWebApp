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
            this.showPassword = false;
            this.shouldShowPassword = false;
            this.selectedProfileView = "Primary";
            this.passwordComplexity = "short";
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
                        xhr.done((result) => {
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
            this.$http.put("/api/MyProfile", this.profileInfo).then(() => {
                this.profileInfo.password = null;
                this.resultMessage = "Your changes have been saved.";
                // $rootScope.hideMenu is true when this is the user's first login
                if (this.$rootScope.shouldHideMenu) {
                    this.$rootScope.shouldHideMenu = false;
                    this.$location.path("/Home");
                }
                this.isLoading = false;
            }, (httpResponse) => {
                this.isLoading = false;
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
    }
    MyProfileController.$inject = ["$rootScope", "$http", "$location", "appCacheService", "SiteInfo", "$scope"];
    Ally.MyProfileController = MyProfileController;
})(Ally || (Ally = {}));
CA.angularApp.component("myProfile", {
    templateUrl: "/ngApp/chtn/member/my-profile.html",
    controller: Ally.MyProfileController
});

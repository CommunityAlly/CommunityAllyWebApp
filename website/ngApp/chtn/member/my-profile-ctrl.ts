﻿declare function md5( input: string ): string;

namespace Ally
{
    export class SimpleUserEntry
    {
        firstName: string;
        lastName: string;
        fullName: string;
        email: string;
        userId: string;
        phoneNumber: string;
        avatarUrl: string;
        showPhoneInMeetNeighbors: boolean;
        postmarkReportedBadEmailUtc: Date;
        hasSmsConsent: boolean | null;
        hasEmail: boolean;
    }

    export class SimpleUserEntryWithTerms extends SimpleUserEntry
    {
        acceptedTermsDate: Date | null;
        smsConsentDate: Date | null;
    }

    class ProfileUserInfo extends SimpleUserEntryWithTerms
    {
        /** Not sent down, used when PUTing to update */
        password: string;
        alternatePhoneNumber: string;
        mailingAddressObject: FullAddress;
        defaultDigestFrequency: string;
        pendingEmailAddress: string;
        enabledEmailsFlags: number;
        mfaMethodsCsv: string;
        phoneVerificationDateUtc: Date;
    }

    export class PtaMember extends SimpleUserEntry
    {
        boardPosition: number;
    }


    /**
     * The controller for the profile page
     */
    export class MyProfileController implements ng.IController
    {
        static $inject = ["$rootScope", "$http", "$location", "appCacheService", "SiteInfo", "$scope"];

        isDemoSite: boolean;
        isLoading: boolean;
        canHideContactInfo: boolean;
        profileInfo: ProfileUserInfo;
        needsToAcceptTerms: boolean;
        hasAcceptedTerms: boolean;
        resultMessage: string;
        isResultMessageGood = false;
        initialProfileImageType: string;
        profileImageType: string;
        gravatarUrl: string;
        showPassword: boolean = false;
        shouldShowPassword: boolean = false;
        selectedProfileView: string = "Primary";
        passwordComplexity: string = "short";
        emailFlagsNonBoard = true;
        emailFlagsDiscussion = true;
        shouldShowPhoneVerifyModal = false;
        phoneVerifyCodeWasSent = false;
        phoneVerifyCode = "";
        originalPhoneNumber = "";


        /**
         * The constructor for the class
         */
        constructor( private $rootScope: ng.IRootScopeService, private $http: ng.IHttpService, private $location: ng.ILocationService, private appCacheService: AppCacheService, private siteInfo: Ally.SiteInfoService, private $scope: ng.IScope )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isDemoSite = HtmlUtil.getSubdomain() === "demosite";

            if( this.siteInfo.privateSiteInfo )
                this.canHideContactInfo = this.siteInfo.privateSiteInfo.canHideContactInfo;

            this.retrieveProfileData();


            const hookUpPhotoFileUpload = () =>
            {
                const uploader: any = $( '#JQFileUploader' );
                uploader.fileupload( {
                    dropZone: null, // Disable dropping of files
                    pasteZone: null, // Disable paste of data causing a file upload
                    add: ( e: any, data: any ) =>
                    {
                        data.url = "api/DocumentUpload/ProfileImage?ApiAuthToken=" + this.siteInfo.authToken;
                        if( this.siteInfo.publicSiteInfo.baseApiUrl )
                            data.url = this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload/ProfileImage";

                        this.$scope.$apply( () => this.isLoading = true );

                        const xhr = data.submit();
                        xhr.done( () =>
                        {
                            this.$scope.$apply( () =>
                            {
                                // Reload the page to see the changes
                                window.location.reload();
                            } );
                        } );
                    },
                    beforeSend: ( xhr: any ) =>
                    {
                        if( this.siteInfo.publicSiteInfo.baseApiUrl )
                            xhr.setRequestHeader( "Authorization", "Bearer " + this.$rootScope.authToken );
                        else
                            xhr.setRequestHeader( "ApiAuthToken", this.$rootScope.authToken );
                    },
                    fail: ( e: any, data: any ) =>
                    {
                        this.$scope.$apply( () =>
                        {
                            this.isLoading = false;
                            alert( "Upload Failed: " + data.jqXHR.responseJSON.exceptionMessage );
                        } );
                    }
                } );
            };

            setTimeout( hookUpPhotoFileUpload, 500 );
        }


        /**
         * Save the user's profile photo setting
         */
        saveProfilePhoto(type:string)
        {
            if( this.initialProfileImageType === "upload" )
            {
                if( !confirm( "Are you sure you want to change your profile image away from your uploaded photo? Your uploaded photo will be deleted." ) )
                {
                    this.profileImageType = this.initialProfileImageType;
                    return;
                }
            }

            this.isLoading = true;
            
            this.$http.put( "/api/MyProfile/ProfileImage?type=" + type, null ).then(
                () =>
                {
                    this.isLoading = false;
                    this.initialProfileImageType = this.profileImageType;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;

                    alert( "Failed to save: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user checks to box to see what they're typing
         */
        onShowPassword()
        {
            const passwordTextBox = <HTMLInputElement>document.getElementById( "passwordTextBox" );
            passwordTextBox.type = this.shouldShowPassword ? "text" : "password";
        }


        /**
         * Populate the page
         */
        retrieveProfileData()
        {
            this.isLoading = true;
            
            this.$http.get( "/api/MyProfile/MyInfo" ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<ProfileUserInfo> ) =>
            {
                this.isLoading = false;
                this.profileInfo = httpResponse.data;

                this.updateLocalProfileInfo();
            } );
        }


        updateLocalProfileInfo()
        {
            this.initialProfileImageType = "blank";
            if( !this.profileInfo.avatarUrl || this.profileInfo.avatarUrl.indexOf( "blank-headshot" ) !== -1 )
                this.initialProfileImageType = "blank";
            else if( this.profileInfo.avatarUrl && this.profileInfo.avatarUrl.indexOf( "gravatar" ) !== -1 )
                this.initialProfileImageType = "gravatar";
            else if( this.profileInfo.avatarUrl && this.profileInfo.avatarUrl.length > 0 )
                this.initialProfileImageType = "upload";

            if( this.initialProfileImageType !== "upload" )
                this.profileInfo.avatarUrl = null;

            this.profileImageType = this.initialProfileImageType;

            this.gravatarUrl = "https://www.gravatar.com/avatar/" + md5( ( this.profileInfo.email || "" ).toLowerCase() ) + "?s=80&d=identicon";

            // Don't show empty email address
            if( HtmlUtil.endsWith( this.profileInfo.email, "@condoally.com" ) )
                this.profileInfo.email = "";

            this.needsToAcceptTerms = this.profileInfo.acceptedTermsDate === null && !this.isDemoSite;
            this.hasAcceptedTerms = !this.needsToAcceptTerms; // Gets set by the checkbox
            this.$rootScope.shouldHideMenu = this.needsToAcceptTerms;

            this.emailFlagsNonBoard = ( this.profileInfo.enabledEmailsFlags & 2 ) === 2;
            this.emailFlagsDiscussion = ( this.profileInfo.enabledEmailsFlags & 4 ) === 4;

            this.originalPhoneNumber = this.profileInfo.phoneNumber;
        }


        /**
         * Occurs when the user hits the save button
         */
        onSaveInfo()
        {
            this.isLoading = true;
            this.resultMessage = "";

            this.$http.put( "/api/MyProfile/UpdateMyProfile", this.profileInfo ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<MyProfileSaveResult> ) =>
                {
                    this.isLoading = false;
                    this.profileInfo.password = null;
                    this.isResultMessageGood = true;
                    this.resultMessage = "Your changes have been saved.";

                    if( httpResponse.data.failedToUpdateEmail )
                    {
                        this.resultMessage = "Profile changes have been saved, except we were unable to update your email address: " + httpResponse.data.failureDetails;
                    }
                    else if( httpResponse.data.emailUpdatedWasInitiated )
                    {
                        this.profileInfo.pendingEmailAddress = this.profileInfo.email;
                        this.resultMessage = "Your changes have been saved. An email has been sent to confirm your email address change before it can take effect.";
                    }

                    // $rootScope.hideMenu is true when this is the user's first login
                    if( this.$rootScope.shouldHideMenu )
                    {
                        this.$rootScope.shouldHideMenu = false;
                        this.$location.path( "/Home" );
                    }

                    // Make sure our local data matches
                    this.profileInfo = httpResponse.data.updatedUserInfo;
                    this.siteInfo.userInfo.firstName = this.profileInfo.firstName;
                    this.siteInfo.userInfo.lastName = this.profileInfo.lastName;
                    this.updateLocalProfileInfo();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    this.resultMessage = httpResponse.data.exceptionMessage;
                    this.isResultMessageGood = false;
                    alert( "Failed to save: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user modifies the password field
         */
        onPasswordChange()
        {
            if( !this.profileInfo.password || this.profileInfo.password.length < 6 )
            {
                this.passwordComplexity = "short";
                return;
            }

            const hasLetter = !!this.profileInfo.password.match( /[a-z]+/i );
            const hasNumber = !!this.profileInfo.password.match( /[0-9]+/ );
            const hasSymbol = !!this.profileInfo.password.match( /[^a-z0-9]+/i );

            const isComplex = this.profileInfo.password.length >= 12
                && hasLetter
                && hasNumber
                && hasSymbol;

            this.passwordComplexity = isComplex ? "complex" : "simple";
        }


        onEmailFlagsChanged()
        {
            //public enum EnabledEmailsFlags : byte
            //{
            //    None = 0,
            //    BoardGroupEmails = 1,
            //    NonBoardGroupEmails = 2,
            //    Discussion = 4
            //}
            
            this.profileInfo.enabledEmailsFlags = 1 | ( this.emailFlagsNonBoard ? 2 : 0 ) | ( this.emailFlagsDiscussion ? 4 : 0 );
            //console.log( "this.profileInfo.enabledEmailsFlags", this.profileInfo.enabledEmailsFlags );
        }


        /**
         * Occurs when the user presses the button to start the phone number verification status
         */
        showPhoneVerifyModal()
        {
            this.shouldShowPhoneVerifyModal = true;
            this.phoneVerifyCodeWasSent = false;
            this.phoneVerifyCode = "";
        }


        /**
         * Occurs when the user presses the button to send themselves a code to verify ownership of their phone number
         */
        sendPhoneVerifyCode()
        {
            this.isLoading = true;
            this.resultMessage = "";

            this.$http.get( "/api/MyProfile/SendPhoneVerifyCode" ).then(
                () =>
                {
                    this.isLoading = false;
                    this.phoneVerifyCodeWasSent = true;
                    this.phoneVerifyCode = "";

                    // Focus on the code field
                    window.setTimeout( () => document.getElementById( "phone-code-input" ).focus(), 100 );
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to send code: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user presses the button to submit the code to verify ownership of their phone number
         */
        verifyPhoneCode()
        {
            this.isLoading = true;
            this.resultMessage = "";

            const putBody = {
                verifyCode: this.phoneVerifyCode
            };

            this.$http.put( "/api/MyProfile/VerifyPhoneCode", putBody ).then(
                () =>
                {
                    this.profileInfo.phoneVerificationDateUtc = new Date();
                    this.profileInfo.hasSmsConsent = true;

                    this.isLoading = false;
                    this.phoneVerifyCodeWasSent = false;
                    this.shouldShowPhoneVerifyModal = false;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to verify code: " + httpResponse.data.exceptionMessage );
                }
            );
        }
    }


    class MyProfileSaveResult
    {
        failureDetails: string;
        failedToUpdateEmail: boolean;
        emailUpdatedWasInitiated: boolean;
        updatedUserInfo: ProfileUserInfo;
    }
}


CA.angularApp.component( "myProfile", {
    templateUrl: "/ngApp/chtn/member/my-profile.html",
    controller: Ally.MyProfileController
} );
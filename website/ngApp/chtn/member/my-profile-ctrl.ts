declare function md5( input: string ): string;

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
        hasEmail: boolean;
    }

    export class SimpleUserEntryWithTerms extends SimpleUserEntry
    {
        acceptedTermsDate: Date;
    }

    class ProfileUserInfo extends SimpleUserEntryWithTerms
    {
        /** Not sent down, used when PUTing to update */
        password: string;
        includeInDiscussionEmail: boolean;
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
        saveButtonStyle: any;
        resultMessage: string;
        initialProfileImageType: string;
        profileImageType: string;
        gravatarUrl: string;
        showPassword: boolean = false;
        shouldShowPassword: boolean = false;


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


            let hookUpPhotoFileUpload = () =>
            {
                var uploader: any = $( '#JQFileUploader' );
                uploader.fileupload( {
                    beforeSend: ( xhr: any, data: any ) =>
                    {
                        xhr.setRequestHeader( "Authorization", "Bearer " + this.siteInfo.authToken );
                    },
                    add: ( e: any, data: any ) =>
                    {
                        data.url = "api/DocumentUpload/ProfileImage?ApiAuthToken=" + this.siteInfo.authToken;

                        this.$scope.$apply( () => this.isLoading = true );

                        var xhr = data.submit();
                        xhr.done( ( result: any ) =>
                        {
                            this.$scope.$apply( () =>
                            {
                                // Reload the page to see the changes
                                window.location.reload();
                            } );
                        } );
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
            
            this.$http.put( "/api/MyProfile/ProfileImage?type=" + type, null ).then( () =>
            {
                this.isLoading = false;
                this.initialProfileImageType = this.profileImageType;

            }, ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;

                alert( "Failed to save: " + httpResponse.data.exceptionMessage );
            } );
        }


        /**
         * Occurs when the user checks to box to see what they're typing
         */
        onShowPassword()
        {
            let passwordTextBox = <HTMLInputElement>document.getElementById( "passwordTextBox" );
            passwordTextBox.type = this.shouldShowPassword ? "text" : "password";
        }


        /**
         * Populate the page
         */
        retrieveProfileData()
        {
            this.isLoading = true;
            
            this.$http.get( "/api/MyProfile" ).then(( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.profileInfo = httpResponse.data;

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

                // Don't show empty e-mail address
                if( HtmlUtil.endsWith( this.profileInfo.email, "@condoally.com" ) )
                    this.profileInfo.email = "";

                this.needsToAcceptTerms = this.profileInfo.acceptedTermsDate === null && !this.isDemoSite;
                this.hasAcceptedTerms = !this.needsToAcceptTerms; // Gets set by the checkbox
                this.$rootScope.hideMenu = this.needsToAcceptTerms;

                // Was used before, here for covenience
                this.saveButtonStyle = {
                    width: "100px",
                    "font-size": "1em"
                };
            } );
        }


        /**
         * Occurs when the user hits the save button
         */
        onSaveInfo()
        {
            this.isLoading = true;

            this.$http.put( "/api/MyProfile", this.profileInfo ).then( () =>
            {
                this.resultMessage = "Your changes have been saved.";

                // $rootScope.hideMenu is true when this is the user's first login
                if( this.$rootScope.hideMenu )
                {
                    this.$rootScope.hideMenu = false;
                    this.$location.path( "/Home" );
                }

                this.isLoading = false;

            }, ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;

                alert( "Failed to save: " + httpResponse.data.exceptionMessage );
            } );
        }
    }
}


CA.angularApp.component( "myProfile", {
    templateUrl: "/ngApp/chtn/member/my-profile.html",
    controller: Ally.MyProfileController
} );
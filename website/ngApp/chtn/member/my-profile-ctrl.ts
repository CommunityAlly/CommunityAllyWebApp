namespace Ally
{
    /**
     * The controller for the profile page
     */
    export class MyProfileController implements ng.IController
    {
        static $inject = ["$rootScope", "$http", "$location", "appCacheService", "SiteInfo"];

        isDemoSite: boolean;
        isLoading: boolean;
        canHideContactInfo: boolean;
        profileInfo: any;
        needsToAcceptTerms: boolean;
        hasAcceptedTerms: boolean;
        saveButtonStyle: any;
        resultMessage: string;


        /**
         * The constructor for the class
         */
        constructor( private $rootScope: ng.IRootScopeService, private $http: ng.IHttpService, private $location: ng.ILocationService, private appCacheService: AppCacheService, private siteInfo: Ally.SiteInfoService )
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

            this.retrieveItems();
        }


        /**
         * Populate the page
         */
        retrieveItems()
        {
            this.isLoading = true;

            var innerThis = this;
            this.$http.get( "/api/MyProfile" ).then( function( httpResponse )
            {
                innerThis.isLoading = false;
                innerThis.profileInfo = httpResponse.data;

                // Don't show empty e-mail address
                if( HtmlUtil.endsWith( innerThis.profileInfo.email, "@condoally.com" ) )
                    innerThis.profileInfo.email = "";

                innerThis.needsToAcceptTerms = innerThis.profileInfo.acceptedTermsDate === null && !this.isDemoSite;
                innerThis.hasAcceptedTerms = !innerThis.needsToAcceptTerms; // Gets set by the checkbox
                innerThis.$rootScope.hideMenu = innerThis.needsToAcceptTerms;

                // Was used before, here for covenience
                innerThis.saveButtonStyle = {
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

            var innerThis = this;
            this.$http.put( "/api/MyProfile", this.profileInfo ).then( function()
            {
                innerThis.resultMessage = "Your changes have been saved.";

                // $rootScope.hideMenu is true when this is the user's first login
                if( innerThis.$rootScope.hideMenu )
                {
                    innerThis.$rootScope.hideMenu = false;
                    innerThis.$location.path( "/Home" );
                }

                innerThis.isLoading = false;

            }, function( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> )
            {
                innerThis.isLoading = false;

                alert( "Failed to save: " + httpResponse.data.exceptionMessage );
            } );
        }
    }
}


CA.angularApp.component( "myProfile", {
    templateUrl: "/ngApp/chtn/member/my-profile.html",
    controller: Ally.MyProfileController
} );
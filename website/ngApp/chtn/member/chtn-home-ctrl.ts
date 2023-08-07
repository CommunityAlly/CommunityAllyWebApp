namespace Ally
{
    interface IHomeRouteParams extends ng.route.IRouteParamsService
    {
        discussionThreadId: string;
    }


    /**
     * The controller for the group site home page
     */
    export class ChtnHomeController implements ng.IController
    {
        static $inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "$scope", "$routeParams", "$sce"];

        welcomeMessage: string;
        isWelcomeMessageHtml: boolean;
        canMakePayment: boolean;
        isFirstVisit: boolean;
        isSiteManager: boolean;
        showFirstVisitModal: boolean;
        allyAppName: string;
        homeRightColumnType: string;
        showDiscussionThreads: boolean = false;
        autoOpenDiscussionThreadId: number;
        showLocalNews: boolean = false;
        shouldShowAlertSection: boolean;
        usersCommittees: Committee[];
        testPay_ShouldShow: boolean = false;
        testPay_ReturnUrl: string;
        testPay_Amt: number;
        testPay_isValid: boolean = false;
        testPay_IpnUrl: string;
        testPay_UserFirst: string;
        testPay_UserLast: string;
        testPay_Description: string;
        allySurvey: AllySurveyInfo;
        shouldShowOwnerFinanceTxn: boolean = false;

        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private $rootScope: ng.IRootScopeService,
            private siteInfo: Ally.SiteInfoService,
            private $timeout: ng.ITimeoutService,
            private $scope: ng.IScope,
            private $routeParams: IHomeRouteParams,
            private $sce: ng.ISCEService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.testPay_ShouldShow = false; //this.siteInfo.publicSiteInfo.shortName === "qa" || this.siteInfo.publicSiteInfo.shortName === "localtest";
            if( this.testPay_ShouldShow )
            {
                this.testPay_ReturnUrl = window.location.href;
                this.testPay_IpnUrl = this.siteInfo.publicSiteInfo.baseUrl + "/api/PayPalIpn";
                this.testPay_UserFirst = this.siteInfo.userInfo.firstName;
                this.testPay_UserLast = this.siteInfo.userInfo.lastName;
                this.testPay_Description = "Assessment for " + this.siteInfo.publicSiteInfo.fullName;
            }

            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.isWelcomeMessageHtml = this.welcomeMessage && this.welcomeMessage.indexOf( "<" ) > -1;
            if( this.isWelcomeMessageHtml )
            {
                this.welcomeMessage = this.$sce.trustAsHtml( this.welcomeMessage );
                RichTextHelper.makeLinksOpenNewTab( "welcome-message-panel" );
            }

            this.canMakePayment = this.siteInfo.privateSiteInfo.isPaymentEnabled && !this.siteInfo.userInfo.isRenter;
            if( this.canMakePayment )
            {
                // Temporary logic until we're full to Stripe. If this site only has Dwolla active
                // and this user is not already active with Dwolla then they can't make payments.
                const onlyDwollaIsActive = this.siteInfo.privateSiteInfo.isDwollaPaymentActive && !this.siteInfo.privateSiteInfo.isWePayPaymentActive && !this.siteInfo.privateSiteInfo.isStripePaymentActive;
                if( onlyDwollaIsActive && !this.siteInfo.userInfo.dwollaFundingSourceIsVerified )
                    this.canMakePayment = false;
            }
            this.shouldShowOwnerFinanceTxn = this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn && !this.siteInfo.userInfo.isRenter;
            
            this.isFirstVisit = this.siteInfo.userInfo.lastLoginDateUtc === null;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showFirstVisitModal = this.isFirstVisit && !this.$rootScope.hasClosedFirstVisitModal && this.siteInfo.privateSiteInfo.siteLaunchedDateUtc === null;
            
            this.allyAppName = AppConfig.appName;

            this.homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType;
            if( !this.homeRightColumnType && this.homeRightColumnType !== "" )
                this.homeRightColumnType = "localnews";

            if( this.siteInfo.privateSiteInfo.creationDate > Ally.SiteInfoService.AlwaysDiscussDate )
            {
                this.showDiscussionThreads = true;
                this.showLocalNews = this.homeRightColumnType.indexOf( "localnews" ) > -1;
            }
            else
            {
                this.showDiscussionThreads = this.homeRightColumnType.indexOf( "chatwall" ) > -1;
                this.showLocalNews = this.homeRightColumnType.indexOf( "localnews" ) > -1;
            }

            if( this.showDiscussionThreads && this.$routeParams && HtmlUtil.isNumericString( this.$routeParams.discussionThreadId ) )
                this.autoOpenDiscussionThreadId = parseInt( this.$routeParams.discussionThreadId );

            var innerThis = this;
            this.$scope.$on( "homeHasActivePolls", () => innerThis.shouldShowAlertSection = true );
            
            this.$http.get( "/api/Committee/MyCommittees", { cache: true } ).then( ( response: ng.IHttpPromiseCallbackArg<Committee[]> ) =>
            {
                this.usersCommittees = response.data;

                if( this.usersCommittees )
                    this.usersCommittees = _.sortBy( this.usersCommittees, c => c.name.toLowerCase() );
            } );

            // Delay the survey check since it's low priority and it lets the other parts of the page load faster
            if( AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa" )
                this.$timeout( () => this.checkForSurveys(), 250 );
        }


        /**
        * See if there's any surveys waiting to be completed for the current group+user
        */
        checkForSurveys()
        {
            this.$http.get( "/api/AllySurvey/AnySurvey" ).then(
                ( response: ng.IHttpPromiseCallbackArg<AllySurveyInfo> ) =>
                {
                    this.allySurvey = response.data;
                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    console.log( "Failed to load ally survey", errorResponse.data.exceptionMessage );
                }
            );

            this.allySurvey = null;
        }


        onTestPayAmtChange()
        {
            this.testPay_isValid = this.testPay_Amt > 5 && this.testPay_Amt < 5000;
        }


        hideFirstVisit()
        {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        }
    }


    class AllySurveyInfo
    {
        surveyDescription: string;
        urlDescription: string;
        url: string;
    }
}


CA.angularApp.component( "chtnHome", {
    templateUrl: "/ngApp/chtn/member/chtn-home.html",
    controller: Ally.ChtnHomeController
} );
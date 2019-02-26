namespace Ally
{
    /**
     * The controller for the group site home page
     */
    export class ChtnHomeController implements ng.IController
    {
        static $inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "$scope"];

        welcomeMessage: string;
        canMakePayment: boolean;
        isFirstVisit: boolean;
        isSiteManager: boolean;
        showFirstVisitModal: boolean;
        allyAppName: string;
        homeRightColumnType: string;
        showDiscussionThreads: boolean = false;
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


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private $rootScope: ng.IRootScopeService, private siteInfo: Ally.SiteInfoService, private $timeout: ng.ITimeoutService, private $scope:ng.IScope )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.testPay_ShouldShow = this.siteInfo.publicSiteInfo.shortName === "qa"
                                    || this.siteInfo.publicSiteInfo.shortName === "localtest";
            if( this.testPay_ShouldShow )
            {
                this.testPay_ReturnUrl = window.location.href;
                this.testPay_IpnUrl = this.siteInfo.publicSiteInfo.baseUrl + "/api/PayPalIpn";
                this.testPay_UserFirst = this.siteInfo.userInfo.firstName;
                this.testPay_UserLast = this.siteInfo.userInfo.lastName;
                this.testPay_Description = "Assessment for " + this.siteInfo.publicSiteInfo.fullName;
            }

            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;

            this.canMakePayment = this.siteInfo.privateSiteInfo.isPaymentEnabled && !this.siteInfo.userInfo.isRenter;
            
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
                this.showLocalNews = this.homeRightColumnType.indexOf( "localnews" ) !== -1;
            }
            else
            {
                this.showDiscussionThreads = this.homeRightColumnType === "chatwall";
                this.showLocalNews = this.homeRightColumnType === "localnews";
            }

            var subDomain = HtmlUtil.getSubdomain( window.location.host );

            var innerThis = this;
            this.$scope.$on( "homeHasActivePolls", () => innerThis.shouldShowAlertSection = true );
            
            this.$http.get( "/api/Committee/MyCommittees", { cache: true } ).then( ( response: ng.IHttpPromiseCallbackArg<Committee[]> ) =>
            {
                this.usersCommittees = response.data;

                if( this.usersCommittees )
                    this.usersCommittees = _.sortBy( this.usersCommittees, c => c.name.toLowerCase() );
            } );
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
}


CA.angularApp.component( "chtnHome", {
    templateUrl: "/ngApp/chtn/member/chtn-home.html",
    controller: Ally.ChtnHomeController
} );
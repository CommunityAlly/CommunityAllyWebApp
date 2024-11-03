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
        showDiscussionThreads: boolean = false;
        shouldShowBulletinBoard: boolean = false;
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
        userFirstName = "";
        shouldShowAppChangeModal = false;
        appChanges: AllyAppChangeLogEntry[] = null;
        shouldShowEditWelcomeModal = false;
        welcomeTinyMceEditor: ITinyMce;
        isLoadingWelcome = false;
        shouldShowGoodNeighbor2024 = false;


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
            this.userFirstName = this.siteInfo.userInfo.firstName;

            this.handleWelcomeMessage();

            this.canMakePayment = this.siteInfo.privateSiteInfo.isPaymentEnabled && !this.siteInfo.userInfo.isRenter;
            this.shouldShowOwnerFinanceTxn = this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn && !this.siteInfo.userInfo.isRenter;
            
            this.isFirstVisit = this.siteInfo.userInfo.lastLoginDateUtc === null;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showFirstVisitModal = this.isFirstVisit && !this.$rootScope.hasClosedFirstVisitModal && this.siteInfo.privateSiteInfo.siteLaunchedDateUtc === null;

            // Maybe reactivate in 2025
            //this.shouldShowGoodNeighbor2024 = this.isSiteManager && moment().isBefore( moment( new Date( 2024, 8, 29 ) ) );
            //if( this.shouldShowGoodNeighbor2024 && window.localStorage && window.localStorage["chtnHome_disableShowGoodNeighbor2024"] )
            //{
            //    if( window.localStorage["chtnHome_disableShowGoodNeighbor2024"] === "true" )
            //        this.shouldShowGoodNeighbor2024 = false;
            //}
            //if( window.localStorage )
            //    window.localStorage.removeItem( "chtnHome_disableShowGoodNeighbor2024" );

            this.allyAppName = AppConfig.appName;

            const homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType || "";
            //if( HtmlUtil.isNullOrWhitespace( homeRightColumnType ) )
            //    homeRightColumnType = "localnews";

            if( this.siteInfo.privateSiteInfo.creationDate > Ally.SiteInfoService.AlwaysDiscussDate )
            {
                if( this.siteInfo.privateSiteInfo.creationDate > Ally.SiteInfoService.AlwaysBulletinBoardDate )
                    this.shouldShowBulletinBoard = true;
                else
                {
                    this.shouldShowBulletinBoard = homeRightColumnType.indexOf( "bulletinboard" ) > -1;
                    this.showDiscussionThreads = !this.shouldShowBulletinBoard;
                }

                this.showLocalNews = homeRightColumnType.indexOf( "localnews" ) > -1;
            }
            else
            {
                this.showDiscussionThreads = homeRightColumnType.indexOf( "chatwall" ) > -1;
                this.showLocalNews = homeRightColumnType.indexOf( "localnews" ) > -1;
                this.shouldShowBulletinBoard = homeRightColumnType.indexOf( "bulletinboard" ) > -1;
            }

            if( this.showDiscussionThreads && this.$routeParams && HtmlUtil.isNumericString( this.$routeParams.discussionThreadId ) )
                this.autoOpenDiscussionThreadId = parseInt( this.$routeParams.discussionThreadId );

            this.$scope.$on( "homeHasActivePolls", () => this.shouldShowAlertSection = true );
            
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
            this.allySurvey = null;

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


        showAppChanges()
        {
            this.shouldShowAppChangeModal = true;

            if( !this.appChanges )
            {
                this.$http.get( "/api/AllyAppChangeLog/FullLog" ).then(
                    ( response: ng.IHttpPromiseCallbackArg<AllyAppChangeLogEntry[]> ) =>
                    {
                        this.appChanges = response.data;
                    },
                    ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                    {
                        alert( "Failed to load changes: " + errorResponse.data.exceptionMessage );
                    }
                );
            }
        }


        showEditWelcomeModal()
        {
            this.shouldShowEditWelcomeModal = true;

            HtmlUtil2.initTinyMce( "welcome-tiny-mce-editor", 400 ).then( e =>
            {
                this.welcomeTinyMceEditor = e;

                if( this.welcomeTinyMceEditor )
                {
                    if( this.siteInfo.privateSiteInfo.welcomeMessage )
                        this.welcomeTinyMceEditor.setContent( this.siteInfo.privateSiteInfo.welcomeMessage );

                    this.welcomeTinyMceEditor.on( "keyup", () =>
                    {
                        // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                        //this.$scope.$apply( () =>
                        //{
                        //    this.onWelcomeMessageEdit();
                        //} );
                    } );
                }
                //else
                //    this.tinyMceDidNotLoad = true;
            } );
        }


        handleWelcomeMessage()
        {
            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.isWelcomeMessageHtml = this.welcomeMessage && this.welcomeMessage.indexOf( "<" ) > -1;
            if( this.isWelcomeMessageHtml )
            {
                this.welcomeMessage = this.$sce.trustAsHtml( this.welcomeMessage );
                RichTextHelper.makeLinksOpenNewTab( "welcome-message-panel" );
            }
        }


        updateWelcomeMessage()
        {
            const updateInfo = {
                WelcomeMessage: this.welcomeTinyMceEditor.getContent()
            };

            this.isLoadingWelcome = true;

            this.$http.put( "/api/Settings/UpdateSiteSettings", updateInfo ).then(
                () =>
                {
                    this.isLoadingWelcome = false;
                    this.siteInfo.privateSiteInfo.welcomeMessage = this.welcomeTinyMceEditor.getContent();
                    this.handleWelcomeMessage();
                    this.shouldShowEditWelcomeModal = false;
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoadingWelcome = false;
                    alert( "Failed to save: " + response.data.exceptionMessage );
                }
            );
        }


        dismissGoodNeighbor2024()
        {
            this.shouldShowGoodNeighbor2024 = false;
            if( window.localStorage )
                window.localStorage["chtnHome_disableShowGoodNeighbor2024"] = "true";
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
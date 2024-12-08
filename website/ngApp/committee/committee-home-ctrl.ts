﻿namespace Ally
{
    interface ICommitteeHomeRouteParams extends ng.route.IRouteParamsService
    {
        discussionThreadId: string;
    }


    /**
     * The controller for the committee home page
     */
    export class CommitteeHomeController implements ng.IController
    {
        static $inject = ["SiteInfo", "fellowResidents", "$routeParams"];

        committee: Ally.Committee;
        canManage: boolean = false;
        autoOpenDiscussionThreadId: number;
        shouldShowBulletinBoard = true;


        /**
         * The constructor for the class
         */
        constructor( private siteInfo: Ally.SiteInfoService, private fellowResidents: Ally.FellowResidentsService, private $routeParams: ICommitteeHomeRouteParams )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;

            // Make sure committee members can manage their data
            if( this.committee && !this.canManage )
                this.fellowResidents.isCommitteeMember( this.committee.committeeId ).then( isCommitteeMember => this.canManage = isCommitteeMember );

            if( this.$routeParams && HtmlUtil.isNumericString( this.$routeParams.discussionThreadId ) )
                this.autoOpenDiscussionThreadId = parseInt( this.$routeParams.discussionThreadId );

            const homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType || "";
            
            if( this.siteInfo.privateSiteInfo.creationDate > Ally.SiteInfoService.AlwaysDiscussDate )
            {
                if( this.siteInfo.privateSiteInfo.creationDate > Ally.SiteInfoService.AlwaysBulletinBoardDate )
                    this.shouldShowBulletinBoard = true;
                else
                    this.shouldShowBulletinBoard = homeRightColumnType.indexOf( "bulletinboard" ) > -1;
            }
            else
                this.shouldShowBulletinBoard = homeRightColumnType.indexOf( "bulletinboard" ) > -1;
        }
    }
}


CA.angularApp.component( "committeeHome", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/committee/committee-home.html",
    controller: Ally.CommitteeHomeController
} );
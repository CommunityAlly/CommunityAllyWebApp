/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />


namespace Ally
{
    /**
     * The controller for the committee home page
     */
    export class CommitteeHomeController implements ng.IController
    {
        static $inject = ["SiteInfo", "fellowResidents"];

        committee: Ally.Committee;
        canManage: boolean = false;


        /**
         * The constructor for the class
         */
        constructor( private siteInfo: Ally.SiteInfoService, private fellowResidents: Ally.FellowResidentsService )
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
                this.fellowResidents.isCommitteeMember( this.committee.committeeId, this.siteInfo.userInfo.userId ).then( isCommitteeMember => this.canManage = isCommitteeMember );
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
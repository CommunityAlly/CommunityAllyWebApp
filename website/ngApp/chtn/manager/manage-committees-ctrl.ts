/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="../../Services/html-util.ts" />


namespace Ally
{
    export class Committee
    {
        committeeId: number;
        name: string;
        committeeType: string;
        creationDateUtc: Date;
        deactivationDateUtc: Date;
        contactMemberUserId: string;
    }


    /**
     * The controller for the page to add, edit, and delete committees
     */
    export class ManageCommitteesController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$cacheFactory"];

        includeInactive = false;
        committees: Committee[] = [];
        newCommittee: Committee = new Committee();
        isLoading = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $cacheFactory: ng.ICacheFactoryService )
        {
            this.newCommittee.committeeType = "Ongoing";
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.retrieveCommittees();
        }


        /**
        * Called when the user chooses to deactivate a committee
        */
        toggleCommitteeActive( committee: Committee )
        {
            this.isLoading = true;

            var putUri = ( committee.deactivationDateUtc ? "/api/Committee/Reactivate/" : "/api/Committee/Deactivate/" ) + committee.committeeId;

            var innerThis = this;
            this.$http.put( putUri, null ).success(( committees: Committee[] ) =>
            {
                innerThis.isLoading = false;
                innerThis.retrieveCommittees();

            } ).error(( exc: Ally.ExceptionResult ) =>
            {
                innerThis.isLoading = false;
                alert( "Failed to retrieve the modify committee: " + exc.exceptionMessage );
            } );
        }


        /**
        * Retrieve the list of available committees
        */
        retrieveCommittees()
        {
            this.isLoading = true;

            var innerThis = this;
            this.$http.get( "/api/Committee" ).success(( committees: Committee[] ) =>
            {
                innerThis.isLoading = false;
                innerThis.committees = committees;

                // Convert the last login timestamps to local time
                _.forEach( committees, c => c.creationDateUtc = moment.utc( c.creationDateUtc ).toDate() );

            } ).error(( exc: Ally.ExceptionResult ) =>
            {
                innerThis.isLoading = false;
                alert( "Failed to retrieve the committee listing" );
            } );
        }


        /**
        * Create a new committee
        */
        createCommittee()
        {
            if( HtmlUtil.isNullOrWhitespace( this.newCommittee.name ) )
            {
                alert( "Please enter a name." );
                return;
            }

            this.isLoading = true;

            var postUri = "/api/Committee?name=" + encodeURIComponent( this.newCommittee.name ) + "&type=" + encodeURIComponent( this.newCommittee.committeeType );

            var innerThis = this;
            this.$http.post( postUri, null ).success(() =>
            {
                innerThis.isLoading = false;
                innerThis.retrieveCommittees();

            } ).error(( error: ExceptionResult ) =>
            {
                innerThis.isLoading = false;
                alert( "Failed to create the committee: " + error.exceptionMessage );
            } );
        }
    }
}


CA.angularApp.component( "manageCommittees", {
    templateUrl: "/ngApp/chtn/manager/manage-committees.html",
    controller: Ally.ManageCommitteesController
} );
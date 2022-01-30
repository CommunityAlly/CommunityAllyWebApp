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
        isPrivate: boolean = false;
    }


    /**
     * The controller for the page to add, edit, and delete committees
     */
    export class ManageCommitteesController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$cacheFactory"];

        includeInactive = false;
        activeCommittees: Committee[] = [];
        inactiveCommittees: Committee[] = [];
        showInactiveCommittees: boolean = false;
        editCommittee: Committee = null;
        isLoading = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $cacheFactory: ng.ICacheFactoryService )
        {
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
        startEditCommittee( committee: Committee )
        {
            this.editCommittee = committee;
        }


        /**
        * Called when the user chooses to deactivate a committee
        */
        showCreateModal()
        {
            this.editCommittee = new Committee();
            this.editCommittee.committeeType = "Ongoing";
        }


        /**
        * Called when the user chooses to deactivate a committee
        */
        toggleCommitteeActive( committee: Committee )
        {
            this.isLoading = true;

            const putUri = ( committee.deactivationDateUtc ? "/api/Committee/Reactivate/" : "/api/Committee/Deactivate/" ) + committee.committeeId;

            this.$http.put( putUri, null ).then(
                ( committees: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.retrieveCommittees();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve the modify committee: " + response.data.exceptionMessage );
                }
            );
        }


        /**
        * Retrieve the list of available committees
        */
        retrieveCommittees()
        {
            this.isLoading = true;

            this.$http.get( "/api/Committee?includeInactive=true" ).then(
                ( response: ng.IHttpPromiseCallbackArg<Committee[]> ) =>
                {
                    const committees = response.data;

                    this.isLoading = false;
                    this.activeCommittees = _.filter( committees, c => !c.deactivationDateUtc );
                    this.inactiveCommittees = _.filter( committees, c => !!c.deactivationDateUtc );

                    this.activeCommittees = _.sortBy( this.activeCommittees, c => c.name.toLowerCase() );
                    this.inactiveCommittees = _.sortBy( this.inactiveCommittees, c => c.name.toLowerCase() );

                    // Convert the last login timestamps to local time
                    //_.forEach( committees, c => c.creationDateUtc = moment.utc( c.creationDateUtc ).toDate() );

                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve the committee listing: " + response.data.exceptionMessage );
                }
            );
        }


        /**
        * Create a new committee
        */
        saveCommittee()
        {
            if( HtmlUtil.isNullOrWhitespace( this.editCommittee.name ) )
            {
                alert( "Please enter a name for the new committee." );
                return;
            }

            if( !this.editCommittee.committeeType )
            {
                alert( "Please select a type for the new committee." );
                return;
            }

            this.isLoading = true;

            var saveUri = `/api/Committee${( this.editCommittee.committeeId ? ("/" + this.editCommittee.committeeId.toString()) : "" )}?name=${encodeURIComponent( this.editCommittee.name )}&type=${encodeURIComponent( this.editCommittee.committeeType )}&isPrivate=${this.editCommittee.isPrivate.toString()}`;

            let httpFunc = this.editCommittee.committeeId ? this.$http.put : this.$http.post;
            httpFunc( saveUri, null ).then(
                () =>
                {
                    this.isLoading = false;
                    this.editCommittee = null;
                    this.retrieveCommittees();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to save the committee: " + response.data.exceptionMessage );
                }
            );
        }
    }
}


CA.angularApp.component( "manageCommittees", {
    templateUrl: "/ngApp/chtn/manager/manage-committees.html",
    controller: Ally.ManageCommitteesController
} );
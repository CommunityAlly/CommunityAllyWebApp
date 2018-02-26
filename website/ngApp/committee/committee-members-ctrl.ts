/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />


namespace Ally
{
    /**
     * The controller for the committee home page
     */
    export class CommitteeMembersController implements ng.IController
    {
        static $inject = ["$http", "fellowResidents"];

        isLoading: boolean = false;
        committee: Ally.Committee;
        members: FellowChtnResident[];
        userForAdd: FellowChtnResident;
        allGroupMembers: FellowChtnResident[];

        // The list of all group members that are not already members of this committee
        filteredGroupMembers: FellowChtnResident[];


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private fellowResidents: Ally.FellowResidentsService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.populateAllMembers();
        }


        populateAllMembers()
        {
            this.isLoading = true;

            this.fellowResidents.getResidents().then( residents =>
            {
                this.allGroupMembers = residents;
                this.getMembers();
            });
        }


        getMembers()
        {
            this.isLoading = true;

            this.$http.get( `/api/Committee/${this.committee.committeeId}/Members` ).then( ( response: ng.IHttpPromiseCallbackArg<FellowChtnResident[]> ) =>
            {
                this.isLoading = false;
                this.members = response.data;

                var isMember = ( u: FellowChtnResident ) => _.some( this.members, ( m: FellowChtnResident ) => m.userId === u.userId );

                this.filteredGroupMembers = _.filter( this.allGroupMembers, m => !isMember(m) );

            }, ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to retrieve committee members, please refresh the page to try again" );
            } );
        }


        /**
         * Add a member to this committee
         */
        addSelectedMember()
        {
            if( !this.userForAdd )
                return;

            this.isLoading = true;

            this.$http.put( `/api/Committee/${this.committee.committeeId}/AddMember?userId=${this.userForAdd.userId}`, null ).then( ( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.getMembers();

            }, ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to add member, please refresh the page to try again: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Remove a member from this committee
         */
        removeMember( member: FellowChtnResident )
        {
            if( !confirm( "Are you sure you want to remove this person from this committee?" ) )
                return;
            
            this.isLoading = true;

            this.$http.put( `/api/Committee/${this.committee.committeeId}/RemoveMember?userId=${member.userId}`, null ).then(( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.getMembers();

            }, ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to remove member, please refresh the page to try again: " + response.data.exceptionMessage );
            } );
        }
    }
}


CA.angularApp.component( "committeeMembers", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/committee/committee-members.html",
    controller: Ally.CommitteeMembersController
} );
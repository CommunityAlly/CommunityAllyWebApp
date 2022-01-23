namespace Ally
{
    /**
     * Represents a group e-mail address to which e-mails sent get forwarded to the whole group
     */
    export class GroupEmailInfo
    {
        recipientType: string;
        recipientTypeName: string;
        displayName: string;
        usersFullNames: string[];
        sortOrder: number;
        isRestrictedGroup: boolean;
    }


    export class GroupEmailGroups
    {
        standardGroups: GroupEmailInfo[];
        customGroups: CustomEmailGroup[];
    }


    export class CustomEmailGroup
    {
        customGroupEmailId: number;
        shortName: string;
        description: string;
        createdByUserId: string;
        createdOnDateUtc: Date;
        members: CustomEmailGroupMember[];

        // Populated locally
        usersFullNames: string[];
    }


    export class CustomEmailGroupMember
    {
        customGroupEmailMemberId: number;
        customGroupEmailId: number;
        userId: string;
        addedByUserId: string;
        addedOnDateUtc: Date;
    }


    class HomeEntry
    {
        memberHomeId: number;
        userId: string;
        unitId: number;
        isRenter: boolean;
    }


    /**
     * Represents a member of a CHTN group
     */
    export class FellowChtnResident extends SimpleUserEntry
    {
        homes: HomeEntry[];
        boardPosition: number;
        wePayAutoPayIsActive: boolean;
        showPhoneInMeetNeighbors: boolean;
        postmarkReportedBadEmailUtc: Date;
        includeInDiscussionEmail: boolean;
        isSiteManager: boolean;

        // Not from the server, used locally
        boardPositionName: string;
        isAssociated: boolean;
    }


    export class CommitteeListingInfo
    {
        committeeId: number;
        committeeName: string;
        contactUser: SimpleUserEntry;
        isPrivate: boolean;
    }

    export class UnitListing
    {
        name: string;
        unitId: number;
        owners: FellowChtnResident[];
        renters: FellowChtnResident[];
    }

    export class FellowResidents
    {
        byUnit: UnitListing[];
        residents: FellowChtnResident[];
        committees: CommitteeListingInfo[];
        ptaMembers: PtaMember[];
    }


    /**
     * Provides methods to accessing group member and home information
     */
    export class FellowResidentsService
    {
        static BoardPositionNames: { id: number, name: string }[] = [
            { id: 0, name: "None" },
            { id: 1, name: "President" },
            { id: 2, name: "Treasurer" },
            { id: 4, name: "Secretary" },
            { id: 8, name: "Director/Member at Large" },
            { id: 16, name: "Vice President" },
            { id: 32, name: "Property Manager" },
            { id: 64, name: "Secretary + Treasurer" }
        ];
        httpCache: ng.ICacheObject;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private $q: ng.IQService, private $cacheFactory: ng.ICacheFactoryService )
        {
            this.httpCache = $cacheFactory( "FellowResidentsService" );
        }


        /**
         * Get the residents for the current group
         */
        getResidents()
        {
            var innerThis = this;
            return this.$http.get( "/api/BuildingResidents", { cache: this.httpCache } ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<FellowResidents> )
            {
                return httpResponse.data.residents;

            }, function( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> )
            {
                return innerThis.$q.reject( httpResponse );
            } );
        }


        /**
         * Get the members for a committee
         */
        getCommitteeMembers(committeeId: number)
        {
            return this.$http.get( `/api/Committee/${committeeId}/Members` ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<FellowChtnResident[]> ) =>
            {
                return httpResponse.data;

            }, function ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> )
            {
                return this.$q.reject( httpResponse );
            } );
        }


        /**
         * Determine if a user is a committee member
         */
        isCommitteeMember( committeeId: number, userId: string )
        {
            return this.$http.get( `/api/Committee/${committeeId}/IsMember`, { cache: this.httpCache } ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<boolean> ) =>
            {
                return httpResponse.data;

            }, function ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> )
            {
                return this.$q.reject( httpResponse );
            } );
        }


        /**
         * Get the residents for an association, broken down by unit for easy display
         */
        getByUnits(): ng.IPromise<UnitListing[]>
        {
            var innerThis = this;
            return this.$http.get( "/api/BuildingResidents", { cache: this.httpCache } ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<FellowResidents> ) =>
            {
                return httpResponse.data.byUnit;

            }, ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                return innerThis.$q.reject( httpResponse );
            } );
        }


        /**
         * Get a list of residents and homes
         */
        getByUnitsAndResidents(): ng.IPromise<FellowResidents>
        {
            var innerThis = this;
            return this.$http.get( "/api/BuildingResidents", { cache: this.httpCache } ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<FellowResidents> ) =>
            {
                return httpResponse.data;

            }, ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                return this.$q.reject( httpResponse );
            } );
        }


        /**
         * Get the object describing the available group e-mail addresses
         */
        getGroupEmailObject(): ng.IPromise<GroupEmailInfo[]>
        {
            return this.$http.get( "/api/BuildingResidents/EmailGroups", { cache: this.httpCache } ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<GroupEmailInfo[]> )
            {
                return httpResponse.data;

            }, function( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> )
            {
                return this.$q.reject( httpResponse );
            } );

            //var innerThis = this;
            //return this.getByUnitsAndResidents().then( function( unitsAndResidents )
            //{
            //    var unitList = unitsAndResidents.byUnit;
            //    var allResidents = unitsAndResidents.residents;

            //    return innerThis.setupGroupEmailObject( allResidents, unitList, null );
            //} );
        }


        /**
         * Get the object describing the available group e-mail addresses
         */
        getAllGroupEmails(): ng.IPromise<GroupEmailGroups>
        {
            var innerThis = this;
            return this.$http.get( "/api/BuildingResidents/AllEmailGroups", { cache: this.httpCache } ).then( function ( httpResponse: ng.IHttpPromiseCallbackArg<GroupEmailGroups> )
            {
                return httpResponse.data;

            }, function ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> )
            {
                return this.$q.reject( httpResponse );
            } );

            //var innerThis = this;
            //return this.getByUnitsAndResidents().then( function( unitsAndResidents )
            //{
            //    var unitList = unitsAndResidents.byUnit;
            //    var allResidents = unitsAndResidents.residents;

            //    return innerThis.setupGroupEmailObject( allResidents, unitList, null );
            //} );
        }


        /**
         * Populate the lists of group e-mails
         */
        _setupGroupEmailObject( allResidents: any[], unitList: any[] )
        {
            var emailLists: any = {};

            emailLists = {
                    everyone: [],
                    owners: [],
                    renters: [],
                    board: [],
                    residentOwners: [],
                    nonResidentOwners: [],
                    residentOwnersAndRenters: [],
                    propertyManagers: [],
                    discussion: []
                };
            
            // Go through each resident and add them to each e-mail group they belong to
            for( var i = 0; i < allResidents.length; ++i )
            {
                var r = allResidents[i];

                var displayName = r.fullName + ( r.hasEmail ? "" : "*" );

                emailLists.everyone.push( displayName );

                var BoardPos_None = 0;
                var BoardPos_PropertyManager = 32;

                if( r.boardPosition !== BoardPos_None && r.boardPosition !== BoardPos_PropertyManager )
                    emailLists.board.push( displayName );

                if( r.boardPosition === BoardPos_PropertyManager )
                    emailLists.propertyManagers.push( displayName );

                if( r.includeInDiscussionEmail )
                    emailLists.discussion.push( displayName );

                var isOwner = false;
                var isRenter = false;
                var unitIsRented = false;

                for( var unitIndex = 0; unitIndex < r.homes.length; ++unitIndex )
                {
                    var simpleHome = r.homes[unitIndex];

                    if( !simpleHome.isRenter )
                    {
                        isOwner = true;
                        var unit = _.find( unitList, function( u ) { return u.unitId === simpleHome.unitId } );

                        unitIsRented = unit.renters.length > 0;
                    }

                    if( simpleHome.isRenter )
                        isRenter = true;
                }

                if( isOwner )
                {
                    emailLists.owners.push( displayName );

                    if( unitIsRented )
                        emailLists.nonResidentOwners.push( displayName );
                    else
                    {
                        emailLists.residentOwners.push( displayName );
                        emailLists.residentOwnersAndRenters.push( displayName );
                    }
                }

                if( isRenter )
                {
                    emailLists.renters.push( displayName );
                    emailLists.residentOwnersAndRenters.push( displayName );
                }
            }

            // If there are no renters then there are no non-residents so hide those lists
            if( emailLists.renters.length === 0 )
            {
                emailLists.residentOwners = [];
                emailLists.residentOwnersAndRenters = [];
                emailLists.nonResidentOwners = [];
            }

            return emailLists;
        }


        /**
         * Send an e-mail message to another user
         */
        sendMessage( recipientUserId: string, messageBody: string, messageSubject: string, shouldSendAsBoard: boolean )
        {
            var postData = {
                recipientUserId: recipientUserId,
                messageBody: messageBody,
                messageSubject: messageSubject,
                shouldSendAsBoard: shouldSendAsBoard
            };

            return this.$http.post( "/api/BuildingResidents/SendMessage", postData );
        }


        /**
         * Clear cached values, such as when the user changes values in Manage -> Residents
         */
        clearResidentCache()
        {
            this.httpCache.removeAll();
        }


        /**
         * Test if a board position is one of the officer positions
         */
        static isOfficerBoardPosition( boardPosition: number )
        {
            const OfficerPositions: number[] = [
                1, // President
                2, // Treasurer
                4, // Secretary
                16, // Vice President
                64, // Secretary + Treasurer
            ];

            return OfficerPositions.indexOf( boardPosition ) !== -1;
        }
    }
}


angular.module( "CondoAlly" ).service( "fellowResidents", ["$http", "$q", "$cacheFactory", Ally.FellowResidentsService] );
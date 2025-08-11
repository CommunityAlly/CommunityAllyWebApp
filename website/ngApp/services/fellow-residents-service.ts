namespace Ally
{
    /**
     * Represents a group email address to which emails sent get forwarded to the whole group
     */
    export class GroupEmailInfo
    {
        recipientType: string;
        recipientTypeName: string;
        displayName: string;
        usersFullNames: string[];
        memberUserIds: string[];
        sortOrder: number;
        isRestrictedGroup: boolean;
    }


    export class PollWhoCanVoteGroup extends GroupEmailInfo
    {
        numPossibleHomeVotes: number;
        numPossibleMemberVotes: number;
        homeNamesInvolved: string;
        memberNamesInvolved: string;
        renterNamesInvolved: string;
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
        allowPublicIncoming: boolean;
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
        isSiteManager: boolean;

        // Not from the server, used locally
        boardPositionName: string;
        isAssociated: boolean;
        dropDownAdditionalLabel: string;
    }


    export class FellowResidentCommittee extends FellowChtnResident
    {
        isContactMember: boolean;
    }


    export class CommitteeListingInfo
    {
        committeeId: number;
        committeeName: string;
        contactUser: SimpleUserEntry;
        isPrivate: boolean;
        members: BasicCommitteeMember[];
    }

    export class BasicCommitteeMember
    {
        fullName: string;
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
        public static readonly BoardPos_None: number = 0;
        public static readonly BoardPos_PropertyManager = 32;
        public static readonly CustomRecipientType = "CUSTOM";

        private static s_boardPositionNames: { id: number, name: string }[] = [
            { id: FellowResidentsService.BoardPos_None, name: "None" },
            { id: 1, name: "President" },
            { id: 2, name: "Treasurer" },
            { id: 4, name: "Secretary" },
            { id: 8, name: "Director/Member at Large" },
            { id: 16, name: "Vice President" },
            { id: FellowResidentsService.BoardPos_PropertyManager, name: "Property Manager" },
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
         * Get the names for the board positions. This was a static field, but then we introduce a
         * title rename for Block Club Ally
         */
        static getBoardPositionNames()
        {
            // This really only needs to run once, but it's so lightweight it's OK to call each time
            if( AppConfig.appShortName === BlockClubAppConfig.appShortName )
            {
                const directorPos = FellowResidentsService.s_boardPositionNames.find( bn => bn.id === 8 );
                if( directorPos )
                    directorPos.name = "Block Captain/Director";
            }

            return FellowResidentsService.s_boardPositionNames;
        }


        /**
         * Get the residents for the current group
         */
        getResidents()
        {
            return this.$http.get( "/api/BuildingResidents/ResidentsInGroup", { cache: this.httpCache } ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<FellowResidents> ) =>
                {
                    return httpResponse.data.residents;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    return this.$q.reject( httpResponse );
                }
            );
        }


        /**
         * Get the members for a committee
         */
        getCommitteeMembers(committeeId: number)
        {
            return this.$http.get( `/api/Committee/${committeeId}/Members` ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<FellowResidentCommittee[]> ) =>
                {
                    return httpResponse.data;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    return this.$q.reject( httpResponse );
                }
            );
        }


        /**
         * Determine if the logged-in user is a committee member
         */
        isCommitteeMember( committeeId: number )
        {
            return this.$http.get( `/api/Committee/${committeeId}/IsMember`, { cache: this.httpCache } ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<boolean> ) =>
                {
                    return httpResponse.data;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    return this.$q.reject( httpResponse );
                }
            );
        }


        /**
         * Get the residents for an association, broken down by unit for easy display
         */
        getByUnits(): ng.IPromise<UnitListing[]>
        {
            return this.$http.get( "/api/BuildingResidents/ResidentsInGroup", { cache: this.httpCache } ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<FellowResidents> ) =>
                {
                    return httpResponse.data.byUnit;

                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    return this.$q.reject( httpResponse );
                }
            );
        }


        /**
         * Get a list of residents and homes
         */
        getByUnitsAndResidents(): ng.IPromise<FellowResidents>
        {
            return this.$http.get( "/api/BuildingResidents/ResidentsInGroup", { cache: this.httpCache } ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<FellowResidents> ) =>
                {
                    return httpResponse.data;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    return this.$q.reject( httpResponse );
                }
            );
        }


        /**
         * Get the object describing the available group email addresses
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
         * Get the object describing the available group email addresses
         */
        getAllGroupEmails(): ng.IPromise<GroupEmailGroups>
        {
            return this.$http.get( "/api/BuildingResidents/AllEmailGroups", { cache: this.httpCache } ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<GroupEmailGroups> ) =>
                {
                    return httpResponse.data;

                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    return this.$q.reject( httpResponse );
                }
            );

            //var innerThis = this;
            //return this.getByUnitsAndResidents().then( function( unitsAndResidents )
            //{
            //    var unitList = unitsAndResidents.byUnit;
            //    var allResidents = unitsAndResidents.residents;

            //    return innerThis.setupGroupEmailObject( allResidents, unitList, null );
            //} );
        }


        /**
         * Send an email message to another user
         */
        sendMessage( recipientUserId: string, messageBody: string, messageSubject: string, shouldSendAsBoard: boolean, shouldSendAsCommitteeId: number )
        {
            const postData = {
                recipientUserId: recipientUserId,
                messageBody: messageBody,
                messageSubject: messageSubject,
                shouldSendAsBoard,
                shouldSendAsCommitteeId
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


        /**
         * Test if a board position is any except the property manager
         */
        static isNonPropMgrBoardPosition( boardPosition: number )
        {
            if( boardPosition < 1 // Handle invalid values
                || boardPosition === FellowResidentsService.BoardPos_None
                || boardPosition === FellowResidentsService.BoardPos_PropertyManager )
                return false;

            return true;
        }


        static pollReponsesToChart( poll: Poll, siteInfo: SiteInfoService )
        {
            const talliedVotes: PollAnswerCount[] = [];

            const logVote = function( answerId: number )
            {
                let curAnswerCount = talliedVotes.find( tv => tv.answerId === answerId );
                if( !curAnswerCount )
                {
                    curAnswerCount = new PollAnswerCount( answerId );
                    talliedVotes.push( curAnswerCount );
                }

                ++curAnswerCount.numVotes;
            };
            
            poll.responses.forEach( r =>
            {
                if( r.answerIds && r.answerIds.length > 0 )
                    r.answerIds.forEach( aid => logVote( aid ) );
                else if( r.writeInAnswer )
                {
                    const newWriteIn = new PollAnswerCount( 0, r.writeInAnswer );
                    ++newWriteIn.numVotes;
                    talliedVotes.push( newWriteIn );
                }
            } );

            const results = {
                chartData: [] as number[],
                chartLabels: [] as string[]
            };

            // Go through each answer and store the name and count for that answer
            for( const curTalliedVote of talliedVotes )
            {
                const pollAnswer = _.find( poll.answers, ( a ) => a.pollAnswerId === curTalliedVote.answerId );

                if( pollAnswer )
                {
                    results.chartLabels.push( pollAnswer.answerText );
                    results.chartData.push( curTalliedVote.numVotes );
                }
                else if( curTalliedVote.writeInAnswer )
                {
                    results.chartLabels.push( "Write In: " + curTalliedVote.writeInAnswer );
                    results.chartData.push( curTalliedVote.numVotes );
                }
                else
                {
                    results.chartLabels.push( "Removed answer ID " + curTalliedVote.answerId );
                    results.chartData.push( curTalliedVote.numVotes );
                    console.log( "Unknown answer ID found: " + curTalliedVote.answerId );
                }
            }

            const isMemberBasedGroup = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";

            let numTotalResponses: number;
            if( poll.expectedNumVoters )
                numTotalResponses = poll.expectedNumVoters;
            else if( isMemberBasedGroup )
                numTotalResponses = siteInfo.privateSiteInfo.numMembers;
            else
                numTotalResponses = siteInfo.privateSiteInfo.numUnits;

            if( poll.responses.length > numTotalResponses )
                numTotalResponses = poll.responses.length;

            if( poll.responses && poll.responses.length < numTotalResponses )
            {
                results.chartLabels.push( "No Response" );

                results.chartData.push( numTotalResponses - poll.responses.length );
            }

            return results;
        }


        /**
         * Retrieve the possible "send as" options for email sending. Guaranteed to return at least
         * one option, the "self" option.
         */
        getEmailSendAsOptions( userInfo: UserInfo )
        {
            const sendAsOptions: EmailSendAsOption[] = [];
            sendAsOptions.push( { displayLabel: `Yourself (${userInfo.fullName})`, noteText: "The default to send a message as yourself", isBoardOption: false, committee: null } );

            const isBoard = FellowResidentsService.isNonPropMgrBoardPosition( userInfo.boardPosition );
            if( isBoard )
                sendAsOptions.push( { displayLabel: `The Board`, noteText: "This will set the 'from' address to the board's group email address", isBoardOption: true, committee: null } );

            return this.$http.get( "/api/Committee/MyCommittees", { cache: true } ).then(
                ( response: ng.IHttpPromiseCallbackArg<Committee[]> ) =>
                {
                    if( response.data && response.data.length > 0 )
                    {
                        const usersCommittees = _.sortBy( response.data, c => c.name.toLowerCase() );
                        for( const c of usersCommittees )
                        {
                            sendAsOptions.push( { displayLabel: c.name, noteText: "This will set the 'from' address to the committee's group email address", isBoardOption: false, committee: c } );
                        }
                    }

                    return sendAsOptions;
                },
                () =>
                {
                    return sendAsOptions;
                } );
        }
    }

    class PollAnswerCount
    {
        constructor( answerId: number, writeInAnswer: string = null )
        {
            this.answerId = answerId;
            this.writeInAnswer = writeInAnswer;
        }

        answerId: number;
        numVotes: number = 0;
        writeInAnswer: string;
    }


    export class EmailSendAsOption
    {
        displayLabel: string;
        noteText: string;
        isBoardOption: boolean;
        committee: Committee | null;
    }
}


angular.module( "CondoAlly" ).service( "fellowResidents", ["$http", "$q", "$cacheFactory", Ally.FellowResidentsService] );
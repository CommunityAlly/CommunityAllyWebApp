namespace Ally
{
    /**
     * The controller for the manage polls page
     */
    export class ManagePollsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "fellowResidents"];

        defaultPoll: Poll;
        editingItem: Poll = new Poll();
        viewingPollResults: Poll;
        pollHistory: Poll[] = [];
        isLoading: boolean = false;
        chartData: number[];
        chartLabels: string[];
        isSuperAdmin: boolean = false;
        groupEmails: GroupEmailInfo[];
        shouldAllowMultipleAnswers: boolean = false;
        isPremiumPlanActive: boolean = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private fellowResidents: Ally.FellowResidentsService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;

            const threeDaysLater = new Date();
            threeDaysLater.setDate( new Date().getDate() + 3 );

            this.defaultPoll = new Poll();
            this.defaultPoll.expirationDate = threeDaysLater;
            this.defaultPoll.votingGroupShortName = "everyone";
            this.defaultPoll.answers = [
                new PollAnswer( "Yes" ),
                new PollAnswer( "No" ),
            ];

            // The new or existing news item that's being edited by the user
            this.editingItem = angular.copy( this.defaultPoll );
            this.shouldAllowMultipleAnswers = false;

            this.isLoading = true;
            this.fellowResidents.getGroupEmailObject().then(
                ( groupEmails ) =>
                {
                    this.groupEmails = _.sortBy( groupEmails, e => e.displayName.toUpperCase() );
                    this.retrievePolls();
                },
                () => this.retrievePolls()
            );
        }


        /**
         * Populate the poll data
         */
        retrievePolls()
        {
            const AbstainAnswerSortOrder = 101;

            this.isLoading = true;

            this.$http.get( "/api/Poll" ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<Poll[]> ) =>
            {
                this.pollHistory = httpResponse.data;

                // Convert the date strings to objects
                for( let i = 0; i < this.pollHistory.length; ++i )
                {
                    // The date comes down as a string so we need to convert it
                    this.pollHistory[i].expirationDate = new Date( ( this.pollHistory[i] as any ).expirationDate );

                    // Remove the abstain answer since it can't be edited, but save the full answer
                    // list for displaying results
                    this.pollHistory[i].fullResultAnswers = this.pollHistory[i].answers;
                    this.pollHistory[i].answers = _.reject( this.pollHistory[i].answers, function( pa ) { return pa.sortOrder === AbstainAnswerSortOrder } );
                }

                this.isLoading = false;
            } );
        }


        /**
         * Add a new answer
         */
        addAnswer()
        {
            if( !this.editingItem.answers )
                this.editingItem.answers = [];

            if( this.editingItem.answers.length > 19 )
            {
                alert( "You can only have 20 answers maxiumum per poll." );
                return;
            }

            this.editingItem.answers.push( new PollAnswer( "" ) );

            window.setTimeout( () => document.getElementById( "poll-answer-textbox-" + ( this.editingItem.answers.length - 1 ) ).focus(), 100 );
        }


        /**
         * Stop editing a poll and reset the form
         */
        cancelEdit()
        {
            this.editingItem = <Poll>angular.copy( this.defaultPoll );
            this.shouldAllowMultipleAnswers = false;
        }


        /**
         * Occurs when the user presses the button to save a poll
         */
        onSavePoll()
        {
            if( this.editingItem === null )
                return;

            this.isLoading = true;

            const onSave = () =>
            {
                this.isLoading = false;
                this.editingItem = angular.copy( this.defaultPoll );
                this.shouldAllowMultipleAnswers = false;
                this.retrievePolls();
            };

            const onFailure = ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to save poll: " + response.data.exceptionMessage );
            };

            // If we're editing an existing news item
            if( typeof ( this.editingItem.pollId ) === "number" )
            {
                analytics.track( "editPoll" );
                this.$http.put( "/api/Poll", this.editingItem ).then( onSave, onFailure );
            }
            // Otherwise create a new one
            else
            {
                analytics.track( "addPoll" );
                this.$http.post( "/api/Poll", this.editingItem ).then( onSave, onFailure );
            }
        }


        /**
         * Occurs when the user wants to edit an existing poll
         */
        onEditItem( item: Poll )
        {
            this.editingItem = angular.copy( item );
            window.scrollTo( 0, 0 );
            this.shouldAllowMultipleAnswers = this.editingItem.maxNumResponses > 1;
        }


        /**
         * Occurs when the user wants to delete a poll
         */
        onDeleteItem( item: Poll )
        {
            this.isLoading = true;

            this.$http.delete( "/api/Poll?pollId=" + item.pollId ).then(
                () =>
                {
                    this.retrievePolls();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;

                    if( httpResponse.status === 403 )
                        alert( "You cannot authorized to delete this poll." );
                    else
                        alert( "Failed to delete: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user wants to view the results for a poll
         */
        onViewResults( poll: Poll )
        {
            if( !poll )
            {
                this.viewingPollResults = null;
                return;
            }

            const chartInfo = FellowResidentsService.pollReponsesToChart( poll, this.siteInfo );

            poll.chartData = chartInfo.chartData;
            poll.chartLabels = chartInfo.chartLabels;

            // Build the array for the counts to the right of the chart
            poll.answerCounts = [];
            for( let i = 0; i < poll.chartLabels.length; ++i )
            {
                poll.answerCounts.push( {
                    label: poll.chartLabels[i],
                    count: poll.chartData[i]
                } );
            }

            this.chartLabels = poll.chartLabels;
            this.chartData = poll.chartData;

            this.viewingPollResults = poll;
        }


        formatVoteGroupName( votingGroupShortName: string )
        {
            if( !this.groupEmails )
                return votingGroupShortName;

            const emailGroup = this.groupEmails.find( g => g.recipientTypeName.toLowerCase() === votingGroupShortName );
            if( !emailGroup )
                return votingGroupShortName;

            return emailGroup.displayName;
        }


        onMultiAnswerChange()
        {
            if( this.shouldAllowMultipleAnswers )
                this.editingItem.maxNumResponses = 2;
            else
                this.editingItem.maxNumResponses = 1;
        }
    }

    export class Poll
    {
        pollId: number;
        allowOtherAnswer: boolean;
        isAnonymous: boolean = true;
        expirationDate: Date;
        postDate: Date;
        authorUserId: string;
        authorName: string;
        questionText: string;
        detailText: string;
        votingGroupShortName: string;
        shouldSendReminderEmail: boolean;
        shouldAllowEmailVoting: boolean;
        shouldSendAnnouncementEmail: boolean;
        maxNumResponses: number;
        isComplete: boolean;
        answers: PollAnswer[];
        responses: PollResponse[];
        hasUsersUnitVoted: boolean;
        unitVoteText: string;
        noResponseCount: number;
        canViewResults: boolean;

        // Not from the server
        fullResultAnswers: any[];
        chartData: number[];
        chartLabels: string[];
        answerCounts: any[];
        writeInAnswer: string;
        isWriteInMultiSelected: boolean;
        localMultiSelectedAnswers: PollAnswer[];
    }


    export class PollAnswer
    {
        constructor( answerText: string )
        {
            this.answerText = answerText;
        }

        pollAnswerId: number;
        owningPollId: number;
        answerText: string;
        detailText: string;
        sortOrder: number;

        // Used locally for the GUI to know if it's selected
        isLocalMultiSelect: boolean;
    }


    export class PollResponse
    {
        pollResponseId: number;
        pollId: number;
        userId: string;
        responseDate: Date;
        userFullName: string;
        writeInAnswer: string;
        sortOrder: number;
        ipAddress: string;
        answeredFromEmail: boolean;
        unitId: number;
        answerIdsCsv: string;

        unitName: string;
        answerText: string;
        answerIds: number[];
    }
}


CA.angularApp.component( "managePolls", {
    templateUrl: "/ngApp/chtn/manager/manage-polls.html",
    controller: Ally.ManagePollsController
} );
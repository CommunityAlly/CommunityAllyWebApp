namespace Ally
{
    /**
     * The controller for the widget that lets members view and vote on active polls
     */
    export class ActivePollsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$timeout", "$rootScope", "fellowResidents"];

        polls: Poll[];        
        isLoading: boolean = false;
        multiSelectWriteInPlaceholder: PollAnswer = new PollAnswer( "write-in" );


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private $timeout: ng.ITimeoutService,
            private $rootScope: ng.IRootScopeService )
        {
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            this.refreshPolls();
        }


        /**
         * Retrieve any active polls from the server
         */
        populatePollData( pollData: any[] )
        {
            this.polls = pollData;

            // If there are polls then tell the home to display the poll area
            if( pollData && pollData.length > 0 )
                this.$rootScope.$broadcast("homeHasActivePolls");

            for( var pollIndex = 0; pollIndex < this.polls.length; ++pollIndex )
            {
                var poll = this.polls[pollIndex];

                if( poll.hasUsersUnitVoted )
                {
                    if( poll.canViewResults )
                    {
                        const chartInfo = FellowResidentsService.pollReponsesToChart( poll, this.siteInfo );

                        poll.chartData = chartInfo.chartData;
                        poll.chartLabels = chartInfo.chartLabels;
                    }
                }
            }
        }


        /**
         * Populate the polls section from the server
         */
        refreshPolls()
        {
            // Grab the polls
            this.isLoading = true;

            var innerThis = this;
            this.$http( { method: 'GET', url: '/api/Poll?getActive=1' } ).
                then( ( httpResponse:ng.IHttpPromiseCallbackArg<any[]> ) =>
                {
                    innerThis.isLoading = false;

                    // Delay the processing a bit to help the home page load faster
                    innerThis.$timeout( function()
                    {
                        innerThis.populatePollData( httpResponse.data );
                    }, 100 );
                }, () =>
                {
                    innerThis.isLoading = false;
                } );
        }


        /**
         * Occurs when the user selects a poll answer
         */
        onPollAnswer( poll: Poll, pollAnswer: PollAnswer )
        {
            this.isLoading = true;

            const answerIdsCsv = pollAnswer ? pollAnswer.pollAnswerId.toString() : "";
            const writeInAnswer = poll.writeInAnswer ? encodeURIComponent( poll.writeInAnswer ) : "";

            var putUri = `/api/Poll/PollResponse?pollId=${poll.pollId}&answerIdsCsv=${answerIdsCsv}&writeInAnswer=${writeInAnswer}`;

            var innerThis = this;
            this.$http.put( putUri, null ).
                then( function( httpResponse:any )
                {
                    innerThis.polls = httpResponse.data;
                    innerThis.isLoading = false;

                    innerThis.refreshPolls();
                }, function()
                {
                    innerThis.isLoading = false;
                } );
        }


        onMultiResponseChange( poll: Poll, pollAnswer: PollAnswer)
        {
            const isAbstain = pollAnswer.answerText === "Abstain";

            if( isAbstain && pollAnswer.isLocalMultiSelect )
            {
                poll.answers.filter( a => a.answerText !== "Abstain" ).forEach( a => a.isLocalMultiSelect = false );
                poll.isWriteInMultiSelected = false;
            }

            // If this is some other answer then unselect abstain
            if( !isAbstain )
            {
                const abstainAnswer = poll.answers.find( a => a.answerText === "Abstain" );
                if( abstainAnswer )
                    abstainAnswer.isLocalMultiSelect = false;
            }
            
            let numSelectedAnswers = poll.answers.filter( a => a.isLocalMultiSelect ).length;
            if( poll.isWriteInMultiSelected )
                ++numSelectedAnswers;

            if( numSelectedAnswers > poll.maxNumResponses )
            {
                alert( `You can only select at most ${poll.maxNumResponses} answers` );
                if( pollAnswer === this.multiSelectWriteInPlaceholder )
                    poll.isWriteInMultiSelected = false;
                else
                    pollAnswer.isLocalMultiSelect = false;
            }

            poll.localMultiSelectedAnswers = poll.answers.filter( a => a.isLocalMultiSelect );
        }


        onSubmitMultiAnswer(poll: Poll)
        {
            if( !poll.localMultiSelectedAnswers || poll.localMultiSelectedAnswers.length === 0 )
            {
                alert( "Please select at least one reponse" );
                return;
            }

            const answerIdsCsv = poll.localMultiSelectedAnswers.map( a => a.pollAnswerId ).join( "," );
            
            this.isLoading = true;
            
            var putUri = `/api/Poll/PollResponse?pollId=${poll.pollId}&answerIdsCsv=${answerIdsCsv}&writeInAnswer=${( poll.isWriteInMultiSelected && poll.writeInAnswer ) ? encodeURIComponent( poll.writeInAnswer ) : ''}`;

            var innerThis = this;
            this.$http.put( putUri, null ).
                then( function( httpResponse: any )
                {
                    innerThis.polls = httpResponse.data;
                    innerThis.isLoading = false;

                    innerThis.refreshPolls();
                }, function()
                {
                    innerThis.isLoading = false;
                } );
        }
    }
}


CA.angularApp.component( "activePolls", {
    templateUrl: "/ngApp/common/active-polls.html",
    controller: Ally.ActivePollsController
} );
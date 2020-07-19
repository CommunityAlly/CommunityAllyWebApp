namespace Ally
{
    /**
     * The controller for the widget that lets members view and vote on active polls
     */
    export class ActivePollsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$timeout", "$rootScope"];

        polls: Poll[];        
        isLoading: boolean = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $timeout: ng.ITimeoutService, private $rootScope: ng.IRootScopeService )
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
                        var answers = _.groupBy( poll.responses, "answerId" );

                        poll.chartData = [];
                        poll.chartLabels = [];

                        for( var answerId in answers )
                        {
                            if( answers.hasOwnProperty( answerId ) )
                            {
                                poll.chartLabels.push( _.find( poll.answers, function( a: any ) { return a.pollAnswerId == answerId; } ).answerText );
                                poll.chartData.push( answers[answerId].length );

                                //poll.chartData.push(
                                //{
                                //    key: _.find( poll.answers, function( a ) { return a.pollAnswerId == answerId; } ).answerText,
                                //    y: answers[answerId].length
                                //} );
                            }
                        }

                        if( poll.responses && poll.responses.length < this.siteInfo.privateSiteInfo.numUnits )
                        {
                            poll.chartLabels.push( "No Response" );
                            poll.chartData.push( this.siteInfo.privateSiteInfo.numUnits - poll.responses.length );
                        }
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
        onPollAnswer( poll:any, pollAnswer:any, writeInAnswer:any )
        {
            this.isLoading = true;

            var putUri = "/api/Poll/PollResponse?pollId=" + poll.pollId + "&answerId=" + ( pollAnswer ? pollAnswer.pollAnswerId : "" ) + "&writeInAnswer=" + writeInAnswer;

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
    }
}


CA.angularApp.component( "activePolls", {
    templateUrl: "/ngApp/common/active-polls.html",
    controller: Ally.ActivePollsController
} );
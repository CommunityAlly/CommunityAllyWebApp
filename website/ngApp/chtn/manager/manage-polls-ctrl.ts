﻿namespace Ally
{
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
        isComplete: boolean;
        answers: any[];
        responses: PollResponse[];
        whoCanVote: number = 2;
        hasUsersUnitVoted: boolean;
        unitVoteText: string;
        noResponseCount: number;
        canViewResults: boolean;

        // Not from the server
        fullResultAnswers: any[];
        chartData: number[];
        chartLabels: string[];
        answerCounts: any[];
    }


    export class PollResponse
    {
        pollResponseId: number;
        pollId: number;
        userId: string;
        responseDate: Date;
        userFullName: string;
        answerId: number;
        writeInAnswer: string;
        sortOrder: number;
        ipAddress: string;
        answeredFromEmail: boolean;
        unitId: number;

        unitName: string;
        answerText: string;
    }


    /**
     * The controller for the manage polls page
     */
    export class ManagePollsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo"];

        defaultPoll: Poll;
        editingItem: Poll = new Poll();
        viewingPollResults: Poll;
        pollHistory: Poll[] = [];
        isLoading: boolean = false;
        chartData: number[];
        chartLabels: string[];
        isSuperAdmin: boolean = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;

            var threeDaysLater = new Date();
            threeDaysLater.setDate( new Date().getDate() + 3 );

            this.defaultPoll = new Poll();
            this.defaultPoll.expirationDate = threeDaysLater;
            this.defaultPoll.answers = [
                {
                    answerText: "Yes"
                },
                {
                    answerText: "No"
                }
            ];

            // The new or existing news item that's being edited by the user
            this.editingItem = angular.copy( this.defaultPoll );

            this.retrieveItems();
        }


        /**
         * Populate the poll data
         */
        retrieveItems()
        {
            const AbstainAnswerSortOrder = 101;

            this.isLoading = true;

            var innerThis = this;
            this.$http.get( "/api/Poll" ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<Poll[]> )
            {
                innerThis.pollHistory = httpResponse.data;

                // Convert the date strings to objects
                for( var i = 0; i < innerThis.pollHistory.length; ++i )
                {
                    // The date comes down as a string so we need to convert it
                    innerThis.pollHistory[i].expirationDate = new Date( ( innerThis.pollHistory[i] as any ).expirationDate );

                    // Remove the abstain answer since it can't be edited, but save the full answer
                    // list for displaying results
                    innerThis.pollHistory[i].fullResultAnswers = innerThis.pollHistory[i].answers;
                    innerThis.pollHistory[i].answers = _.reject( innerThis.pollHistory[i].answers, function( pa ) { return pa.sortOrder === AbstainAnswerSortOrder } );
                }

                innerThis.isLoading = false;
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

            this.editingItem.answers.push( { answerText: '' } );
        }


        /**
         * Stop editing a poll and reset the form
         */
        cancelEdit()
        {
            this.editingItem = <Poll>angular.copy( this.defaultPoll );
        }


        /**
         * Occurs when the user presses the button to save a poll
         */
        onSaveItem()
        {
            if( this.editingItem === null )
                return;

            //$( "#new-item-form" ).validate();
            //if ( !$( "#new-item-form" ).valid() )
            //    return;

            this.isLoading = true;

            var innerThis = this;
            var onSave = function()
            {
                innerThis.isLoading = false;
                innerThis.editingItem = angular.copy( innerThis.defaultPoll );
                innerThis.retrieveItems();
            };
            var onFailure = ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                innerThis.isLoading = false;
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
                    this.retrieveItems();
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

            // Group the responses by the answer they selected
            var responsesGroupedByAnswer = _.groupBy( poll.responses, "answerId" );

            poll.chartData = [];
            poll.chartLabels = [];

            // Go through each answer and store the name and count for that answer
            for( var answerIdStr in responsesGroupedByAnswer )
            {
                // Ignore inherited properties
                if( !responsesGroupedByAnswer.hasOwnProperty( answerIdStr ) )
                    continue;

                // for..in provides the keys as strings
                let answerId: number = parseInt( answerIdStr );

                var answer = _.find( poll.fullResultAnswers, function( a ) { return a.pollAnswerId === answerId; } );

                if( answer )
                {
                    poll.chartLabels.push( answer.answerText );
                    poll.chartData.push( responsesGroupedByAnswer[answerIdStr].length );
                }
            }

            if( poll.responses && poll.responses.length < this.siteInfo.privateSiteInfo.numUnits )
            {
                poll.chartLabels.push( "No Response" );
                poll.chartData.push( this.siteInfo.privateSiteInfo.numUnits - poll.responses.length );
            }

            // Build the array for the counts to the right of the chart
            poll.answerCounts = [];
            for( var i = 0; i < poll.chartLabels.length; ++i )
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
    }
}


CA.angularApp.component( "managePolls", {
    templateUrl: "/ngApp/chtn/manager/manage-polls.html",
    controller: Ally.ManagePollsController
} );
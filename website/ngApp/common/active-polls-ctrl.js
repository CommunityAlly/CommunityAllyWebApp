var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets members view and vote on active polls
     */
    var ActivePollsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ActivePollsController($http, siteInfo, $timeout, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$rootScope = $rootScope;
            this.isLoading = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        ActivePollsController.prototype.$onInit = function () {
            this.refreshPolls();
        };
        /**
         * Retrieve any active polls from the server
         */
        ActivePollsController.prototype.populatePollData = function (pollData) {
            this.polls = pollData;
            // If there are polls then tell the home to display the poll area
            if (pollData && pollData.length > 0)
                this.$rootScope.$broadcast("homeHasActivePolls");
            for (var pollIndex = 0; pollIndex < this.polls.length; ++pollIndex) {
                var poll = this.polls[pollIndex];
                if (poll.hasUsersUnitVoted) {
                    if (poll.canViewResults) {
                        var answers = _.groupBy(poll.responses, "answerId");
                        poll.chartData = [];
                        poll.chartLabels = [];
                        for (var answerId in answers) {
                            if (answers.hasOwnProperty(answerId)) {
                                poll.chartLabels.push(_.find(poll.answers, function (a) { return a.pollAnswerId == answerId; }).answerText);
                                poll.chartData.push(answers[answerId].length);
                                //poll.chartData.push(
                                //{
                                //    key: _.find( poll.answers, function( a ) { return a.pollAnswerId == answerId; } ).answerText,
                                //    y: answers[answerId].length
                                //} );
                            }
                        }
                        if (poll.responses && poll.responses.length < this.siteInfo.privateSiteInfo.numUnits) {
                            poll.chartLabels.push("No Response");
                            poll.chartData.push(this.siteInfo.privateSiteInfo.numUnits - poll.responses.length);
                        }
                    }
                }
            }
        };
        /**
         * Populate the polls section from the server
         */
        ActivePollsController.prototype.refreshPolls = function () {
            // Grab the polls
            this.isLoading = true;
            var innerThis = this;
            this.$http({ method: 'GET', url: '/api/Poll?getActive=1' }).
                then(function (httpResponse) {
                innerThis.isLoading = false;
                // Delay the processing a bit to help the home page load faster
                innerThis.$timeout(function () {
                    innerThis.populatePollData(httpResponse.data);
                }, 100);
            }, function () {
                innerThis.isLoading = false;
            });
        };
        /**
         * Occurs when the user selects a poll answer
         */
        ActivePollsController.prototype.onPollAnswer = function (poll, pollAnswer, writeInAnswer) {
            this.isLoading = true;
            var putUri = "/api/PollResponse?pollId=" + poll.pollId + "&answerId=" + (pollAnswer ? pollAnswer.pollAnswerId : "") + "&writeInAnswer=" + writeInAnswer;
            var innerThis = this;
            this.$http.put(putUri, null).
                then(function (httpResponse) {
                innerThis.polls = httpResponse.data;
                innerThis.isLoading = false;
                innerThis.refreshPolls();
            }, function () {
                innerThis.isLoading = false;
            });
        };
        ActivePollsController.$inject = ["$http", "SiteInfo", "$timeout", "$rootScope"];
        return ActivePollsController;
    }());
    Ally.ActivePollsController = ActivePollsController;
})(Ally || (Ally = {}));
CA.angularApp.component("activePolls", {
    templateUrl: "/ngApp/common/active-polls.html",
    controller: Ally.ActivePollsController
});

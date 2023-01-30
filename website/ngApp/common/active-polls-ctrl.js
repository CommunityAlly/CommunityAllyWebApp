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
            this.multiSelectWriteInPlaceholder = new Ally.PollAnswer("write-in");
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
                        var chartInfo = Ally.FellowResidentsService.pollReponsesToChart(poll, this.siteInfo);
                        poll.chartData = chartInfo.chartData;
                        poll.chartLabels = chartInfo.chartLabels;
                    }
                }
            }
        };
        /**
         * Populate the polls section from the server
         */
        ActivePollsController.prototype.refreshPolls = function () {
            var _this = this;
            // Grab the polls from the server
            this.isLoading = true;
            this.$http.get("/api/Poll?getActive=1").then(function (httpResponse) {
                _this.isLoading = false;
                // Delay the processing a bit to help the home page load faster
                _this.$timeout(function () { return _this.populatePollData(httpResponse.data); }, 100);
            }, function () {
                _this.isLoading = false;
            });
        };
        /**
         * Occurs when the user selects a poll answer
         */
        ActivePollsController.prototype.onPollAnswer = function (poll, pollAnswer) {
            var _this = this;
            this.isLoading = true;
            var answerIdsCsv = pollAnswer ? pollAnswer.pollAnswerId.toString() : "";
            var writeInAnswer = poll.writeInAnswer ? encodeURIComponent(poll.writeInAnswer) : "";
            var putUri = "/api/Poll/PollResponse?pollId=" + poll.pollId + "&answerIdsCsv=" + answerIdsCsv + "&writeInAnswer=" + writeInAnswer;
            this.$http.put(putUri, null).then(function () {
                _this.isLoading = false;
                _this.refreshPolls();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to submit vote: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user selects a poll answer in a poll that allows multiple answers
         */
        ActivePollsController.prototype.onMultiResponseChange = function (poll, pollAnswer) {
            var isAbstain = pollAnswer.answerText === "Abstain";
            if (isAbstain && pollAnswer.isLocalMultiSelect) {
                poll.answers.filter(function (a) { return a.answerText !== "Abstain"; }).forEach(function (a) { return a.isLocalMultiSelect = false; });
                poll.isWriteInMultiSelected = false;
            }
            // If this is some other answer then unselect abstain
            if (!isAbstain) {
                var abstainAnswer = poll.answers.find(function (a) { return a.answerText === "Abstain"; });
                if (abstainAnswer)
                    abstainAnswer.isLocalMultiSelect = false;
            }
            var numSelectedAnswers = poll.answers.filter(function (a) { return a.isLocalMultiSelect; }).length;
            if (poll.isWriteInMultiSelected)
                ++numSelectedAnswers;
            if (numSelectedAnswers > poll.maxNumResponses) {
                alert("You can only select at most " + poll.maxNumResponses + " answers");
                if (pollAnswer === this.multiSelectWriteInPlaceholder)
                    poll.isWriteInMultiSelected = false;
                else
                    pollAnswer.isLocalMultiSelect = false;
            }
            poll.localMultiSelectedAnswers = poll.answers.filter(function (a) { return a.isLocalMultiSelect; });
        };
        ActivePollsController.prototype.onSubmitMultiAnswer = function (poll) {
            var _this = this;
            if (!poll.localMultiSelectedAnswers || poll.localMultiSelectedAnswers.length === 0) {
                alert("Please select at least one reponse");
                return;
            }
            var answerIdsCsv = poll.localMultiSelectedAnswers.map(function (a) { return a.pollAnswerId; }).join(",");
            this.isLoading = true;
            var putUri = "/api/Poll/PollResponse?pollId=" + poll.pollId + "&answerIdsCsv=" + answerIdsCsv + "&writeInAnswer=" + ((poll.isWriteInMultiSelected && poll.writeInAnswer) ? encodeURIComponent(poll.writeInAnswer) : '');
            this.$http.put(putUri, null).then(function () {
                _this.isLoading = false;
                _this.refreshPolls();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to submit vote: " + response.data.exceptionMessage);
            });
        };
        ActivePollsController.$inject = ["$http", "SiteInfo", "$timeout", "$rootScope", "fellowResidents"];
        return ActivePollsController;
    }());
    Ally.ActivePollsController = ActivePollsController;
})(Ally || (Ally = {}));
CA.angularApp.component("activePolls", {
    templateUrl: "/ngApp/common/active-polls.html",
    controller: Ally.ActivePollsController
});

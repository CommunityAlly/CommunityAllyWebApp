var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets members view and vote on active polls
     */
    class ActivePollsController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $timeout, $rootScope) {
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
        $onInit() {
            this.refreshPolls();
        }
        /**
         * Retrieve any active polls from the server
         */
        populatePollData(pollData) {
            this.polls = pollData;
            // If there are polls then tell the home to display the poll area
            if (pollData && pollData.length > 0)
                this.$rootScope.$broadcast("homeHasActivePolls");
            for (let pollIndex = 0; pollIndex < this.polls.length; ++pollIndex) {
                const poll = this.polls[pollIndex];
                if (poll.hasUsersUnitVoted) {
                    if (poll.canViewResults) {
                        const chartInfo = Ally.FellowResidentsService.pollReponsesToChart(poll, this.siteInfo);
                        poll.chartData = chartInfo.chartData;
                        poll.chartLabels = chartInfo.chartLabels;
                    }
                }
            }
        }
        /**
         * Populate the polls section from the server
         */
        refreshPolls() {
            // Grab the polls from the server
            this.isLoading = true;
            this.$http.get("/api/Poll?getActive=1").then((httpResponse) => {
                this.isLoading = false;
                // Delay the processing a bit to help the home page load faster
                this.$timeout(() => this.populatePollData(httpResponse.data), 100);
            }, () => {
                this.isLoading = false;
            });
        }
        /**
         * Occurs when the user selects a poll answer
         */
        onPollAnswer(poll, pollAnswer) {
            this.isLoading = true;
            const answerIdsCsv = pollAnswer ? pollAnswer.pollAnswerId.toString() : "";
            const writeInAnswer = poll.writeInAnswer ? encodeURIComponent(poll.writeInAnswer) : "";
            const putUri = `/api/Poll/PollResponse?pollId=${poll.pollId}&answerIdsCsv=${answerIdsCsv}&writeInAnswer=${writeInAnswer}`;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
                this.refreshPolls();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to submit vote: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user selects a poll answer in a poll that allows multiple answers
         */
        onMultiResponseChange(poll, pollAnswer) {
            const isAbstain = pollAnswer.answerText === "Abstain";
            if (isAbstain && pollAnswer.isLocalMultiSelect) {
                poll.answers.filter(a => a.answerText !== "Abstain").forEach(a => a.isLocalMultiSelect = false);
                poll.isWriteInMultiSelected = false;
            }
            // If this is some other answer then unselect abstain
            if (!isAbstain) {
                const abstainAnswer = poll.answers.find(a => a.answerText === "Abstain");
                if (abstainAnswer)
                    abstainAnswer.isLocalMultiSelect = false;
            }
            let numSelectedAnswers = poll.answers.filter(a => a.isLocalMultiSelect).length;
            if (poll.isWriteInMultiSelected)
                ++numSelectedAnswers;
            if (numSelectedAnswers > poll.maxNumResponses) {
                alert(`You can only select at most ${poll.maxNumResponses} answers`);
                if (pollAnswer === this.multiSelectWriteInPlaceholder)
                    poll.isWriteInMultiSelected = false;
                else
                    pollAnswer.isLocalMultiSelect = false;
            }
            poll.localMultiSelectedAnswers = poll.answers.filter(a => a.isLocalMultiSelect);
        }
        onSubmitMultiAnswer(poll) {
            if (!poll.localMultiSelectedAnswers || poll.localMultiSelectedAnswers.length === 0) {
                alert("Please select at least one reponse");
                return;
            }
            const answerIdsCsv = poll.localMultiSelectedAnswers.map(a => a.pollAnswerId).join(",");
            this.isLoading = true;
            const putUri = `/api/Poll/PollResponse?pollId=${poll.pollId}&answerIdsCsv=${answerIdsCsv}&writeInAnswer=${(poll.isWriteInMultiSelected && poll.writeInAnswer) ? encodeURIComponent(poll.writeInAnswer) : ''}`;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
                this.refreshPolls();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to submit vote: " + response.data.exceptionMessage);
            });
        }
    }
    ActivePollsController.$inject = ["$http", "SiteInfo", "$timeout", "$rootScope", "fellowResidents"];
    Ally.ActivePollsController = ActivePollsController;
})(Ally || (Ally = {}));
CA.angularApp.component("activePolls", {
    templateUrl: "/ngApp/common/active-polls.html",
    controller: Ally.ActivePollsController
});

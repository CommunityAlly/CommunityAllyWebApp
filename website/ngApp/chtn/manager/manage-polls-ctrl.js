var Ally;
(function (Ally) {
    /**
     * The controller for the manage polls page
     */
    var ManagePollsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManagePollsController($http, siteInfo, fellowResidents) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.editingItem = new Poll();
            this.pollHistory = [];
            this.isLoading = false;
            this.isSuperAdmin = false;
            this.shouldAllowMultipleAnswers = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManagePollsController.prototype.$onInit = function () {
            var _this = this;
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;
            var threeDaysLater = new Date();
            threeDaysLater.setDate(new Date().getDate() + 3);
            this.defaultPoll = new Poll();
            this.defaultPoll.expirationDate = threeDaysLater;
            this.defaultPoll.votingGroupShortName = "everyone";
            this.defaultPoll.answers = [
                new PollAnswer("Yes"),
                new PollAnswer("No"),
            ];
            // The new or existing news item that's being edited by the user
            this.editingItem = angular.copy(this.defaultPoll);
            this.shouldAllowMultipleAnswers = false;
            this.isLoading = true;
            this.fellowResidents.getGroupEmailObject().then(function (groupEmails) {
                _this.groupEmails = _.sortBy(groupEmails, function (e) { return e.displayName.toUpperCase(); });
                _this.retrievePolls();
            }, function () { return _this.retrievePolls(); });
        };
        /**
         * Populate the poll data
         */
        ManagePollsController.prototype.retrievePolls = function () {
            var _this = this;
            var AbstainAnswerSortOrder = 101;
            this.isLoading = true;
            this.$http.get("/api/Poll").then(function (httpResponse) {
                _this.pollHistory = httpResponse.data;
                // Convert the date strings to objects
                for (var i = 0; i < _this.pollHistory.length; ++i) {
                    // The date comes down as a string so we need to convert it
                    _this.pollHistory[i].expirationDate = new Date(_this.pollHistory[i].expirationDate);
                    // Remove the abstain answer since it can't be edited, but save the full answer
                    // list for displaying results
                    _this.pollHistory[i].fullResultAnswers = _this.pollHistory[i].answers;
                    _this.pollHistory[i].answers = _.reject(_this.pollHistory[i].answers, function (pa) { return pa.sortOrder === AbstainAnswerSortOrder; });
                }
                _this.isLoading = false;
            });
        };
        /**
         * Add a new answer
         */
        ManagePollsController.prototype.addAnswer = function () {
            var _this = this;
            if (!this.editingItem.answers)
                this.editingItem.answers = [];
            if (this.editingItem.answers.length > 19) {
                alert("You can only have 20 answers maxiumum per poll.");
                return;
            }
            this.editingItem.answers.push(new PollAnswer(""));
            window.setTimeout(function () { return document.getElementById("poll-answer-textbox-" + (_this.editingItem.answers.length - 1)).focus(); }, 100);
        };
        /**
         * Stop editing a poll and reset the form
         */
        ManagePollsController.prototype.cancelEdit = function () {
            this.editingItem = angular.copy(this.defaultPoll);
            this.shouldAllowMultipleAnswers = false;
        };
        /**
         * Occurs when the user presses the button to save a poll
         */
        ManagePollsController.prototype.onSavePoll = function () {
            var _this = this;
            if (this.editingItem === null)
                return;
            this.isLoading = true;
            var onSave = function () {
                _this.isLoading = false;
                _this.editingItem = angular.copy(_this.defaultPoll);
                _this.shouldAllowMultipleAnswers = false;
                _this.retrievePolls();
            };
            var onFailure = function (response) {
                _this.isLoading = false;
                alert("Failed to save poll: " + response.data.exceptionMessage);
            };
            // If we're editing an existing news item
            if (typeof (this.editingItem.pollId) === "number") {
                analytics.track("editPoll");
                this.$http.put("/api/Poll", this.editingItem).then(onSave, onFailure);
            }
            // Otherwise create a new one
            else {
                analytics.track("addPoll");
                this.$http.post("/api/Poll", this.editingItem).then(onSave, onFailure);
            }
        };
        /**
         * Occurs when the user wants to edit an existing poll
         */
        ManagePollsController.prototype.onEditItem = function (item) {
            this.editingItem = angular.copy(item);
            window.scrollTo(0, 0);
            this.shouldAllowMultipleAnswers = this.editingItem.maxNumResponses > 1;
        };
        /**
         * Occurs when the user wants to delete a poll
         */
        ManagePollsController.prototype.onDeleteItem = function (item) {
            var _this = this;
            this.isLoading = true;
            this.$http.delete("/api/Poll?pollId=" + item.pollId).then(function () {
                _this.retrievePolls();
            }, function (httpResponse) {
                _this.isLoading = false;
                if (httpResponse.status === 403)
                    alert("You cannot authorized to delete this poll.");
                else
                    alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user wants to view the results for a poll
         */
        ManagePollsController.prototype.onViewResults = function (poll) {
            if (!poll) {
                this.viewingPollResults = null;
                return;
            }
            var chartInfo = Ally.FellowResidentsService.pollReponsesToChart(poll, this.siteInfo);
            poll.chartData = chartInfo.chartData;
            poll.chartLabels = chartInfo.chartLabels;
            // Build the array for the counts to the right of the chart
            poll.answerCounts = [];
            for (var i = 0; i < poll.chartLabels.length; ++i) {
                poll.answerCounts.push({
                    label: poll.chartLabels[i],
                    count: poll.chartData[i]
                });
            }
            this.chartLabels = poll.chartLabels;
            this.chartData = poll.chartData;
            this.viewingPollResults = poll;
        };
        ManagePollsController.prototype.formatVoteGroupName = function (votingGroupShortName) {
            if (!this.groupEmails)
                return votingGroupShortName;
            var emailGroup = this.groupEmails.find(function (g) { return g.recipientTypeName.toLowerCase() === votingGroupShortName; });
            if (!emailGroup)
                return votingGroupShortName;
            return emailGroup.displayName;
        };
        ManagePollsController.prototype.onMultiAnswerChange = function () {
            if (this.shouldAllowMultipleAnswers)
                this.editingItem.maxNumResponses = 2;
            else
                this.editingItem.maxNumResponses = 1;
        };
        ManagePollsController.$inject = ["$http", "SiteInfo", "fellowResidents"];
        return ManagePollsController;
    }());
    Ally.ManagePollsController = ManagePollsController;
    var Poll = /** @class */ (function () {
        function Poll() {
            this.isAnonymous = true;
        }
        return Poll;
    }());
    Ally.Poll = Poll;
    var PollAnswer = /** @class */ (function () {
        function PollAnswer(answerText) {
            this.answerText = answerText;
        }
        return PollAnswer;
    }());
    Ally.PollAnswer = PollAnswer;
    var PollResponse = /** @class */ (function () {
        function PollResponse() {
        }
        return PollResponse;
    }());
    Ally.PollResponse = PollResponse;
})(Ally || (Ally = {}));
CA.angularApp.component("managePolls", {
    templateUrl: "/ngApp/chtn/manager/manage-polls.html",
    controller: Ally.ManagePollsController
});

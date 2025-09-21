var Ally;
(function (Ally) {
    /**
     * The controller for the manage polls page
     */
    class ManagePollsController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, fellowResidents) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.editingItem = new Poll();
            this.pollHistory = [];
            this.isLoading = false;
            this.isSuperAdmin = false;
            this.shouldAllowMultipleAnswers = false;
            this.isPremiumPlanActive = false;
            this.editPollHasAbstain = false;
            this.whoGroupNumPossibleVotes = null;
            this.whoGroupMembersTooltip = "";
            this.shouldShowMemberCheckbox = false;
            this.pollMemberLabel = "member";
            this.shouldShowHomeCol = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.shouldShowMemberCheckbox = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            const threeDaysLater = new Date();
            threeDaysLater.setDate(new Date().getDate() + 3);
            this.defaultPoll = new Poll();
            this.defaultPoll.pollExpirationDateUtc = threeDaysLater;
            this.defaultPoll.votingGroupShortName = "everyone";
            this.defaultPoll.answers = [
                new PollAnswer("Yes"),
                new PollAnswer("No"),
            ];
            // The new or existing news item that's being edited by the user
            this.editingItem = angular.copy(this.defaultPoll);
            this.shouldAllowMultipleAnswers = false;
            this.isLoading = true;
            this.$http.get("/api/Poll/WhoCanVoteGroups").then((response) => {
                //this.groupEmails = _.sortBy( groupEmails, e => e.displayName.toUpperCase() );
                this.whoCanVoteGroups = response.data;
                // Default to owners instead of everyone for more consistent results in HOAs/condos
                if (this.shouldShowMemberCheckbox && this.whoCanVoteGroups.some(vg => vg.recipientTypeName === "owners")) {
                    this.defaultPoll.votingGroupShortName = "owners";
                    this.editingItem.votingGroupShortName = this.defaultPoll.votingGroupShortName;
                }
                this.onWhoGroupChange();
                this.retrievePolls();
            }, () => this.retrievePolls());
            //this.fellowResidents.getGroupEmailObject().then(
            //    ( groupEmails ) =>
            //    {
            //        this.fellowResidents.getByUnitsAndResidents().then(
            //            ( residentData ) =>
            //            {
            //                this.groupEmails = _.sortBy( groupEmails, e => e.displayName.toUpperCase() );
            //                this.groupResidents = residentData.residents;
            //                this.groupUnits = residentData.byUnit;
            //                this.onWhoGroupChange();
            //                this.retrievePolls();
            //            }
            //        );
            //    },
            //    () => this.retrievePolls()
            //);
        }
        /**
         * Populate the poll data
         */
        retrievePolls() {
            const AbstainAnswerSortOrder = 101;
            this.isLoading = true;
            this.$http.get("/api/Poll").then((httpResponse) => {
                this.pollHistory = httpResponse.data;
                // Convert the date strings to objects
                for (let i = 0; i < this.pollHistory.length; ++i) {
                    // The date comes down as a string so we need to convert it
                    this.pollHistory[i].pollExpirationDateUtc = new Date(this.pollHistory[i].pollExpirationDateUtc);
                    // Remove the abstain answer since it can't be edited, but save the full answer
                    // list for displaying results
                    this.pollHistory[i].fullResultAnswers = this.pollHistory[i].answers;
                    this.pollHistory[i].answers = _.reject(this.pollHistory[i].answers, function (pa) { return pa.sortOrder === AbstainAnswerSortOrder; });
                    if (this.isPollClosed(this.pollHistory[i]))
                        this.pollHistory[i].activeState = "closed";
                    else if (this.pollHistory[i].responses != null && this.pollHistory[i].responses.length > 0)
                        this.pollHistory[i].activeState = "inprogress";
                }
                this.isLoading = false;
            });
        }
        /**
         * Add a new answer
         */
        addAnswer() {
            if (!this.editingItem.answers)
                this.editingItem.answers = [];
            if (this.editingItem.answers.length > 19) {
                alert("You can only have 20 answers maxiumum per poll.");
                return;
            }
            this.editingItem.answers.push(new PollAnswer(""));
            this.onAnswersChange();
            window.setTimeout(() => document.getElementById("poll-answer-textbox-" + (this.editingItem.answers.length - 1)).focus(), 100);
        }
        /**
         * Stop editing a poll and reset the form
         */
        cancelEdit() {
            this.editingItem = angular.copy(this.defaultPoll);
            this.shouldAllowMultipleAnswers = false;
            this.onAnswersChange();
        }
        /**
         * Occurs when the user presses the button to save a poll
         */
        onSavePoll() {
            if (this.editingItem === null)
                return;
            this.isLoading = true;
            const onSave = () => {
                this.isLoading = false;
                this.editingItem = angular.copy(this.defaultPoll);
                this.onAnswersChange();
                this.shouldAllowMultipleAnswers = false;
                this.retrievePolls();
            };
            const onFailure = (response) => {
                this.isLoading = false;
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
        }
        /**
         * Occurs when the user wants to edit an existing poll
         */
        onEditItem(item) {
            this.editingItem = angular.copy(item);
            window.scrollTo(0, 0);
            this.shouldAllowMultipleAnswers = this.editingItem.maxNumResponses > 1;
            this.onAnswersChange();
        }
        /**
         * Occurs when the user wants to delete a poll
         */
        onDeleteItem(item) {
            this.isLoading = true;
            this.$http.delete("/api/Poll?pollId=" + item.pollId).then(() => {
                this.retrievePolls();
            }, (httpResponse) => {
                this.isLoading = false;
                if (httpResponse.status === 403)
                    alert("You cannot authorized to delete this poll.");
                else
                    alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user wants to view the results for a poll
         */
        onViewResults(poll) {
            if (!poll) {
                this.viewingPollResults = null;
                return;
            }
            const chartInfo = Ally.FellowResidentsService.pollReponsesToChart(poll, this.siteInfo);
            poll.chartData = chartInfo.chartData;
            poll.chartLabels = chartInfo.chartLabels;
            // Build the array for the counts to the right of the chart
            poll.answerCounts = [];
            for (let i = 0; i < poll.chartLabels.length; ++i) {
                poll.answerCounts.push({
                    label: poll.chartLabels[i],
                    count: poll.chartData[i]
                });
            }
            this.chartLabels = poll.chartLabels;
            this.chartData = poll.chartData;
            this.viewingPollResults = poll;
            // Hide the home column if there's no home value in any response
            this.shouldShowHomeCol = !this.viewingPollResults.responses.every(r => HtmlUtil.isNullOrWhitespace(r.unitName));
        }
        formatVoteGroupName(votingGroupShortName) {
            if (!this.whoCanVoteGroups)
                return votingGroupShortName;
            const emailGroup = this.whoCanVoteGroups.find(g => g.recipientTypeName.toLowerCase() === votingGroupShortName);
            if (!emailGroup)
                return votingGroupShortName;
            return emailGroup.displayName;
        }
        onMultiAnswerChange() {
            if (this.shouldAllowMultipleAnswers)
                this.editingItem.maxNumResponses = 2;
            else
                this.editingItem.maxNumResponses = 1;
        }
        removeAnswer(index) {
            this.editingItem.answers.splice(index, 1);
            this.onAnswersChange();
        }
        addAbstain() {
            this.editingItem.answers.push(new PollAnswer("Abstain"));
            this.editPollHasAbstain = true;
            this.onAnswersChange();
        }
        onAnswersChange() {
            if (!this.editingItem || !this.editingItem.answers)
                return;
            this.editPollHasAbstain = this.editingItem.answers.some(a => a.answerText && a.answerText.toUpperCase() === "ABSTAIN");
        }
        isPollClosed(pollItem) {
            if (!pollItem || !pollItem.pollExpirationDateUtc)
                return false;
            return moment(pollItem.pollExpirationDateUtc).isBefore(moment());
        }
        onWhoGroupChange() {
            if (!this.shouldShowMemberCheckbox || this.editingItem.isMemberBasedVote)
                this.pollMemberLabel = "member";
            else
                this.pollMemberLabel = "home";
            if (!this.editingItem || !this.editingItem.votingGroupShortName) {
                this.whoGroupNumPossibleVotes = null;
                return;
            }
            const emailGroup = this.whoCanVoteGroups.find(g => g.recipientTypeName === this.editingItem.votingGroupShortName);
            if (!emailGroup) {
                alert("Failed to find selected email group, please refresh the page");
                return;
            }
            // If we're counting homes instead of members
            const isHomeBasedVote = this.shouldShowMemberCheckbox && !this.editingItem.isMemberBasedVote;
            if (isHomeBasedVote) {
                //const emailGroupResidents = this.groupResidents.filter( gr => emailGroup.memberUserIds.includes( gr.userId ) );
                //const emailGroupHomeIds = _.uniq( emailGroupResidents.flatMap( egr => egr.homes.filter( h => !h.isRenter ).map( h => h.unitId ) ) );
                //this.whoGroupNumPossibleVotes = emailGroupHomeIds.length;
                //this.whoGroupMembersTooltip = "Homes: " + this.groupUnits
                //    .filter( gu => emailGroupHomeIds.includes( gu.unitId ) )
                //    .map( gu => gu.name + " (" + gu.owners.filter( o => emailGroup.memberUserIds.includes( o.userId ) ).map( o => o.fullName ) + ")" )
                //    .join( ", " );
                this.whoGroupNumPossibleVotes = emailGroup.numPossibleHomeVotes;
                this.whoGroupMembersTooltip = "Homes: " + emailGroup.homeNamesInvolved;
            }
            // Otherwise all residents can cast a vote
            else {
                this.whoGroupNumPossibleVotes = emailGroup.numPossibleMemberVotes;
                this.whoGroupMembersTooltip = "Members: " + emailGroup.memberNamesInvolved;
            }
        }
    }
    ManagePollsController.$inject = ["$http", "SiteInfo", "fellowResidents"];
    Ally.ManagePollsController = ManagePollsController;
    class Poll {
        constructor() {
            this.isAnonymous = true;
        }
    }
    Ally.Poll = Poll;
    class PollResultEntry {
    }
    Ally.PollResultEntry = PollResultEntry;
    class PollAnswer {
        constructor(answerText) {
            this.answerText = answerText;
        }
    }
    Ally.PollAnswer = PollAnswer;
    class PollResponse {
    }
    Ally.PollResponse = PollResponse;
})(Ally || (Ally = {}));
CA.angularApp.component("managePolls", {
    templateUrl: "/ngApp/chtn/manager/manage-polls.html",
    controller: Ally.ManagePollsController
});

var Ally;
(function (Ally) {
    /**
     * Represents a group email address to which emails sent get forwarded to the whole group
     */
    class GroupEmailInfo {
    }
    Ally.GroupEmailInfo = GroupEmailInfo;
    class GroupEmailGroups {
    }
    Ally.GroupEmailGroups = GroupEmailGroups;
    class CustomEmailGroup {
    }
    Ally.CustomEmailGroup = CustomEmailGroup;
    class CustomEmailGroupMember {
    }
    Ally.CustomEmailGroupMember = CustomEmailGroupMember;
    class HomeEntry {
    }
    /**
     * Represents a member of a CHTN group
     */
    class FellowChtnResident extends Ally.SimpleUserEntry {
    }
    Ally.FellowChtnResident = FellowChtnResident;
    class FellowResidentCommittee extends FellowChtnResident {
    }
    Ally.FellowResidentCommittee = FellowResidentCommittee;
    class CommitteeListingInfo {
    }
    Ally.CommitteeListingInfo = CommitteeListingInfo;
    class BasicCommitteeMember {
    }
    Ally.BasicCommitteeMember = BasicCommitteeMember;
    class UnitListing {
    }
    Ally.UnitListing = UnitListing;
    class FellowResidents {
    }
    Ally.FellowResidents = FellowResidents;
    /**
     * Provides methods to accessing group member and home information
     */
    class FellowResidentsService {
        /**
         * The constructor for the class
         */
        constructor($http, $q, $cacheFactory) {
            this.$http = $http;
            this.$q = $q;
            this.$cacheFactory = $cacheFactory;
            this.httpCache = $cacheFactory("FellowResidentsService");
        }
        /**
         * Get the residents for the current group
         */
        getResidents() {
            return this.$http.get("/api/BuildingResidents", { cache: this.httpCache }).then((httpResponse) => {
                return httpResponse.data.residents;
            }, (httpResponse) => {
                return this.$q.reject(httpResponse);
            });
        }
        /**
         * Get the members for a committee
         */
        getCommitteeMembers(committeeId) {
            return this.$http.get(`/api/Committee/${committeeId}/Members`).then((httpResponse) => {
                return httpResponse.data;
            }, (httpResponse) => {
                return this.$q.reject(httpResponse);
            });
        }
        /**
         * Determine if the logged-in user is a committee member
         */
        isCommitteeMember(committeeId) {
            return this.$http.get(`/api/Committee/${committeeId}/IsMember`, { cache: this.httpCache }).then((httpResponse) => {
                return httpResponse.data;
            }, (httpResponse) => {
                return this.$q.reject(httpResponse);
            });
        }
        /**
         * Get the residents for an association, broken down by unit for easy display
         */
        getByUnits() {
            return this.$http.get("/api/BuildingResidents", { cache: this.httpCache }).then((httpResponse) => {
                return httpResponse.data.byUnit;
            }, (httpResponse) => {
                return this.$q.reject(httpResponse);
            });
        }
        /**
         * Get a list of residents and homes
         */
        getByUnitsAndResidents() {
            return this.$http.get("/api/BuildingResidents", { cache: this.httpCache }).then((httpResponse) => {
                return httpResponse.data;
            }, (httpResponse) => {
                return this.$q.reject(httpResponse);
            });
        }
        /**
         * Get the object describing the available group email addresses
         */
        getGroupEmailObject() {
            return this.$http.get("/api/BuildingResidents/EmailGroups", { cache: this.httpCache }).then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return this.$q.reject(httpResponse);
            });
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
        getAllGroupEmails() {
            return this.$http.get("/api/BuildingResidents/AllEmailGroups", { cache: this.httpCache }).then((httpResponse) => {
                return httpResponse.data;
            }, (httpResponse) => {
                return this.$q.reject(httpResponse);
            });
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
        sendMessage(recipientUserId, messageBody, messageSubject, shouldSendAsBoard, shouldSendAsCommitteeId) {
            const postData = {
                recipientUserId: recipientUserId,
                messageBody: messageBody,
                messageSubject: messageSubject,
                shouldSendAsBoard,
                shouldSendAsCommitteeId
            };
            return this.$http.post("/api/BuildingResidents/SendMessage", postData);
        }
        /**
         * Clear cached values, such as when the user changes values in Manage -> Residents
         */
        clearResidentCache() {
            this.httpCache.removeAll();
        }
        /**
         * Test if a board position is one of the officer positions
         */
        static isOfficerBoardPosition(boardPosition) {
            const OfficerPositions = [
                1,
                2,
                4,
                16,
                64, // Secretary + Treasurer
            ];
            return OfficerPositions.indexOf(boardPosition) !== -1;
        }
        /**
         * Test if a board position is any except the property manager
         */
        static isNonPropMgrBoardPosition(boardPosition) {
            if (boardPosition < 1 // Handle invalid values
                || boardPosition === FellowResidentsService.BoardPos_None
                || boardPosition === FellowResidentsService.BoardPos_PropertyManager)
                return false;
            return true;
        }
        static pollReponsesToChart(poll, siteInfo) {
            const talliedVotes = [];
            const logVote = function (answerId) {
                let curAnswerCount = talliedVotes.find(tv => tv.answerId === answerId);
                if (!curAnswerCount) {
                    curAnswerCount = new PollAnswerCount(answerId);
                    talliedVotes.push(curAnswerCount);
                }
                ++curAnswerCount.numVotes;
            };
            poll.responses.forEach(r => {
                if (r.answerIds && r.answerIds.length > 0)
                    r.answerIds.forEach(aid => logVote(aid));
                else if (r.writeInAnswer) {
                    const newWriteIn = new PollAnswerCount(0, r.writeInAnswer);
                    ++newWriteIn.numVotes;
                    talliedVotes.push(newWriteIn);
                }
            });
            const results = {
                chartData: [],
                chartLabels: []
            };
            // Go through each answer and store the name and count for that answer
            for (const curTalliedVote of talliedVotes) {
                const pollAnswer = _.find(poll.answers, (a) => a.pollAnswerId === curTalliedVote.answerId);
                if (pollAnswer) {
                    results.chartLabels.push(pollAnswer.answerText);
                    results.chartData.push(curTalliedVote.numVotes);
                }
                else if (curTalliedVote.writeInAnswer) {
                    results.chartLabels.push("Write In: " + curTalliedVote.writeInAnswer);
                    results.chartData.push(curTalliedVote.numVotes);
                }
                else
                    console.log("Unknown answer ID found: " + curTalliedVote.answerId);
            }
            if (poll.responses && poll.responses.length < siteInfo.privateSiteInfo.numUnits) {
                results.chartLabels.push("No Response");
                const isMemberBasedGroup = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
                if (isMemberBasedGroup)
                    results.chartData.push(siteInfo.privateSiteInfo.numMembers - poll.responses.length);
                else
                    results.chartData.push(siteInfo.privateSiteInfo.numUnits - poll.responses.length);
            }
            return results;
        }
        /**
         * Retrieve the possible "send as" options for email sending. Guaranteed to return at least
         * one option, the "self" option.
         */
        getEmailSendAsOptions(userInfo) {
            const sendAsOptions = [];
            sendAsOptions.push({ displayLabel: `Yourself (${userInfo.fullName})`, noteText: "The default to send a message as yourself", isBoardOption: false, committee: null });
            const isBoard = FellowResidentsService.isNonPropMgrBoardPosition(userInfo.boardPosition);
            if (isBoard)
                sendAsOptions.push({ displayLabel: `The Board`, noteText: "This will set the 'from' address to the board's group email address", isBoardOption: true, committee: null });
            return this.$http.get("/api/Committee/MyCommittees", { cache: true }).then((response) => {
                if (response.data && response.data.length > 0) {
                    const usersCommittees = _.sortBy(response.data, c => c.name.toLowerCase());
                    for (const c of usersCommittees) {
                        sendAsOptions.push({ displayLabel: c.name, noteText: "This will set the 'from' address to the committee's group email address", isBoardOption: false, committee: c });
                    }
                }
                return sendAsOptions;
            }, () => {
                return sendAsOptions;
            });
        }
    }
    FellowResidentsService.BoardPos_None = 0;
    FellowResidentsService.BoardPos_PropertyManager = 32;
    FellowResidentsService.CustomRecipientType = "CUSTOM";
    FellowResidentsService.BoardPositionNames = [
        { id: FellowResidentsService.BoardPos_None, name: "None" },
        { id: 1, name: "President" },
        { id: 2, name: "Treasurer" },
        { id: 4, name: "Secretary" },
        { id: 8, name: "Director/Member at Large" },
        { id: 16, name: "Vice President" },
        { id: FellowResidentsService.BoardPos_PropertyManager, name: "Property Manager" },
        { id: 64, name: "Secretary + Treasurer" }
    ];
    Ally.FellowResidentsService = FellowResidentsService;
    class PollAnswerCount {
        constructor(answerId, writeInAnswer = null) {
            this.numVotes = 0;
            this.answerId = answerId;
            this.writeInAnswer = writeInAnswer;
        }
    }
    class EmailSendAsOption {
    }
    Ally.EmailSendAsOption = EmailSendAsOption;
})(Ally || (Ally = {}));
angular.module("CondoAlly").service("fellowResidents", ["$http", "$q", "$cacheFactory", Ally.FellowResidentsService]);

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
    class CommitteeListingInfo {
    }
    Ally.CommitteeListingInfo = CommitteeListingInfo;
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
            }, function (httpResponse) {
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
         * Populate the lists of group emails
         */
        _setupGroupEmailObject(allResidents, unitList) {
            let emailLists = {};
            emailLists = {
                everyone: [],
                owners: [],
                renters: [],
                board: [],
                residentOwners: [],
                nonResidentOwners: [],
                residentOwnersAndRenters: [],
                propertyManagers: [],
                discussion: []
            };
            // Go through each resident and add them to each email group they belong to
            for (let i = 0; i < allResidents.length; ++i) {
                const r = allResidents[i];
                const displayName = r.fullName + (r.hasEmail ? "" : "*");
                emailLists.everyone.push(displayName);
                if (r.boardPosition !== FellowResidentsService.BoardPos_None && r.boardPosition !== FellowResidentsService.BoardPos_PropertyManager)
                    emailLists.board.push(displayName);
                if (r.boardPosition === FellowResidentsService.BoardPos_PropertyManager)
                    emailLists.propertyManagers.push(displayName);
                if (r.includeInDiscussionEmail)
                    emailLists.discussion.push(displayName);
                let isOwner = false;
                let isRenter = false;
                let unitIsRented = false;
                for (let unitIndex = 0; unitIndex < r.homes.length; ++unitIndex) {
                    const simpleHome = r.homes[unitIndex];
                    if (!simpleHome.isRenter) {
                        isOwner = true;
                        const unit = _.find(unitList, function (u) { return u.unitId === simpleHome.unitId; });
                        unitIsRented = unit.renters.length > 0;
                    }
                    if (simpleHome.isRenter)
                        isRenter = true;
                }
                if (isOwner) {
                    emailLists.owners.push(displayName);
                    if (unitIsRented)
                        emailLists.nonResidentOwners.push(displayName);
                    else {
                        emailLists.residentOwners.push(displayName);
                        emailLists.residentOwnersAndRenters.push(displayName);
                    }
                }
                if (isRenter) {
                    emailLists.renters.push(displayName);
                    emailLists.residentOwnersAndRenters.push(displayName);
                }
            }
            // If there are no renters then there are no non-residents so hide those lists
            if (emailLists.renters.length === 0) {
                emailLists.residentOwners = [];
                emailLists.residentOwnersAndRenters = [];
                emailLists.nonResidentOwners = [];
            }
            return emailLists;
        }
        /**
         * Send an email message to another user
         */
        sendMessage(recipientUserId, messageBody, messageSubject, shouldSendAsBoard) {
            const postData = {
                recipientUserId: recipientUserId,
                messageBody: messageBody,
                messageSubject: messageSubject,
                shouldSendAsBoard: shouldSendAsBoard
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
                let count = talliedVotes.find(tv => tv.answerId === answerId);
                if (!count) {
                    count = new PollAnswerCount(answerId);
                    talliedVotes.push(count);
                }
                ++count.numVotes;
            };
            const logVotes = (answerIds) => answerIds.forEach(aid => logVote(aid));
            poll.responses.forEach(r => logVotes(r.answerIds));
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
        constructor(answerId) {
            this.numVotes = 0;
            this.answerId = answerId;
        }
    }
})(Ally || (Ally = {}));
angular.module("CondoAlly").service("fellowResidents", ["$http", "$q", "$cacheFactory", Ally.FellowResidentsService]);

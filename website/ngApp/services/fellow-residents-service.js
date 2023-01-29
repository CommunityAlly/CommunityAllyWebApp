var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    /**
     * Represents a group email address to which emails sent get forwarded to the whole group
     */
    var GroupEmailInfo = /** @class */ (function () {
        function GroupEmailInfo() {
        }
        return GroupEmailInfo;
    }());
    Ally.GroupEmailInfo = GroupEmailInfo;
    var GroupEmailGroups = /** @class */ (function () {
        function GroupEmailGroups() {
        }
        return GroupEmailGroups;
    }());
    Ally.GroupEmailGroups = GroupEmailGroups;
    var CustomEmailGroup = /** @class */ (function () {
        function CustomEmailGroup() {
        }
        return CustomEmailGroup;
    }());
    Ally.CustomEmailGroup = CustomEmailGroup;
    var CustomEmailGroupMember = /** @class */ (function () {
        function CustomEmailGroupMember() {
        }
        return CustomEmailGroupMember;
    }());
    Ally.CustomEmailGroupMember = CustomEmailGroupMember;
    var HomeEntry = /** @class */ (function () {
        function HomeEntry() {
        }
        return HomeEntry;
    }());
    /**
     * Represents a member of a CHTN group
     */
    var FellowChtnResident = /** @class */ (function (_super) {
        __extends(FellowChtnResident, _super);
        function FellowChtnResident() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return FellowChtnResident;
    }(Ally.SimpleUserEntry));
    Ally.FellowChtnResident = FellowChtnResident;
    var CommitteeListingInfo = /** @class */ (function () {
        function CommitteeListingInfo() {
        }
        return CommitteeListingInfo;
    }());
    Ally.CommitteeListingInfo = CommitteeListingInfo;
    var UnitListing = /** @class */ (function () {
        function UnitListing() {
        }
        return UnitListing;
    }());
    Ally.UnitListing = UnitListing;
    var FellowResidents = /** @class */ (function () {
        function FellowResidents() {
        }
        return FellowResidents;
    }());
    Ally.FellowResidents = FellowResidents;
    /**
     * Provides methods to accessing group member and home information
     */
    var FellowResidentsService = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function FellowResidentsService($http, $q, $cacheFactory) {
            this.$http = $http;
            this.$q = $q;
            this.$cacheFactory = $cacheFactory;
            this.httpCache = $cacheFactory("FellowResidentsService");
        }
        /**
         * Get the residents for the current group
         */
        FellowResidentsService.prototype.getResidents = function () {
            var _this = this;
            return this.$http.get("/api/BuildingResidents", { cache: this.httpCache }).then(function (httpResponse) {
                return httpResponse.data.residents;
            }, function (httpResponse) {
                return _this.$q.reject(httpResponse);
            });
        };
        /**
         * Get the members for a committee
         */
        FellowResidentsService.prototype.getCommitteeMembers = function (committeeId) {
            return this.$http.get("/api/Committee/" + committeeId + "/Members").then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return this.$q.reject(httpResponse);
            });
        };
        /**
         * Determine if the logged-in user is a committee member
         */
        FellowResidentsService.prototype.isCommitteeMember = function (committeeId) {
            var _this = this;
            return this.$http.get("/api/Committee/" + committeeId + "/IsMember", { cache: this.httpCache }).then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return _this.$q.reject(httpResponse);
            });
        };
        /**
         * Get the residents for an association, broken down by unit for easy display
         */
        FellowResidentsService.prototype.getByUnits = function () {
            var _this = this;
            return this.$http.get("/api/BuildingResidents", { cache: this.httpCache }).then(function (httpResponse) {
                return httpResponse.data.byUnit;
            }, function (httpResponse) {
                return _this.$q.reject(httpResponse);
            });
        };
        /**
         * Get a list of residents and homes
         */
        FellowResidentsService.prototype.getByUnitsAndResidents = function () {
            var _this = this;
            return this.$http.get("/api/BuildingResidents", { cache: this.httpCache }).then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return _this.$q.reject(httpResponse);
            });
        };
        /**
         * Get the object describing the available group email addresses
         */
        FellowResidentsService.prototype.getGroupEmailObject = function () {
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
        };
        /**
         * Get the object describing the available group email addresses
         */
        FellowResidentsService.prototype.getAllGroupEmails = function () {
            var _this = this;
            return this.$http.get("/api/BuildingResidents/AllEmailGroups", { cache: this.httpCache }).then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return _this.$q.reject(httpResponse);
            });
            //var innerThis = this;
            //return this.getByUnitsAndResidents().then( function( unitsAndResidents )
            //{
            //    var unitList = unitsAndResidents.byUnit;
            //    var allResidents = unitsAndResidents.residents;
            //    return innerThis.setupGroupEmailObject( allResidents, unitList, null );
            //} );
        };
        /**
         * Populate the lists of group emails
         */
        FellowResidentsService.prototype._setupGroupEmailObject = function (allResidents, unitList) {
            var emailLists = {};
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
            for (var i = 0; i < allResidents.length; ++i) {
                var r = allResidents[i];
                var displayName = r.fullName + (r.hasEmail ? "" : "*");
                emailLists.everyone.push(displayName);
                if (r.boardPosition !== FellowResidentsService.BoardPos_None && r.boardPosition !== FellowResidentsService.BoardPos_PropertyManager)
                    emailLists.board.push(displayName);
                if (r.boardPosition === FellowResidentsService.BoardPos_PropertyManager)
                    emailLists.propertyManagers.push(displayName);
                if (r.includeInDiscussionEmail)
                    emailLists.discussion.push(displayName);
                var isOwner = false;
                var isRenter = false;
                var unitIsRented = false;
                var _loop_1 = function (unitIndex) {
                    var simpleHome = r.homes[unitIndex];
                    if (!simpleHome.isRenter) {
                        isOwner = true;
                        var unit = _.find(unitList, function (u) { return u.unitId === simpleHome.unitId; });
                        unitIsRented = unit.renters.length > 0;
                    }
                    if (simpleHome.isRenter)
                        isRenter = true;
                };
                for (var unitIndex = 0; unitIndex < r.homes.length; ++unitIndex) {
                    _loop_1(unitIndex);
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
        };
        /**
         * Send an email message to another user
         */
        FellowResidentsService.prototype.sendMessage = function (recipientUserId, messageBody, messageSubject, shouldSendAsBoard) {
            var postData = {
                recipientUserId: recipientUserId,
                messageBody: messageBody,
                messageSubject: messageSubject,
                shouldSendAsBoard: shouldSendAsBoard
            };
            return this.$http.post("/api/BuildingResidents/SendMessage", postData);
        };
        /**
         * Clear cached values, such as when the user changes values in Manage -> Residents
         */
        FellowResidentsService.prototype.clearResidentCache = function () {
            this.httpCache.removeAll();
        };
        /**
         * Test if a board position is one of the officer positions
         */
        FellowResidentsService.isOfficerBoardPosition = function (boardPosition) {
            var OfficerPositions = [
                1,
                2,
                4,
                16,
                64,
            ];
            return OfficerPositions.indexOf(boardPosition) !== -1;
        };
        /**
         * Test if a board position is any except the property manager
         */
        FellowResidentsService.isNonPropMgrBoardPosition = function (boardPosition) {
            if (boardPosition < 1 // Handle invalid values
                || boardPosition === FellowResidentsService.BoardPos_None
                || boardPosition === FellowResidentsService.BoardPos_PropertyManager)
                return false;
            return true;
        };
        FellowResidentsService.pollReponsesToChart = function (poll, siteInfo) {
            var talliedVotes = [];
            var logVote = function (answerId) {
                var count = talliedVotes.find(function (tv) { return tv.answerId === answerId; });
                if (!count) {
                    count = new PollAnswerCount(answerId);
                    talliedVotes.push(count);
                }
                ++count.numVotes;
            };
            var logVotes = function (answerIds) { return answerIds.forEach(function (aid) { return logVote(aid); }); };
            poll.responses.forEach(function (r) { return logVotes(r.answerIds); });
            var results = {
                chartData: [],
                chartLabels: []
            };
            var _loop_2 = function (curTalliedVote) {
                var pollAnswer = _.find(poll.answers, function (a) { return a.pollAnswerId === curTalliedVote.answerId; });
                if (pollAnswer) {
                    results.chartLabels.push(pollAnswer.answerText);
                    results.chartData.push(curTalliedVote.numVotes);
                }
                else
                    console.log("Unknown answer ID found: " + curTalliedVote.answerId);
            };
            // Go through each answer and store the name and count for that answer
            for (var _i = 0, talliedVotes_1 = talliedVotes; _i < talliedVotes_1.length; _i++) {
                var curTalliedVote = talliedVotes_1[_i];
                _loop_2(curTalliedVote);
            }
            if (poll.responses && poll.responses.length < siteInfo.privateSiteInfo.numUnits) {
                results.chartLabels.push("No Response");
                var isMemberBasedGroup = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
                if (isMemberBasedGroup)
                    results.chartData.push(siteInfo.privateSiteInfo.numMembers - poll.responses.length);
                else
                    results.chartData.push(siteInfo.privateSiteInfo.numUnits - poll.responses.length);
            }
            return results;
        };
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
        return FellowResidentsService;
    }());
    Ally.FellowResidentsService = FellowResidentsService;
    var PollAnswerCount = /** @class */ (function () {
        function PollAnswerCount(answerId) {
            this.numVotes = 0;
            this.answerId = answerId;
        }
        return PollAnswerCount;
    }());
})(Ally || (Ally = {}));
angular.module("CondoAlly").service("fellowResidents", ["$http", "$q", "$cacheFactory", Ally.FellowResidentsService]);

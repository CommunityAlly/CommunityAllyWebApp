var Ally;
(function (Ally) {
    /**
     * Provides methods to accessing group member and home information
     */
    var FellowResidentsService = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function FellowResidentsService($http, $q) {
            this.$http = $http;
            this.$q = $q;
        }
        /**
         * Get the residents for the current group
         */
        FellowResidentsService.prototype.getResidents = function () {
            var innerThis = this;
            return this.$http.get("/api/BuildingResidents", { cache: true }).then(function (httpResponse) {
                return httpResponse.data.residents;
            }, function (httpResponse) {
                return innerThis.$q.reject(httpResponse);
            });
        };
        /**
         * Get the residents for an association, broken down by unit for easy display
         */
        FellowResidentsService.prototype.getByUnits = function () {
            var innerThis = this;
            return this.$http.get("/api/BuildingResidents", { cache: true }).then(function (httpResponse) {
                return httpResponse.data.byUnit;
            }, function (httpResponse) {
                return innerThis.$q.reject(httpResponse);
            });
        };
        /**
         * Get a list of residents and homes
         */
        FellowResidentsService.prototype.getByUnitsAndResidents = function () {
            var innerThis = this;
            return this.$http.get("/api/BuildingResidents", { cache: true }).then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return this.$q.reject(httpResponse);
            });
        };
        /**
         * Get the object describing the available group e-mail addresses
         */
        FellowResidentsService.prototype.getGroupEmailObject = function () {
            var innerThis = this;
            return this.getByUnitsAndResidents().then(function (unitsAndResidents) {
                var unitList = unitsAndResidents.byUnit;
                var allResidents = unitsAndResidents.residents;
                return innerThis.setupGroupEmailObject(allResidents, unitList, null);
            });
        };
        /**
         * Populate the lists of group e-mails
         */
        FellowResidentsService.prototype.setupGroupEmailObject = function (allResidents, unitList, emailLists) {
            if (!emailLists || typeof (emailLists.everyone) !== "object") {
                emailLists =
                    {
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
            }
            // Go through each resident and add them to each e-mail group they belong to
            for (var i = 0; i < allResidents.length; ++i) {
                var r = allResidents[i];
                var displayName = r.fullName + (r.hasEmail ? "" : "*");
                emailLists.everyone.push(displayName);
                var BoardPos_None = 0;
                var BoardPos_PropertyManager = 32;
                if (r.boardPosition !== BoardPos_None && r.boardPosition !== BoardPos_PropertyManager)
                    emailLists.board.push(displayName);
                if (r.boardPosition === BoardPos_PropertyManager)
                    emailLists.propertyManagers.push(displayName);
                if (r.includeInDiscussionEmail)
                    emailLists.discussion.push(displayName);
                var isOwner = false;
                var isRenter = false;
                var unitIsRented = false;
                for (var unitIndex = 0; unitIndex < r.homes.length; ++unitIndex) {
                    var simpleHome = r.homes[unitIndex];
                    if (!simpleHome.isRenter) {
                        isOwner = true;
                        var unit = _.find(unitList, function (u) { return u.unitId === simpleHome.unitId; });
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
        };
        /**
         * Send an e-mail message to another user
         */
        FellowResidentsService.prototype.sendMessage = function (recipientUserId, messageBody) {
            var postData = {
                recipientUserId: recipientUserId,
                messageBody: messageBody
            };
            return this.$http.post("/api/BuildingResidents/SendMessage", postData);
        };
        return FellowResidentsService;
    }());
    Ally.FellowResidentsService = FellowResidentsService;
})(Ally || (Ally = {}));
angular.module("CondoAlly").service("fellowResidents", ["$http", "$q", Ally.FellowResidentsService]);

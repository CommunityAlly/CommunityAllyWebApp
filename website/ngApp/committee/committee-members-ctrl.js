/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    var CommitteeMembersController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function CommitteeMembersController($http, fellowResidents, $cacheFactory) {
            this.$http = $http;
            this.fellowResidents = fellowResidents;
            this.$cacheFactory = $cacheFactory;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        CommitteeMembersController.prototype.$onInit = function () {
            this.populateAllMembers();
        };
        /**
         * Populate the full list of committee members
         */
        CommitteeMembersController.prototype.populateAllMembers = function () {
            var _this = this;
            this.isLoading = true;
            this.fellowResidents.getResidents().then(function (residents) {
                _this.allGroupMembers = residents;
                _this.getMembers();
            });
        };
        /**
         * Set the contact user for this committee
         */
        CommitteeMembersController.prototype.setContactMember = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/Committee/" + this.committee.committeeId + "/SetContactMember?userId=" + this.contactUser.userId, null).then(function (response) {
                _this.isLoading = false;
                _this.committee.contactMemberUserId = _this.contactUser.userId;
                // Since we changed the committee data, clear the cache so we show the up-to-date info
                _this.$cacheFactory.get('$http').remove("/api/Committee/" + _this.committee.committeeId);
                // Update the fellow residents page next time we're there
                _this.fellowResidents.clearResidentCache();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to set contact member: " + response.data.exceptionMessage);
            });
        };
        /**
         * Retrieve the full list of committee members from the server
         */
        CommitteeMembersController.prototype.getMembers = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Committee/" + this.committee.committeeId + "/Members").then(function (response) {
                _this.isLoading = false;
                _this.members = response.data;
                var isMember = function (u) { return _.some(_this.members, function (m) { return m.userId === u.userId; }); };
                _this.filteredGroupMembers = _.filter(_this.allGroupMembers, function (m) { return !isMember(m); });
                _this.filteredGroupMembers = _.sortBy(_this.filteredGroupMembers, function (m) { return (m.fullName || "").toLowerCase(); });
                _this.contactUser = _.find(_this.members, function (m) { return m.userId == _this.committee.contactMemberUserId; });
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve committee members, please refresh the page to try again");
            });
        };
        /**
         * Add a member to this committee
         */
        CommitteeMembersController.prototype.addSelectedMember = function () {
            var _this = this;
            if (!this.userForAdd)
                return;
            this.isLoading = true;
            this.$http.put("/api/Committee/" + this.committee.committeeId + "/AddMember?userId=" + this.userForAdd.userId, null).then(function (response) {
                _this.isLoading = false;
                _this.getMembers();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to add member, please refresh the page to try again: " + response.data.exceptionMessage);
            });
        };
        /**
         * Remove a member from this committee
         */
        CommitteeMembersController.prototype.removeMember = function (member) {
            var _this = this;
            if (!confirm("Are you sure you want to remove this person from this committee?"))
                return;
            this.isLoading = true;
            this.$http.put("/api/Committee/" + this.committee.committeeId + "/RemoveMember?userId=" + member.userId, null).then(function (response) {
                _this.isLoading = false;
                _this.getMembers();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to remove member, please refresh the page to try again: " + response.data.exceptionMessage);
            });
        };
        CommitteeMembersController.$inject = ["$http", "fellowResidents", "$cacheFactory"];
        return CommitteeMembersController;
    }());
    Ally.CommitteeMembersController = CommitteeMembersController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeMembers", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/committee/committee-members.html",
    controller: Ally.CommitteeMembersController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    class CommitteeMembersController {
        /**
         * The constructor for the class
         */
        constructor($http, fellowResidents, $cacheFactory, siteInfo) {
            this.$http = $http;
            this.fellowResidents = fellowResidents;
            this.$cacheFactory = $cacheFactory;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.newContactMemberOptions = [];
            this.contactUsers = [];
            this.canManage = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.populateAllMembers();
        }
        /**
         * Populate the full list of committee members
         */
        populateAllMembers() {
            this.isLoading = true;
            this.fellowResidents.getResidents().then(residents => {
                this.allGroupMembers = residents;
                this.getCommitteeMembers();
            });
        }
        /**
         * Set the contact user for this committee
         */
        setContactMember(member, isContactMember) {
            console.log("In setContactMember", member, isContactMember);
            if (!member)
                return;
            this.isLoading = true;
            const putUri = `/api/Committee/${this.committee.committeeId}/SetMemberIsContact/${member.userId}/${isContactMember}`;
            this.$http.put(putUri, null).then(() => // response: ng.IHttpPromiseCallbackArg<any> ) =>
             {
                this.isLoading = false;
                member.isContactMember = isContactMember;
                this.contactUserForAdd = null;
                this.contactUsers = _.filter(this.members, m => m.isContactMember);
                this.newContactMemberOptions = _.filter(this.members, m => !m.isContactMember);
                // Since we changed the committee data, clear the cache so we show the up-to-date info
                this.$cacheFactory.get('$http').remove("/api/Committee/" + this.committee.committeeId);
                // Update the fellow residents page next time we're there
                this.fellowResidents.clearResidentCache();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to set contact member: " + response.data.exceptionMessage);
            });
        }
        /**
         * Retrieve the full list of committee members from the server
         */
        getCommitteeMembers() {
            this.isLoading = true;
            this.fellowResidents.getCommitteeMembers(this.committee.committeeId).then((committeeMembers) => {
                this.isLoading = false;
                this.members = committeeMembers;
                this.members = _.sortBy(this.members, m => (m.fullName || "").toLowerCase());
                const isMember = (u) => _.some(this.members, (m) => m.userId === u.userId);
                this.filteredGroupMembers = _.filter(this.allGroupMembers, m => !isMember(m));
                this.filteredGroupMembers = _.sortBy(this.filteredGroupMembers, m => (m.fullName || "").toLowerCase());
                this.contactUsers = _.filter(this.members, m => m.isContactMember);
                this.newContactMemberOptions = _.filter(this.members, m => !m.isContactMember);
                // Admin or committee members can manage the committee
                this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager || _.any(this.members, m => m.userId === this.siteInfo.userInfo.userId);
            }, (response) => {
                this.isLoading = false;
                console.log("Failed to retrieve committee members", response.data);
                alert("Failed to retrieve committee members, please refresh the page to try again");
            });
        }
        /**
         * Add a member to this committee
         */
        addSelectedMember() {
            if (!this.userForAdd)
                return;
            this.isLoading = true;
            this.$http.put(`/api/Committee/${this.committee.committeeId}/AddMember?userId=${this.userForAdd.userId}`, null).then(() => {
                this.isLoading = false;
                this.getCommitteeMembers();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to add member, please refresh the page to try again: " + response.data.exceptionMessage);
            });
        }
        /**
         * Remove a member from this committee
         */
        removeMember(member) {
            if (!confirm("Are you sure you want to remove this person from this committee?"))
                return;
            this.isLoading = true;
            this.$http.put(`/api/Committee/${this.committee.committeeId}/RemoveMember?userId=${member.userId}`, null).then(() => {
                this.isLoading = false;
                this.getCommitteeMembers();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to remove member, please refresh the page to try again: " + response.data.exceptionMessage);
            });
        }
    }
    CommitteeMembersController.$inject = ["$http", "fellowResidents", "$cacheFactory", "SiteInfo"];
    Ally.CommitteeMembersController = CommitteeMembersController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeMembers", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/committee/committee-members.html",
    controller: Ally.CommitteeMembersController
});

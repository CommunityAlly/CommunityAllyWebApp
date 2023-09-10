var Ally;
(function (Ally) {
    class Committee {
        constructor() {
            this.isPrivate = false;
        }
    }
    Ally.Committee = Committee;
    /**
     * The controller for the page to add, edit, and delete committees
     */
    class ManageCommitteesController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.includeInactive = false;
            this.activeCommittees = [];
            this.inactiveCommittees = [];
            this.showInactiveCommittees = false;
            this.editCommittee = null;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.retrieveCommittees();
        }
        /**
        * Called when the user chooses to deactivate a committee
        */
        startEditCommittee(committee) {
            this.editCommittee = committee;
        }
        /**
        * Called when the user chooses to deactivate a committee
        */
        showCreateModal() {
            this.editCommittee = new Committee();
            this.editCommittee.committeeType = "Ongoing";
        }
        /**
        * Called when the user chooses to deactivate a committee
        */
        toggleCommitteeActive(committee) {
            this.isLoading = true;
            const putUri = (committee.deactivationDateUtc ? "/api/Committee/Reactivate/" : "/api/Committee/Deactivate/") + committee.committeeId;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
                this.retrieveCommittees();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve the modify committee: " + response.data.exceptionMessage);
            });
        }
        /**
        * Retrieve the list of available committees
        */
        retrieveCommittees() {
            this.isLoading = true;
            this.$http.get("/api/Committee?includeInactive=true").then((response) => {
                const committees = response.data;
                this.isLoading = false;
                this.activeCommittees = _.filter(committees, c => !c.deactivationDateUtc);
                this.inactiveCommittees = _.filter(committees, c => !!c.deactivationDateUtc);
                this.activeCommittees = _.sortBy(this.activeCommittees, c => c.name.toLowerCase());
                this.inactiveCommittees = _.sortBy(this.inactiveCommittees, c => c.name.toLowerCase());
                // Convert the last login timestamps to local time
                //_.forEach( committees, c => c.creationDateUtc = moment.utc( c.creationDateUtc ).toDate() );
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve the committee listing: " + response.data.exceptionMessage);
            });
        }
        /**
        * Create a new committee
        */
        saveCommittee() {
            if (HtmlUtil.isNullOrWhitespace(this.editCommittee.name)) {
                alert("Please enter a name for the new committee.");
                return;
            }
            if (!this.editCommittee.committeeType) {
                alert("Please select a type for the new committee.");
                return;
            }
            this.isLoading = true;
            const saveUri = `/api/Committee${(this.editCommittee.committeeId ? ("/" + this.editCommittee.committeeId.toString()) : "")}?name=${encodeURIComponent(this.editCommittee.name)}&type=${encodeURIComponent(this.editCommittee.committeeType)}&isPrivate=${this.editCommittee.isPrivate.toString()}`;
            const httpFunc = this.editCommittee.committeeId ? this.$http.put : this.$http.post;
            httpFunc(saveUri, null).then(() => {
                this.isLoading = false;
                this.editCommittee = null;
                this.retrieveCommittees();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save the committee: " + response.data.exceptionMessage);
            });
        }
    }
    ManageCommitteesController.$inject = ["$http", "SiteInfo", "$cacheFactory"];
    Ally.ManageCommitteesController = ManageCommitteesController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageCommittees", {
    templateUrl: "/ngApp/chtn/manager/manage-committees.html",
    controller: Ally.ManageCommitteesController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="../../Services/html-util.ts" />
var Ally;
(function (Ally) {
    var Committee = /** @class */ (function () {
        function Committee() {
            this.isPrivate = false;
        }
        return Committee;
    }());
    Ally.Committee = Committee;
    /**
     * The controller for the page to add, edit, and delete committees
     */
    var ManageCommitteesController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManageCommitteesController($http, siteInfo, $cacheFactory) {
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
        ManageCommitteesController.prototype.$onInit = function () {
            this.retrieveCommittees();
        };
        /**
        * Called when the user chooses to deactivate a committee
        */
        ManageCommitteesController.prototype.startEditCommittee = function (committee) {
            this.editCommittee = committee;
        };
        /**
        * Called when the user chooses to deactivate a committee
        */
        ManageCommitteesController.prototype.showCreateModal = function () {
            this.editCommittee = new Committee();
            this.editCommittee.committeeType = "Ongoing";
        };
        /**
        * Called when the user chooses to deactivate a committee
        */
        ManageCommitteesController.prototype.toggleCommitteeActive = function (committee) {
            var _this = this;
            this.isLoading = true;
            var putUri = (committee.deactivationDateUtc ? "/api/Committee/Reactivate/" : "/api/Committee/Deactivate/") + committee.committeeId;
            this.$http.put(putUri, null).then(function (committees) {
                _this.isLoading = false;
                _this.retrieveCommittees();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve the modify committee: " + response.data.exceptionMessage);
            });
        };
        /**
        * Retrieve the list of available committees
        */
        ManageCommitteesController.prototype.retrieveCommittees = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Committee?includeInactive=true").then(function (response) {
                var committees = response.data;
                _this.isLoading = false;
                _this.activeCommittees = _.filter(committees, function (c) { return !c.deactivationDateUtc; });
                _this.inactiveCommittees = _.filter(committees, function (c) { return !!c.deactivationDateUtc; });
                _this.activeCommittees = _.sortBy(_this.activeCommittees, function (c) { return c.name.toLowerCase(); });
                _this.inactiveCommittees = _.sortBy(_this.inactiveCommittees, function (c) { return c.name.toLowerCase(); });
                // Convert the last login timestamps to local time
                //_.forEach( committees, c => c.creationDateUtc = moment.utc( c.creationDateUtc ).toDate() );
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve the committee listing: " + response.data.exceptionMessage);
            });
        };
        /**
        * Create a new committee
        */
        ManageCommitteesController.prototype.saveCommittee = function () {
            var _this = this;
            if (HtmlUtil.isNullOrWhitespace(this.editCommittee.name)) {
                alert("Please enter a name for the new committee.");
                return;
            }
            if (!this.editCommittee.committeeType) {
                alert("Please select a type for the new committee.");
                return;
            }
            this.isLoading = true;
            var saveUri = "/api/Committee" + (this.editCommittee.committeeId ? ("/" + this.editCommittee.committeeId.toString()) : "") + "?name=" + encodeURIComponent(this.editCommittee.name) + "&type=" + encodeURIComponent(this.editCommittee.committeeType) + "&isPrivate=" + this.editCommittee.isPrivate.toString();
            var httpFunc = this.editCommittee.committeeId ? this.$http.put : this.$http.post;
            httpFunc(saveUri, null).then(function () {
                _this.isLoading = false;
                _this.editCommittee = null;
                _this.retrieveCommittees();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save the committee: " + response.data.exceptionMessage);
            });
        };
        ManageCommitteesController.$inject = ["$http", "SiteInfo", "$cacheFactory"];
        return ManageCommitteesController;
    }());
    Ally.ManageCommitteesController = ManageCommitteesController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageCommittees", {
    templateUrl: "/ngApp/chtn/manager/manage-committees.html",
    controller: Ally.ManageCommitteesController
});

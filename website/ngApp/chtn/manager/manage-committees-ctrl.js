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
            this.committees = [];
            this.newCommittee = new Committee();
            this.isLoading = false;
            this.newCommittee.committeeType = "Ongoing";
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
        ManageCommitteesController.prototype.toggleCommitteeActive = function (committee) {
            this.isLoading = true;
            var putUri = (committee.deactivationDateUtc ? "/api/Committee/Reactivate/" : "/api/Committee/Deactivate/") + committee.committeeId;
            var innerThis = this;
            this.$http.put(putUri, null).success(function (committees) {
                innerThis.isLoading = false;
                innerThis.retrieveCommittees();
            }).error(function (exc) {
                innerThis.isLoading = false;
                alert("Failed to retrieve the modify committee: " + exc.exceptionMessage);
            });
        };
        /**
        * Retrieve the list of available committees
        */
        ManageCommitteesController.prototype.retrieveCommittees = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Committee").success(function (committees) {
                innerThis.isLoading = false;
                innerThis.committees = committees;
                // Convert the last login timestamps to local time
                _.forEach(committees, function (c) { return c.creationDateUtc = moment.utc(c.creationDateUtc).toDate(); });
            }).error(function (exc) {
                innerThis.isLoading = false;
                alert("Failed to retrieve the committee listing");
            });
        };
        /**
        * Create a new committee
        */
        ManageCommitteesController.prototype.createCommittee = function () {
            var _this = this;
            if (HtmlUtil.isNullOrWhitespace(this.newCommittee.name)) {
                alert("Please enter a name.");
                return;
            }
            this.isLoading = true;
            var postUri = "/api/Committee?name=" + encodeURIComponent(this.newCommittee.name) + "&type=" + encodeURIComponent(this.newCommittee.committeeType) + "&isPrivate=" + this.newCommittee.isPrivate.toString();
            this.$http.post(postUri, null).success(function () {
                _this.isLoading = false;
                _this.newCommittee = new Committee();
                _this.retrieveCommittees();
            }).error(function (error) {
                _this.isLoading = false;
                alert("Failed to create the committee: " + error.exceptionMessage);
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

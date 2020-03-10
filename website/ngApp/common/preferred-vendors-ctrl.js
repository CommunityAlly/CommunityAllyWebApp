/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Scripts/typings/moment/moment.d.ts" />
/// <reference path="../Services/html-util.ts" />
/// <reference path="../Common/map-util.ts" />
var Ally;
(function (Ally) {
    var PreferredVendor = /** @class */ (function () {
        function PreferredVendor() {
            this.fullAddress = new Ally.FullAddress();
        }
        return PreferredVendor;
    }());
    Ally.PreferredVendor = PreferredVendor;
    /**
     * The controller for the vendors page
     */
    var PreferredVendorsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PreferredVendorsController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.allVendors = [];
            this.filteredVendors = [];
            this.editVendor = new PreferredVendor();
            this.isLoading = false;
            this.isSiteManager = false;
            this.usedServiceTags = [];
            this.filterTags = [];
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        PreferredVendorsController.prototype.$onInit = function () {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.retrieveVendors();
        };
        /**
         * Populate the vendors
         */
        PreferredVendorsController.prototype.retrieveVendors = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/PreferredVendors").success(function (vendors) {
                innerThis.isLoading = false;
                innerThis.allVendors = vendors;
                innerThis.filteredVendors = vendors;
                // Process the tags into an array for the ng-tag-input control, build the list of
                // all used tags, and convert the add dates to local time
                innerThis.usedServiceTags = [];
                _.each(innerThis.allVendors, function (v) {
                    v.servicesTagArray = [];
                    _.each(v.servicesProvidedSplit, function (ss) { return v.servicesTagArray.push({ text: ss }); });
                    innerThis.usedServiceTags = innerThis.usedServiceTags.concat(v.servicesProvidedSplit);
                    // Convert the added timestamps to local time
                    v.addedDateUtc = moment.utc(v.addedDateUtc).toDate();
                });
                // Remove any duplicate tags
                innerThis.usedServiceTags = _.uniq(innerThis.usedServiceTags);
                innerThis.usedServiceTags.sort();
            });
        };
        /**
         * Export the vendor list as a CSV
         */
        PreferredVendorsController.prototype.exportVendorCsv = function () {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportResidentCsv');
            var innerThis = this;
            var csvColumns = [
                {
                    headerText: "Company Name",
                    fieldName: "companyName"
                },
                {
                    headerText: "Company Phone",
                    fieldName: "companyPhone"
                },
                {
                    headerText: "Company Website",
                    fieldName: "companyWeb"
                },
                {
                    headerText: "Address",
                    fieldName: "fullAddress",
                    dataMapper: function (value) {
                        return !value ? "" : value.oneLiner;
                    }
                },
                {
                    headerText: "Contact Name",
                    fieldName: "contactName"
                },
                {
                    headerText: "Contact Phone",
                    fieldName: "contactPhone"
                },
                {
                    headerText: "Contact Email",
                    fieldName: "contactEmail"
                },
                {
                    headerText: "Services",
                    fieldName: "servicesProvided",
                    dataMapper: function (servicesProvided) {
                        if (HtmlUtil.isNullOrWhitespace(servicesProvided))
                            return servicesProvided;
                        // Trim leading and trailing pipes
                        if (HtmlUtil.startsWith(servicesProvided, "|"))
                            servicesProvided = servicesProvided.substr(1);
                        if (HtmlUtil.endsWith(servicesProvided, "|"))
                            servicesProvided = servicesProvided.substr(0, servicesProvided.length - 1);
                        return servicesProvided;
                    }
                },
                {
                    headerText: "Notes",
                    fieldName: "notes"
                }
            ];
            var csvDataString = Ally.createCsvString(this.allVendors, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Vendors.csv");
        };
        PreferredVendorsController.prototype.onTagFilterToggle = function (tagName) {
            // Add if the tag to our filter list if it's not there, remove it if it is
            var tagCurrentIndex = this.filterTags.indexOf(tagName);
            if (tagCurrentIndex === -1)
                this.filterTags.push(tagName);
            else
                this.filterTags.splice(tagCurrentIndex, 1);
            if (this.filterTags.length === 0)
                this.filteredVendors = this.allVendors;
            else {
                this.filteredVendors = [];
                // Grab any vendors that have one of the tags by which we're filtering
                var innerThis = this;
                _.each(this.allVendors, function (v) {
                    if (_.intersection(v.servicesProvidedSplit, innerThis.filterTags).length > 0)
                        innerThis.filteredVendors.push(v);
                });
            }
        };
        PreferredVendorsController.prototype.onAddedNewVendor = function () {
            this.retrieveVendors();
        };
        PreferredVendorsController.$inject = ["$http", "SiteInfo"];
        return PreferredVendorsController;
    }());
    Ally.PreferredVendorsController = PreferredVendorsController;
})(Ally || (Ally = {}));
CA.angularApp.component("preferredVendors", {
    templateUrl: "/ngApp/common/preferred-vendors.html",
    controller: Ally.PreferredVendorsController
});

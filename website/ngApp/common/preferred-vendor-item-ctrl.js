/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
/// <reference path="../Common/map-util.ts" />
/// <reference path="preferred-vendors-ctrl.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for an individual vendor entry
     */
    var PreferredVendorItemController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PreferredVendorItemController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.isSiteManager = false;
            this.isInEditMode = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        PreferredVendorItemController.prototype.$onInit = function () {
            var _this = this;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.isAddForm = this.vendorItem == null;
            if (this.isAddForm) {
                this.isInEditMode = true;
                this.vendorItem = new Ally.PreferredVendor();
                this.editVendorItem = new Ally.PreferredVendor();
                // Wait until the page renders then hook up the autocomplete
                window.setTimeout(function () { return _this.hookupAddressAutocomplete(); }, 500);
            }
        };
        /**
         * Attach the Google Places auto-complete logic to the address text box
         */
        PreferredVendorItemController.prototype.hookupAddressAutocomplete = function () {
            var _this = this;
            // Also mask phone numbers
            if (this.siteInfo.privateSiteInfo.country === "US" || this.siteInfo.privateSiteInfo.country === "CA") {
                var phoneFields = $(".mask-phone");
                phoneFields.mask("(999) 999-9999? x999", { autoclear: false });
            }
            // If we know our group's position, let's tighten the auto-complete suggestion radius
            var autocompleteOptions = undefined;
            if (this.siteInfo.privateSiteInfo.googleGpsPosition) {
                var TwentyFiveMilesInMeters = 40234;
                var circle = new google.maps.Circle({
                    center: this.siteInfo.privateSiteInfo.googleGpsPosition,
                    radius: TwentyFiveMilesInMeters
                });
                autocompleteOptions = {
                    bounds: circle.getBounds()
                };
            }
            var addressInput = document.getElementById("vendor-" + (this.vendorItem.preferredVendorId || "") + "-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            google.maps.event.addListener(this.addressAutocomplete, "place_changed", function () {
                var place = _this.addressAutocomplete.getPlace();
                if (!_this.editVendorItem.fullAddress)
                    _this.editVendorItem.fullAddress = new Ally.FullAddress();
                _this.editVendorItem.fullAddress.oneLiner = place.formatted_address;
            });
        };
        /**
         * Called when the user clicks the button to save the new/edit vendor data
         */
        PreferredVendorItemController.prototype.onSaveVendor = function () {
            var _this = this;
            if (HtmlUtil.isNullOrWhitespace(this.editVendorItem.companyName)) {
                alert("Please enter a company name");
                return;
            }
            if (!this.editVendorItem.servicesTagArray || this.editVendorItem.servicesTagArray.length === 0) {
                alert("Please enter at least one service provided");
                return;
            }
            // Ensure the website starts properly
            if (!HtmlUtil.isNullOrWhitespace(this.editVendorItem.companyWeb)) {
                if (this.editVendorItem.companyWeb.indexOf("http") !== 0)
                    this.editVendorItem.companyWeb = "http://" + this.editVendorItem.companyWeb;
            }
            var saveMethod = this.editVendorItem.preferredVendorId == null ? this.$http.post : this.$http.put;
            this.isLoading = true;
            // Process ng-tag-input model into a pipe-separated string for the server
            var servicesProvidedString = "";
            _.each(this.editVendorItem.servicesTagArray, function (tag) {
                servicesProvidedString += "|" + tag.text;
            });
            servicesProvidedString += "|";
            this.editVendorItem.servicesProvided = servicesProvidedString;
            saveMethod("/api/PreferredVendors", this.editVendorItem).then(function () {
                _this.isLoading = false;
                if (_this.isAddForm) {
                    _this.editVendorItem = new Ally.PreferredVendor();
                    if (_this.onAddNewVendor)
                        _this.onAddNewVendor();
                }
                else
                    _this.isInEditMode = false;
                if (_this.onParentDataNeedsRefresh)
                    _this.onParentDataNeedsRefresh();
            }, function (exception) {
                _this.isLoading = false;
                alert("Failed to save the vendor information: " + exception.exceptionMessage);
            });
        };
        PreferredVendorItemController.prototype.onCancelEdit = function () {
            this.isInEditMode = false;
        };
        PreferredVendorItemController.prototype.onEditItem = function () {
            var _this = this;
            // Deep clone the vendor item
            this.editVendorItem = JSON.parse(JSON.stringify(this.vendorItem));
            this.isInEditMode = true;
            window.setTimeout(function () { return _this.hookupAddressAutocomplete(); }, 500);
        };
        PreferredVendorItemController.prototype.deleteItem = function () {
            var _this = this;
            if (!confirm("Are you sure you want to remove this vendor?"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/PreferredVendors/" + this.vendorItem.preferredVendorId).then(function () {
                _this.isLoading = false;
                if (_this.onParentDataNeedsRefresh)
                    _this.onParentDataNeedsRefresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete the vendor: " + response.data.exceptionMessage);
            });
        };
        PreferredVendorItemController.prototype.getServiceAutocomplete = function (enteredText) {
            return _.where(PreferredVendorItemController.AutocompleteServiceOptions, function (option) { return option.text.toLowerCase().indexOf(enteredText.toLowerCase()) !== -1; });
        };
        PreferredVendorItemController.$inject = ["$http", "SiteInfo"];
        PreferredVendorItemController.AutocompleteServiceOptions = [{ text: "Additions & Remodels" },
            { text: "Appliances" },
            { text: "Cabinets & Countertops" },
            { text: "Cleaning" },
            { text: "Concrete & Masonry" },
            { text: "Deck, Porch, & Gazebo" },
            { text: "Drywall & Insulation" },
            { text: "Electrical" },
            { text: "Fencing" },
            { text: "Flooring" },
            { text: "Garages" },
            { text: "Gutters" },
            { text: "Handy Man" },
            { text: "HVAC" },
            { text: "Landscaping, Lawn Care & Sprinklers" },
            { text: "Painting & Staining" },
            { text: "Pest Control" },
            { text: "Plumbing" },
            { text: "Remodeling" },
            { text: "Roofing" },
            { text: "Siding" },
            { text: "Snow Removal" },
            { text: "Solar Electric, Heating & Cooling" },
            { text: "Swimming Pools" },
            { text: "Windows & Doors" }];
        return PreferredVendorItemController;
    }());
    Ally.PreferredVendorItemController = PreferredVendorItemController;
})(Ally || (Ally = {}));
CA.angularApp.component("preferredVendorItem", {
    bindings: {
        vendorItem: "=?",
        onParentDataNeedsRefresh: "&?",
        onAddNewVendor: "&?"
    },
    templateUrl: "/ngApp/common/preferred-vendor-item.html",
    controller: Ally.PreferredVendorItemController
});

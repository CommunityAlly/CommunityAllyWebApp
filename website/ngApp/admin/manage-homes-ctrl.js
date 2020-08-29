var Ally;
(function (Ally) {
    /**
     * The controller for the admin-only page to manage group homes/units
     */
    var ManageHomesController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManageHomesController($http, siteInfo, uiGridConstants) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.uiGridConstants = uiGridConstants;
            this.isLoading = false;
            this.unitToEdit = new Ally.Unit();
            this.isEdit = false;
            this.isHoaAlly = false;
            this.isCondoAlly = false;
            this.HomesPageSize = 25;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageHomesController.prototype.$onInit = function () {
            this.isAdmin = this.siteInfo.userInfo.isAdmin;
            this.homeName = AppConfig.homeName || "Unit";
            this.isCondoAlly = AppConfig.appShortName === "condo";
            this.homesGridOptions =
                {
                    columnDefs: [
                        { field: 'name', displayName: 'Name', width: 190, type: 'date', cellFilter: "date:'short'" },
                        { field: 'percentageInterest', displayName: '%Interest', width: 105 },
                        { field: 'unitId', displayName: 'Unit ID', width: 90, type: 'number', visible: this.isAdmin },
                        { field: 'addressId', displayName: 'Addr ID', width: 90, type: 'number', visible: this.isAdmin },
                        { field: 'fullAddress.oneLiner', displayName: 'Street Address', width: '*', enableFiltering: true },
                        { field: 'notes', displayName: 'Notes', width: 180, enableFiltering: true },
                        { field: 'unitId', displayName: '', width: 135, enableFiltering: false, cellTemplate: '<div class="ui-grid-cell-contents note-text"><span class="text-link" data-ng-click="grid.appScope.$ctrl.onEditUnitClick( row.entity )">Edit</span> - <span class="text-link" data-ng-click="grid.appScope.$ctrl.onDeleteUnitClick( row.entity )">Delete</span> - <span class="text-link" data-ng-if="grid.appScope.$ctrl.isAdmin" data-ng-click="grid.appScope.$ctrl.onRefreshUnitFromGoogle( row.entity )">Goog</span></div>' }
                    ],
                    enableSorting: true,
                    enableFiltering: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: true,
                    paginationPageSize: this.HomesPageSize,
                    paginationPageSizes: [this.HomesPageSize],
                    enableRowHeaderSelection: false,
                    onRegisterApi: function (gridApi) { return HtmlUtil.uiGridFixScroll(); } // Fix the dumb scrolling bug
                };
            this.refresh();
        };
        /**
         * Populate the page
         */
        ManageHomesController.prototype.refresh = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Unit?includeAddressData=true").then(function (response) {
                _this.isLoading = false;
                _this.units = response.data;
                _this.homesGridOptions.data = _this.units;
                _this.homesGridOptions.enablePaginationControls = _this.units.length > _this.HomesPageSize;
                _this.homesGridOptions.minRowsToShow = Math.min(_this.units.length, _this.HomesPageSize);
                _this.homesGridOptions.virtualizationThreshold = _this.homesGridOptions.minRowsToShow;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to load homes: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to create a new unit
         */
        ManageHomesController.prototype.onCreateUnitClick = function () {
            var _this = this;
            $("#AddUnitForm").validate();
            if (!$("#AddUnitForm").valid())
                return;
            this.isLoading = true;
            var onSave = function () {
                _this.isLoading = false;
                _this.isEdit = false;
                _this.unitToEdit = new Ally.Unit();
                _this.refresh();
            };
            var onError = function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            };
            if (this.isEdit)
                this.$http.put("/api/Unit", this.unitToEdit).then(onSave, onError);
            else
                this.$http.post("/api/Unit/AddSingle", this.unitToEdit).then(onSave, onError);
        };
        /**
         * Occurs when the user presses the button to edit a unit
         */
        ManageHomesController.prototype.onEditUnitClick = function (unit) {
            this.isEdit = true;
            this.unitToEdit = _.clone(unit);
            if (unit.fullAddress)
                this.unitToEdit.streetAddress = unit.fullAddress.oneLiner;
            document.getElementById("unit-edit-panel").scrollIntoView();
        };
        /**
         * Occurs when the user presses the button to refresh a unit's geocoded info from Google
         */
        ManageHomesController.prototype.onRefreshUnitFromGoogle = function (unit) {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/Unit/ForceRefreshAddressFromGoogle?unitId=" + unit.unitId, null).then(function () {
                _this.isLoading = false;
                _this.refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to refresh: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to delete a unit
         */
        ManageHomesController.prototype.onDeleteUnitClick = function (unit) {
            var _this = this;
            this.isLoading = true;
            this.$http.delete("/api/Unit/" + unit.unitId).then(function () {
                _this.isLoading = false;
                _this.refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to fast add units
         */
        ManageHomesController.prototype.onFastAddUnits = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/Unit/FastAdd?fastAdd=" + this.lastFastAddName, null).then(function () {
                _this.isLoading = false;
                _this.refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed fast add: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to add units from the multi-line text box
         */
        ManageHomesController.prototype.onAddUnitsPerLine = function () {
            var _this = this;
            var postData = {
                action: "onePerLine",
                lines: this.unitNamePerLine
            };
            this.isLoading = true;
            this.$http.post("/api/Unit/Multiline", postData).then(function () {
                _this.isLoading = false;
                _this.refresh();
            }, function () {
                _this.isLoading = false;
                alert("Failed");
            });
        };
        /**
         * Occurs when the user presses the button to add homes from the address multi-line text box
         */
        ManageHomesController.prototype.onAddUnitsByAddressPerLine = function () {
            var _this = this;
            var postData = {
                action: "onePerLine",
                lines: this.unitAddressPerLine
            };
            this.isLoading = true;
            this.$http.post("/api/Unit/FromAddresses", postData).then(function () {
                _this.isLoading = false;
                _this.unitAddressPerLine = "";
                _this.refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to add: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to delete all units
         */
        ManageHomesController.prototype.onDeleteAllClick = function () {
            var _this = this;
            if (!confirm("This will delete every unit! This should only be used for new sites!"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Unit/DeleteAll?deleteAction=all").then(function () {
                _this.isLoading = false;
                _this.refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete units: " + response.data.exceptionMessage);
            });
        };
        ManageHomesController.$inject = ["$http", "SiteInfo", "uiGridConstants"];
        return ManageHomesController;
    }());
    Ally.ManageHomesController = ManageHomesController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageHomes", {
    templateUrl: "/ngApp/admin/manage-homes.html",
    controller: Ally.ManageHomesController
});

var Ally;
(function (Ally) {
    var MaintenanceProject = /** @class */ (function () {
        function MaintenanceProject() {
        }
        return MaintenanceProject;
    }());
    var TagPickerItem = /** @class */ (function () {
        function TagPickerItem() {
        }
        return TagPickerItem;
    }());
    var Equipment = /** @class */ (function () {
        function Equipment() {
        }
        return Equipment;
    }());
    var VendorListItem = /** @class */ (function () {
        function VendorListItem() {
        }
        return VendorListItem;
    }());
    Ally.VendorListItem = VendorListItem;
    var MaintenanceController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function MaintenanceController($http, $rootScope, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.isSiteManager = false;
            this.shouldShowEditProjectModal = false;
            this.shouldShowEditEquipmentModal = false;
            this.shouldShowManageEquipmentModal = false;
            this.equipmentTypeOptions = _.map(MaintenanceController.AutocompleteEquipmentTypeOptions, function (o) { return o.text; });
            this.equipmentLocationOptions = _.map(MaintenanceController.AutocompleteLocationOptions, function (o) { return o.text; });
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        MaintenanceController.prototype.$onInit = function () {
            var _this = this;
            this.equipmentGridOptions =
                {
                    data: [],
                    columnDefs: [
                        {
                            field: 'name',
                            displayName: 'Name',
                            cellTemplate: '<div class="ui-grid-cell-contents"><span class="text-link" data-ng-click="grid.appScope.$ctrl.editEquipment( row.entity )">{{ row.entity.name }}</span></div>'
                        },
                        { field: 'type', displayName: 'Type', width: 150 },
                        { field: 'installDate', displayName: "Installed", width: 90, cellFilter: "date:'shortDate'", type: "date" },
                        { field: 'initialCost', displayName: 'Cost', width: 90, cellFilter: "currency", type: "number" },
                        { field: 'addedDateUtc', displayName: 'Added', width: 90, cellFilter: "date:'shortDate'", type: "date" }
                    ],
                    multiSelect: false,
                    enableSorting: true,
                    enableHorizontalScrollbar: 0,
                    enableVerticalScrollbar: 1,
                    enableFullRowSelection: false,
                    enableColumnMenus: false,
                    enableRowHeaderSelection: false,
                    onRegisterApi: function (gridApi) {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.loadEquipment().then(function () { return _this.loadVendors(); }).then(function () { return _this.loadProjects(); });
        };
        /**
        * Retrieve the equipment available for this group
        */
        MaintenanceController.prototype.loadEquipment = function () {
            var _this = this;
            this.isLoading = true;
            return this.$http.get("/api/Maintenance/Equipment").then(function (response) {
                _this.isLoading = false;
                _this.equipmentOptions = response.data;
                // Deep clone the data so we can modify the data
                _this.equipmentGridOptions.data = JSON.parse(JSON.stringify(_this.equipmentOptions));
                var addNewOption = new Equipment();
                addNewOption.name = "Add New...";
                addNewOption.equipmentId = MaintenanceController.EquipmentId_AddNew;
                _this.equipmentOptions.push(addNewOption);
                _.forEach(_this.equipmentOptions, function (e) {
                    e.typeTags = [{ text: e.type }];
                    e.locationTags = [{ text: e.location }];
                });
                // If this model displayed from the edit project modal
                if (_this.editingProject
                    && _this.editingProject.equipmentId === MaintenanceController.EquipmentId_AddNew
                    && _this.equipmentOptions.length > 0) {
                    _this.editingProject.equipmentId = _.max(_this.equipmentOptions, function (e) { return e.equipmentId; }).equipmentId;
                }
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve equipment: " + response.data.exceptionMessage);
            });
        };
        /**
        * Retrieve the equipment available for this group
        */
        MaintenanceController.prototype.loadVendors = function () {
            var _this = this;
            this.isLoading = true;
            return this.$http.get("/api/PreferredVendors/ListItems").then(function (response) {
                _this.isLoading = false;
                _this.vendorOptions = response.data;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve vendors: " + response.data.exceptionMessage);
            });
        };
        /**
        * Occurs when the user selects an equipment from the project modal
        */
        MaintenanceController.prototype.onEquipmentSelectionChange = function () {
            if (this.editingProject.equipmentId === MaintenanceController.EquipmentId_AddNew)
                this.openAddNewEquipment();
        };
        /**
        * Retrieve the maintenance projects from the server
        */
        MaintenanceController.prototype.loadProjects = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Maintenance/Projects").then(function (response) {
                _this.isLoading = false;
                _this.projects = response.data;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve projects: " + response.data.exceptionMessage);
            });
        };
        /**
         * An event handler invoked when the user selects a project start date
         */
        MaintenanceController.prototype.onProjectStartDateChange = function () {
            if (!this.editingProject.endDate)
                this.editingProject.endDate = this.editingProject.startDate;
        };
        /**
         * Display the modal to create a new project
         */
        MaintenanceController.prototype.openAddNewProject = function () {
            this.shouldShowEditProjectModal = true;
            this.editingProject = new MaintenanceProject();
            setTimeout(function () { return $("#project-title-text-box").focus(); }, 100);
        };
        /**
         * Display the modal to add a new piece of equipment
         */
        MaintenanceController.prototype.openAddNewEquipment = function () {
            this.shouldShowEditEquipmentModal = true;
            this.editingEquipment = new Equipment();
            setTimeout(function () { return $("#equipment-name-text-box").focus(); }, 100);
        };
        /**
         * Save a project
         */
        MaintenanceController.prototype.saveProject = function () {
            var _this = this;
            this.isLoading = true;
            var httpFunc;
            if (this.editingProject.maintenanceProjectId)
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;
            httpFunc("/api/Maintenance/Project", this.editingProject).then(function () {
                _this.isLoading = false;
                _this.shouldShowEditProjectModal = false;
                _this.loadProjects();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        };
        /**
         * Save equipment information
         */
        MaintenanceController.prototype.saveEquipment = function () {
            var _this = this;
            this.isLoading = true;
            // Convert the tags to strings
            if (this.editingEquipment.typeTags && this.editingEquipment.typeTags.length > 0)
                this.editingEquipment.type = this.editingEquipment.typeTags[0].text;
            else
                this.editingEquipment.type = undefined;
            if (this.editingEquipment.locationTags && this.editingEquipment.locationTags.length > 0)
                this.editingEquipment.location = this.editingEquipment.locationTags[0].text;
            else
                this.editingEquipment.location = undefined;
            var httpFunc;
            if (this.editingEquipment.equipmentId)
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;
            httpFunc("/api/Maintenance/Equipment", this.editingEquipment).then(function () {
                _this.isLoading = false;
                _this.shouldShowEditEquipmentModal = false;
                _this.loadEquipment();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        };
        MaintenanceController.prototype.getEquipmentLocationAutocomplete = function (enteredText) {
            if (HtmlUtil.isNullOrWhitespace(enteredText))
                return MaintenanceController.AutocompleteLocationOptions;
            return _.where(MaintenanceController.AutocompleteLocationOptions, function (option) { return option.text.toLowerCase().indexOf(enteredText.toLowerCase()) !== -1; });
        };
        /**
         * Get the auto-complete options based on when the user has already typed
         */
        MaintenanceController.prototype.getEquipmentTypeAutocomplete = function (enteredText) {
            if (this.editingEquipment.typeTags && this.editingEquipment.typeTags.length > 0 && !HtmlUtil.isNullOrWhitespace(this.editingEquipment.typeTags[0].text))
                return [];
            if (HtmlUtil.isNullOrWhitespace(enteredText))
                return MaintenanceController.AutocompleteEquipmentTypeOptions;
            return _.where(MaintenanceController.AutocompleteEquipmentTypeOptions, function (option) { return option.text.toLowerCase().indexOf(enteredText.toLowerCase()) !== -1; });
        };
        /**
         * Open the equipment edit modal for the selected project
         */
        MaintenanceController.prototype.editEquipment = function (equipment) {
            this.shouldShowEditEquipmentModal = true;
            this.editingEquipment = _.clone(equipment);
            setTimeout(function () { return $("#equipment-name-text-box").focus(); }, 100);
        };
        /**
         * Open the project edit modal for the selected project
         */
        MaintenanceController.prototype.editProject = function (project) {
            this.shouldShowEditProjectModal = true;
            this.editingProject = _.clone(project);
            setTimeout(function () { return $("#project-title-text-box").focus(); }, 100);
        };
        /**
         * Occurs when the user clicks the button to remove a project
         */
        MaintenanceController.prototype.onDeleteProject = function (project) {
            var _this = this;
            if (!confirm("Are you sure you want to delete this project? This action cannot be undone."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Maintenance/Project/" + project.maintenanceProjectId).then(function () {
                _this.isLoading = false;
                _this.loadProjects();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete: " + response.data.exceptionMessage);
            });
        };
        MaintenanceController.$inject = ["$http", "$rootScope", "SiteInfo"];
        MaintenanceController.EquipmentId_AddNew = -5;
        MaintenanceController.AutocompleteLocationOptions = [{ text: "Attic" },
            { text: "Back Yard" },
            { text: "Basement" },
            { text: "Front Yard" },
            { text: "Inside" },
            { text: "Kitchen" },
            { text: "Outside" },
            { text: "Side of Building" },
            { text: "Structural" }];
        MaintenanceController.AutocompleteEquipmentTypeOptions = [{ text: "Appliance" },
            { text: "Deck" },
            { text: "Driveway" },
            { text: "HVAC" },
            { text: "Patio" },
            { text: "Plumbing" },
            { text: "Roof" },
            { text: "Siding" },
            { text: "Structural" }];
        return MaintenanceController;
    }());
    Ally.MaintenanceController = MaintenanceController;
})(Ally || (Ally = {}));
CA.angularApp.component("maintenance", {
    bindings: {},
    templateUrl: "/ngApp/common/maintenance.html",
    controller: Ally.MaintenanceController
});

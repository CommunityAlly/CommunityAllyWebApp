var Ally;
(function (Ally) {
    var MaintenanceProject = /** @class */ (function () {
        function MaintenanceProject() {
        }
        return MaintenanceProject;
    }());
    Ally.MaintenanceProject = MaintenanceProject;
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
        function MaintenanceController($http, $rootScope, siteInfo, maintenanceService, fellowResidents) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.maintenanceService = maintenanceService;
            this.fellowResidents = fellowResidents;
            this.isSiteManager = false;
            this.shouldShowEditEquipmentModal = false;
            this.shouldShowManageEquipmentModal = false;
            this.maintenanceEntries = [];
            this.assigneeOptions = [];
            this.equipmentTypeOptions = _.map(MaintenanceController.AutocompleteEquipmentTypeOptions, function (o) { return o.text; });
            this.equipmentLocationOptions = _.map(MaintenanceController.AutocompleteLocationOptions, function (o) { return o.text; });
            this.maintenanceTodoListId = siteInfo.privateSiteInfo.maintenanceTodoListId;
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
                            cellTemplate: '<div class="ui-grid-cell-contents"><span class="text-link" data-ng-if="grid.appScope.$ctrl.isSiteManager" data-ng-click="grid.appScope.$ctrl.editEquipment( row.entity )">{{ row.entity.name }}</span><span data-ng-if="!grid.appScope.$ctrl.isSiteManager">{{ row.entity.name }}</span></div>'
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
            this.fellowResidents.getResidents().then(function (residents) { return _this.assigneeOptions = _.clone(residents); }); // Cloned so we can edit locally
            this.loadEquipment()
                .then(function () { return _this.loadVendors(); })
                .then(function () { return _this.loadProjects(); })
                .then(function () { return _this.loadMaintenanceTodos(); })
                .then(function () { return _this.rebuildMaintenanceEntries(); });
        };
        /**
        * Rebuild the arrow of projects and to-do's
        */
        MaintenanceController.prototype.rebuildMaintenanceEntries = function () {
            var _this = this;
            this.maintenanceEntries = [];
            _.forEach(this.projects, function (p) {
                var newEntry = new Ally.MaintenanceEntry();
                newEntry.project = p;
                _this.maintenanceEntries.push(newEntry);
            });
            _.forEach(this.maintenanceTodos.todoItems, function (t) {
                var newEntry = new Ally.MaintenanceEntry();
                newEntry.todo = t;
                _this.maintenanceEntries.push(newEntry);
            });
            this.maintenanceEntries = _.sortBy(this.maintenanceEntries, function (e) { return e.getCreatedDate(); }).reverse();
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
        * Occurs when the user clicks the button to delete equipment
        */
        MaintenanceController.prototype.deleteEquipment = function () {
            var _this = this;
            if (!confirm("Are you sure you want to delete this equipment? This action cannot be undone."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Maintenance/Equipment/" + this.editingEquipment.equipmentId).then(function () {
                _this.isLoading = false;
                _this.editingEquipment = null;
                _this.shouldShowEditEquipmentModal = false;
                _this.loadEquipment()
                    .then(function () { return _this.loadProjects(); })
                    .then(function () { return _this.rebuildMaintenanceEntries(); });
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete the equipment: " + response.data.exceptionMessage);
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
            return this.maintenanceService.loadProjects().then(function (projects) {
                _this.isLoading = false;
                _this.projects = projects;
            }, function (error) {
                _this.isLoading = false;
                alert("Failed to retrieve projects: " + error.exceptionMessage);
            });
        };
        /**
        * Retrieve the maintenance to-do's from the server
        */
        MaintenanceController.prototype.loadMaintenanceTodos = function () {
            var _this = this;
            this.isLoading = true;
            return this.$http.get("/api/Todo/MaintenanceList").then(function (response) {
                _this.isLoading = false;
                _this.maintenanceTodos = response.data;
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
                _this.editingProject = null;
                _this.loadProjects().then(function () { return _this.rebuildMaintenanceEntries(); });
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user changes the new entry type
         */
        MaintenanceController.prototype.onEntryTypeChange = function (type) {
            if (type === "todo") {
                this.editingTodo = new Ally.TodoItem();
                this.editingTodo.owningTodoListId = this.maintenanceTodoListId;
                this.selectedAssignee = [];
                if (this.editingProject)
                    this.editingTodo.description = this.editingProject.title;
                this.editingProject = null;
                setTimeout(function () { return $("#edit-todo-name-text-box").focus(); }, 50);
            }
            else {
                this.editingProject = new MaintenanceProject();
                if (this.editingTodo)
                    this.editingProject.title = this.editingTodo.description;
                this.editingTodo = null;
                setTimeout(function () { return $("#project-title-text-box").focus(); }, 50);
            }
        };
        /**
         * Save a todo
         */
        MaintenanceController.prototype.saveTodo = function () {
            var _this = this;
            this.isLoading = true;
            if (this.selectedAssignee && this.selectedAssignee.length > 0)
                this.editingTodo.assignedToUserId = this.selectedAssignee[0].userId;
            var httpFunc;
            if (this.editingTodo.todoItemId)
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;
            httpFunc("/api/Todo/Item", this.editingTodo).then(function () {
                _this.isLoading = false;
                _this.editingTodo = null;
                _this.selectedAssignee = [];
                _this.loadMaintenanceTodos().then(function () { return _this.rebuildMaintenanceEntries(); });
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
            //if( this.editingEquipment.typeTags && this.editingEquipment.typeTags.length > 0 )
            //    this.editingEquipment.type = this.editingEquipment.typeTags[0].text;
            //else
            //    this.editingEquipment.type = undefined;
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
         * Occurs when the user clicks the button to edit a selected entry
         */
        MaintenanceController.prototype.onEditEntry = function (entry) {
            var _this = this;
            if (entry.project)
                this.editProject(entry.project);
            else {
                this.editingTodo = _.clone(entry.todo);
                // Needed for the searchable drop-down
                for (var i = 0; i < this.assigneeOptions.length; ++i)
                    (this.assigneeOptions[i]).isSelectedAssignee = false;
                //_.forEach( this.assigneeOptions, u => ( <any>u ).isSelectedAssignee = false );
                var foundAssignee = _.find(this.assigneeOptions, function (u) { return u.userId === _this.editingTodo.assignedToUserId; });
                if (foundAssignee) {
                    // Set isSelectedAssignee on a cloned object so we don't change the base list
                    foundAssignee.isSelectedAssignee = true;
                    this.selectedAssignee = [foundAssignee];
                }
                else
                    this.selectedAssignee = [];
                setTimeout(function () { return $("#edit-todo-name-text-box").focus(); }, 100);
            }
        };
        /**
         * Occurs when the user clicks the button to edit a selected entry
         */
        MaintenanceController.prototype.onDeleteEntry = function (entry) {
            var _this = this;
            if (!confirm("Are you sure you want to delete this entry? This action cannot be undone."))
                return;
            if (entry.project)
                this.onDeleteProject(entry.project);
            else {
                this.isLoading = true;
                this.$http.delete("/api/Todo/Item/" + entry.todo.todoItemId).then(function () {
                    _this.isLoading = false;
                    _this.loadMaintenanceTodos().then(function () { return _this.rebuildMaintenanceEntries(); });
                }, function (response) {
                    _this.isLoading = false;
                    alert("Failed to delete to-do: " + response.data.exceptionMessage);
                });
            }
        };
        /**
         * Open the project edit modal for the selected project
         */
        MaintenanceController.prototype.editProject = function (project) {
            this.editingProject = _.clone(project);
            setTimeout(function () { return $("#project-title-text-box").focus(); }, 100);
        };
        /**
         * Occurs when the user clicks the button to remove a project
         */
        MaintenanceController.prototype.onDeleteProject = function (project) {
            var _this = this;
            this.isLoading = true;
            this.$http.delete("/api/Maintenance/Project/" + project.maintenanceProjectId).then(function () {
                _this.isLoading = false;
                _this.loadProjects().then(function () { return _this.rebuildMaintenanceEntries(); });
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete: " + response.data.exceptionMessage);
            });
        };
        /**
         * Export the maintenance records as a CSV (Ignores to-do items for simplicity's sake)
         */
        MaintenanceController.prototype.exportMaintenanceCsv = function () {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportMaintenanceCsv');
            var csvColumns = [
                {
                    headerText: "Title",
                    fieldName: "title"
                },
                {
                    headerText: "Start Date",
                    fieldName: "startDate",
                    dataMapper: function (value) {
                        if (!value)
                            return "";
                        return moment(value).format("YYYY-MM-DD");
                    }
                },
                {
                    headerText: "End Date",
                    fieldName: "endDate",
                    dataMapper: function (value) {
                        if (!value)
                            return "";
                        return moment(value).format("YYYY-MM-DD");
                    }
                },
                {
                    headerText: "Description",
                    fieldName: "descriptionText"
                },
                {
                    headerText: "Cost",
                    fieldName: "cost"
                },
                {
                    headerText: "Vendor",
                    fieldName: "vendorCompanyName"
                },
                {
                    headerText: "Related Equipment",
                    fieldName: "equipmentName"
                },
                {
                    headerText: "Entered By",
                    fieldName: "creatorFullName"
                }
            ];
            var projects = _.map(_.filter(this.maintenanceEntries, function (e) { return !!e.project; }), function (e) { return e.project; });
            var csvDataString = Ally.createCsvString(projects, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Maintenance.csv");
        };
        MaintenanceController.$inject = ["$http", "$rootScope", "SiteInfo", "maintenance", "fellowResidents"];
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

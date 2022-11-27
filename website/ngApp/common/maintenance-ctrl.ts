namespace Ally
{
    export class MaintenanceProject
    {
        maintenanceProjectId: number;
        equipmentId: number;
        groupId: number;
        startDate: Date;
        endDate: Date;
        vendorId: number;
        cost: number;
        title: string;
        descriptionText: string;
        createDateUtc: Date;
        deletedDateUtc: Date;
        creatorUserId: string;
        status: string;
        assignedTo: string;
        
        vendorCompanyName: string;
        equipmentName: string;
        creatorFullName: string;
    }


    class TagPickerItem
    {
        text: string;
    }


    class Equipment
    {
        equipmentId: number;
        groupId: number;
        buildingId: number;
        chtnGroupHomeId: number;
        type: string;
        name: string;
        initialCost: number;
        installDate: Date;
        manufacturer: string;
        modelNumber: string;
        serialNumber: string;
        location: string;
        addedDateUtc: Date;
        deletedDateUtc: Date;
        addedByUserId: string;

        // Not from the server
        typeTags: TagPickerItem[];
        locationTags: TagPickerItem[];
    }


    export class VendorListItem
    {
        preferredVendorId: number;
        companyName: string;
    }


    export class MaintenanceController implements ng.IController
    {
        static $inject = ["$http", "$rootScope", "SiteInfo", "maintenance", "fellowResidents"];
        isLoading: boolean;
        equipmentOptions: Equipment[];
        vendorOptions: VendorListItem[];
        projects: MaintenanceProject[];
        maintenanceTodos: TodoList;
        isSiteManager: boolean = false;
        shouldShowEditEquipmentModal: boolean = false;
        shouldShowManageEquipmentModal: boolean = false;
        editingProject: MaintenanceProject;
        editingEquipment: Equipment;
        editingTodo: TodoItem;
        equipmentGridOptions: uiGrid.IGridOptionsOf<Equipment>;
        equipmentTypeOptions: string[];
        equipmentLocationOptions: string[];
        maintenanceTodoListId: number;
        maintenanceEntries: MaintenanceEntry[] = [];
        assigneeOptions: FellowChtnResident[] = [];
        selectedAssignee: FellowChtnResident[];
        entriesSortField: string;
        entriesSortAscending: boolean = true;
        static StorageKey_SortField = "maintenance_entriesSortField";
        static StorageKey_SortDir = "maintenance_entriesSortAscending";

        static EquipmentId_AddNew: number = -5;

        static AutocompleteLocationOptions = [{ text: "Attic" },
                                                { text: "Back Yard" },
                                                { text: "Basement" },
                                                { text: "Front Yard" },
                                                { text: "Garage" },
                                                { text: "Interior" },
                                                { text: "Kitchen" },
                                                { text: "Exterior" },
                                                { text: "Side of Building" },
                                                { text: "Structural" }];

        static AutocompleteEquipmentTypeOptions = [{ text: "Appliance" },
                                                    { text: "Deck" },
                                                    { text: "Driveway" },
                                                    { text: "HVAC" },
                                                    { text: "Patio" },
                                                    { text: "Plumbing" },
                                                    { text: "Roof" },
                                                    { text: "Siding" },
                                                    { text: "Structural" }];
        
        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private $rootScope: ng.IRootScopeService, private siteInfo: SiteInfoService, private maintenanceService: MaintenanceService, private fellowResidents: FellowResidentsService )
        {
            this.equipmentTypeOptions = _.map( MaintenanceController.AutocompleteEquipmentTypeOptions, o => o.text );
            this.equipmentLocationOptions = _.map( MaintenanceController.AutocompleteLocationOptions, o => o.text );
            this.maintenanceTodoListId = siteInfo.privateSiteInfo.maintenanceTodoListId;
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.equipmentGridOptions =
                {
                    data: [],
                    columnDefs:
                        [
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
                    onRegisterApi: function( gridApi )
                    {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };

            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;

            this.fellowResidents.getResidents().then( residents => this.assigneeOptions = _.clone( residents ) ); // Cloned so we can edit locally

            this.entriesSortField = window.localStorage[MaintenanceController.StorageKey_SortField];
            if( !this.entriesSortField )
            {
                this.entriesSortField = "entryDate";
                this.entriesSortAscending = true;
            }
            else
                this.entriesSortAscending = window.localStorage[MaintenanceController.StorageKey_SortDir] === "true";

            this.loadEquipment()
                .then( () => this.loadVendors() )
                .then( () => this.loadProjects() )
                .then( () => this.loadMaintenanceTodos() )
                .then( () => this.rebuildMaintenanceEntries() );
        }


        /**
        * Rebuild the arrow of projects and to-do's
        */
        rebuildMaintenanceEntries()
        {
            this.maintenanceEntries = [];

            _.forEach( this.projects, p =>
            {
                var newEntry = new MaintenanceEntry();
                newEntry.project = p;
                this.maintenanceEntries.push( newEntry );
            } );

            _.forEach( this.maintenanceTodos.todoItems, t =>
            {
                var newEntry = new MaintenanceEntry();
                newEntry.todo = t;
                this.maintenanceEntries.push( newEntry );
            } );

            this.sortEntries();
        }


        /**
        * Retrieve the equipment available for this group
        */
        loadEquipment()
        {
            this.isLoading = true;

            return this.$http.get( "/api/Maintenance/Equipment" ).then( ( response: ng.IHttpPromiseCallbackArg<Equipment[]> ) =>
            {
                this.isLoading = false;
                this.equipmentOptions = response.data;

                // Deep clone the data so we can modify the data
                this.equipmentGridOptions.data = JSON.parse( JSON.stringify( this.equipmentOptions ) );

                var addNewOption = new Equipment();
                addNewOption.name = "Add New...";
                addNewOption.equipmentId = MaintenanceController.EquipmentId_AddNew;
                this.equipmentOptions.push( addNewOption );

                _.forEach( this.equipmentOptions, e =>
                {
                    e.typeTags = [{ text: e.type }];
                    e.locationTags = [{ text: e.location }];
                } );

                // If this model displayed from the edit project modal
                if( this.editingProject
                    && this.editingProject.equipmentId === MaintenanceController.EquipmentId_AddNew
                    && this.equipmentOptions.length > 0 )
                {
                    this.editingProject.equipmentId = _.max( this.equipmentOptions, e => e.equipmentId ).equipmentId;
                }

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to retrieve equipment: " + response.data.exceptionMessage );
            } );
        }


        /**
        * Occurs when the user clicks the button to delete equipment
        */
        deleteEquipment()
        {
            if( !confirm( "Are you sure you want to delete this equipment? This action cannot be undone." ) )
                return;

            this.isLoading = true;

            this.$http.delete( "/api/Maintenance/Equipment/" + this.editingEquipment.equipmentId ).then( () =>
            {
                this.isLoading = false;
                this.editingEquipment = null;
                this.shouldShowEditEquipmentModal = false;

                this.loadEquipment()
                    .then( () => this.loadProjects() )
                    .then( () => this.rebuildMaintenanceEntries() );

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to delete the equipment: " + response.data.exceptionMessage );
            } );
        }


        /**
        * Retrieve the equipment available for this group
        */
        loadVendors()
        {
            this.isLoading = true;

            return this.$http.get( "/api/PreferredVendors/ListItems" ).then( ( response: ng.IHttpPromiseCallbackArg<VendorListItem[]> ) =>
            {
                this.isLoading = false;
                this.vendorOptions = response.data;

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to retrieve vendors: " + response.data.exceptionMessage );
            } );
        }


        /**
        * Occurs when the user selects an equipment from the project modal
        */
        onEquipmentSelectionChange()
        {
            if( this.editingProject.equipmentId === MaintenanceController.EquipmentId_AddNew )
                this.openAddNewEquipment();
        }


        /**
        * Retrieve the maintenance projects from the server
        */
        loadProjects()
        {
            this.isLoading = true;

            return this.maintenanceService.loadProjects().then( ( projects: MaintenanceProject[] ) =>
            {
                this.isLoading = false;
                this.projects = projects;

            }, ( error: ExceptionResult ) =>
            {
                this.isLoading = false;
                alert( "Failed to retrieve projects: " + error.exceptionMessage );
            } );
        }


        /**
        * Retrieve the maintenance to-do's from the server
        */
        loadMaintenanceTodos()
        {
            this.isLoading = true;

            return this.$http.get( "/api/Todo/MaintenanceList" ).then( ( response: ng.IHttpPromiseCallbackArg<TodoList> ) =>
            {
                this.isLoading = false;
                this.maintenanceTodos = response.data;
            } );
        }


        /**
         * An event handler invoked when the user selects a project start date
         */
        onProjectStartDateChange()
        {
            if( !this.editingProject.endDate )
                this.editingProject.endDate = this.editingProject.startDate;
        }


        /**
         * Display the modal to create a new project
         */
        openAddNewProject()
        {
            this.editingProject = new MaintenanceProject();
            setTimeout( () => $( "#project-title-text-box" ).focus(), 100 );
        }


        /**
         * Display the modal to add a new piece of equipment
         */
        openAddNewEquipment()
        {
            this.shouldShowEditEquipmentModal = true;
            this.editingEquipment = new Equipment();
            setTimeout( () => $( "#equipment-name-text-box" ).focus(), 100 );
        }


        /**
         * Save a project
         */
        saveProject()
        {
            this.isLoading = true;

            let httpFunc: any;
            if( this.editingProject.maintenanceProjectId )
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;

            httpFunc( "/api/Maintenance/Project", this.editingProject ).then( () =>
            {
                this.isLoading = false;
                this.editingProject = null;
                this.loadProjects().then( () => this.rebuildMaintenanceEntries() );

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to save: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Occurs when the user changes the new entry type
         */
        onEntryTypeChange( type: string )
        {
            if( type === "todo" )
            {
                this.editingTodo = new TodoItem();
                this.editingTodo.owningTodoListId = this.maintenanceTodoListId;
                this.selectedAssignee = [];

                if( this.editingProject )
                    this.editingTodo.description = this.editingProject.title;

                this.editingProject = null;

                setTimeout( () => $( "#edit-todo-name-text-box" ).focus(), 50 );
            }
            else
            {
                this.editingProject = new MaintenanceProject();

                if( this.editingTodo )
                    this.editingProject.title = this.editingTodo.description;

                this.editingTodo = null;

                setTimeout( () => $( "#project-title-text-box" ).focus(), 50 );
            }
        }


        /**
         * Save a todo
         */
        saveTodo()
        {
            this.isLoading = true;

            if( this.selectedAssignee && this.selectedAssignee.length > 0 )
                this.editingTodo.assignedToUserId = this.selectedAssignee[0].userId;

            let httpFunc: any;
            if( this.editingTodo.todoItemId )
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;

            httpFunc( "/api/Todo/Item", this.editingTodo ).then( () =>
            {
                this.isLoading = false;
                this.editingTodo = null;
                this.selectedAssignee = [];
                this.loadMaintenanceTodos().then( () => this.rebuildMaintenanceEntries() );

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to save: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Save equipment information
         */
        saveEquipment()
        {
            this.isLoading = true;

            // Convert the tags to strings
            //if( this.editingEquipment.typeTags && this.editingEquipment.typeTags.length > 0 )
            //    this.editingEquipment.type = this.editingEquipment.typeTags[0].text;
            //else
            //    this.editingEquipment.type = undefined;

            if( this.editingEquipment.locationTags && this.editingEquipment.locationTags.length > 0 )
                this.editingEquipment.location = this.editingEquipment.locationTags[0].text;
            else
                this.editingEquipment.location = undefined;            

            let httpFunc: any;
            if( this.editingEquipment.equipmentId )
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;

            httpFunc( "/api/Maintenance/Equipment", this.editingEquipment ).then( () =>
            {
                this.isLoading = false;
                this.shouldShowEditEquipmentModal = false;
                this.loadEquipment();
                
            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to save: " + response.data.exceptionMessage );
            } );
        }


        getEquipmentLocationAutocomplete( enteredText: string )
        {
            if( HtmlUtil.isNullOrWhitespace( enteredText ) )
                return MaintenanceController.AutocompleteLocationOptions;

            return _.where( MaintenanceController.AutocompleteLocationOptions, ( option: any ) => option.text.toLowerCase().indexOf( enteredText.toLowerCase() ) !== -1 );
        }


        /**
         * Get the auto-complete options based on when the user has already typed
         */
        getEquipmentTypeAutocomplete( enteredText: string )
        {
            if( this.editingEquipment.typeTags && this.editingEquipment.typeTags.length > 0 && !HtmlUtil.isNullOrWhitespace( this.editingEquipment.typeTags[0].text ) )
                return [];

            if( HtmlUtil.isNullOrWhitespace( enteredText ) )
                return MaintenanceController.AutocompleteEquipmentTypeOptions;

            return _.where( MaintenanceController.AutocompleteEquipmentTypeOptions, ( option: any ) => option.text.toLowerCase().indexOf( enteredText.toLowerCase() ) !== -1 );
        }


        /**
         * Open the equipment edit modal for the selected project
         */
        editEquipment( equipment:Equipment )
        {
            this.shouldShowEditEquipmentModal = true;
            this.editingEquipment = _.clone( equipment );
            setTimeout( () => $( "#equipment-name-text-box" ).focus(), 100 );
        }


        /**
         * Occurs when the user clicks the button to edit a selected entry
         */
        onEditEntry( entry: MaintenanceEntry )
        {
            if( entry.project )
                this.editProject( entry.project );
            else
            {
                this.editingTodo = _.clone( entry.todo );

                // Needed for the searchable drop-down
                for( let i = 0; i < this.assigneeOptions.length; ++i )
                    (<any>(this.assigneeOptions[i])).isSelectedAssignee = false;
                //_.forEach( this.assigneeOptions, u => ( <any>u ).isSelectedAssignee = false );
                var foundAssignee = _.find( this.assigneeOptions, u => u.userId === this.editingTodo.assignedToUserId );
                if( foundAssignee )
                {
                    // Set isSelectedAssignee on a cloned object so we don't change the base list
                    ( <any>foundAssignee ).isSelectedAssignee = true;

                    this.selectedAssignee = [foundAssignee];
                }
                else
                    this.selectedAssignee = [];

                setTimeout( () => $( "#edit-todo-name-text-box" ).focus(), 100 );
            }
        }


        /**
         * Occurs when the user clicks the button to edit a selected entry
         */
        onDeleteEntry( entry: MaintenanceEntry )
        {
            if( !confirm( "Are you sure you want to delete this entry? This action cannot be undone." ) )
                return;

            if( entry.project )
                this.onDeleteProject( entry.project );
            else
            {
                this.isLoading = true;

                this.$http.delete( "/api/Todo/Item/" + entry.todo.todoItemId ).then( () =>
                {
                    this.isLoading = false;
                    this.loadMaintenanceTodos().then( () => this.rebuildMaintenanceEntries() );

                }, (response:ng.IHttpPromiseCallbackArg<ExceptionResult>) =>
                {
                    this.isLoading = false;
                    alert( "Failed to delete to-do: " + response.data.exceptionMessage );
                } );
            }
        }


        /**
         * Open the project edit modal for the selected project
         */
        editProject( project: MaintenanceProject )
        {
            this.editingProject = _.clone( project );
            setTimeout( () => $( "#project-title-text-box" ).focus(), 100 );
        }


        /**
         * Occurs when the user clicks the button to remove a project
         */
        onDeleteProject( project: MaintenanceProject )
        {
            this.isLoading = true;

            this.$http.delete( "/api/Maintenance/Project/" + project.maintenanceProjectId ).then( () =>
            {
                this.isLoading = false;
                this.loadProjects().then( () => this.rebuildMaintenanceEntries() );

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to delete: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Export the maintenance records as a CSV (Ignores to-do items for simplicity's sake)
         */
        exportMaintenanceCsv()
        {
            if( typeof ( analytics ) !== "undefined" )
                analytics.track( 'exportMaintenanceCsv' );

            const csvColumns = [
                {
                    headerText: "Title",
                    fieldName: "title"
                },
                {
                    headerText: "Start Date",
                    fieldName: "startDate",
                    dataMapper: function( value: Date )
                    {
                        if( !value )
                            return "";
                        return moment( value ).format( "YYYY-MM-DD" );
                    }
                },
                {
                    headerText: "End Date",
                    fieldName: "endDate",
                    dataMapper: function( value: Date )
                    {
                        if( !value )
                            return "";
                        return moment( value ).format( "YYYY-MM-DD" );
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
                },
                {
                    headerText: "Status",
                    fieldName: "status"
                },
                {
                    headerText: "Assigned To",
                    fieldName: "assignedTo"
                }
            ];

            const projects = _.map( _.filter( this.maintenanceEntries, e => !!e.project ), e => e.project );
            
            const csvDataString = Ally.createCsvString( projects, csvColumns );

            HtmlUtil2.downloadCsv( csvDataString, "Maintenance.csv" );
        }


        /**
         * Sort the entries by a certain field
         */
        sortEntries()
        {
            const sortEntry = ( e: MaintenanceEntry ) =>
            {
                if( this.entriesSortField === "status" )
                    return e.project ? e.project.status : "ZZZZZ";
                else if( this.entriesSortField === "startDate" )
                    return e.project ? e.project.startDate : new Date(1001,12,30);
                else
                    return e.getCreatedDate();
            };

            //console.log( `Sort by ${this.entriesSortField}, dir ${this.entriesSortAscending}` );
            this.maintenanceEntries = _.sortBy( this.maintenanceEntries, sortEntry );

            const shouldReverse = this.entriesSortField === "status" ? this.entriesSortAscending : !this.entriesSortAscending;
            if( shouldReverse )
                this.maintenanceEntries.reverse();
        }


        /**
         * Sort the entries by a certain field
         */
        updateEntriesSort( fieldName: string )
        {
            if( !fieldName )
                fieldName = "entryDate";

            if( this.entriesSortField === fieldName )
                this.entriesSortAscending = !this.entriesSortAscending;
            else
            {
                this.entriesSortField = fieldName;
                this.entriesSortAscending = false;
            }

            window.localStorage[MaintenanceController.StorageKey_SortField] = this.entriesSortField;
            window.localStorage[MaintenanceController.StorageKey_SortDir] = this.entriesSortAscending;

            this.sortEntries();
        }
    }
}


CA.angularApp.component( "maintenance", {
    bindings: {
    },
    templateUrl: "/ngApp/common/maintenance.html",
    controller: Ally.MaintenanceController
} );
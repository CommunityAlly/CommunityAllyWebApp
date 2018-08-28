namespace Ally
{
    class MaintenanceProject
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

        vendorCompanyName: string;
        equipmentName: string;
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
        static $inject = ["$http", "$rootScope", "SiteInfo"];
        isLoading: boolean;
        equipmentOptions: Equipment[];
        vendorOptions: VendorListItem[];
        projects: MaintenanceProject[];
        isSiteManager: boolean = false;
        shouldShowEditProjectModal: boolean = false;
        shouldShowEditEquipmentModal: boolean = false;
        shouldShowManageEquipmentModal: boolean = false;
        editingProject: MaintenanceProject;
        editingEquipment: Equipment;
        equipmentGridOptions: uiGrid.IGridOptionsOf<Equipment>;
        equipmentTypeOptions: string[];
        equipmentLocationOptions: string[];

        static EquipmentId_AddNew: number = -5;

        static AutocompleteLocationOptions = [{ text: "Attic" },
                                                { text: "Back Yard" },
                                                { text: "Basement" },
                                                { text: "Front Yard" },
                                                { text: "Inside" },
                                                { text: "Kitchen" },
                                                { text: "Outside" },
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
        constructor( private $http: ng.IHttpService, private $rootScope: ng.IRootScopeService, private siteInfo: SiteInfoService )
        {
            this.equipmentTypeOptions = _.map( MaintenanceController.AutocompleteEquipmentTypeOptions, o => o.text );
            this.equipmentLocationOptions = _.map( MaintenanceController.AutocompleteLocationOptions, o => o.text );
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
                    onRegisterApi: function( gridApi )
                    {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };

            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;

            this.loadEquipment().then( () => this.loadVendors() ).then( () => this.loadProjects() );
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

            this.$http.get( "/api/Maintenance/Projects" ).then( ( response: ng.IHttpPromiseCallbackArg<MaintenanceProject[]> ) =>
            {
                this.isLoading = false;
                this.projects = response.data;

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to retrieve projects: " + response.data.exceptionMessage );
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
            this.shouldShowEditProjectModal = true;
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
                this.shouldShowEditProjectModal = false;
                this.loadProjects();

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
            if( this.editingEquipment.typeTags && this.editingEquipment.typeTags.length > 0 )
                this.editingEquipment.type = this.editingEquipment.typeTags[0].text;
            else
                this.editingEquipment.type = undefined;

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
         * Open the project edit modal for the selected project
         */
        editProject( project: MaintenanceProject )
        {
            this.shouldShowEditProjectModal = true;
            this.editingProject = _.clone( project );
            setTimeout( () => $( "#project-title-text-box" ).focus(), 100 );
        }


        /**
         * Occurs when the user clicks the button to remove a project
         */
        onDeleteProject( project: MaintenanceProject )
        {
            if( !confirm( "Are you sure you want to delete this project? This action cannot be undone." ) )
                return;

            this.isLoading = true;

            this.$http.delete( "/api/Maintenance/Project/" + project.maintenanceProjectId ).then( () =>
            {
                this.isLoading = false;
                this.loadProjects();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to delete: " + response.data.exceptionMessage );
            } );
        }
    }
}


CA.angularApp.component( "maintenance", {
    bindings: {
    },
    templateUrl: "/ngApp/common/maintenance.html",
    controller: Ally.MaintenanceController
} );
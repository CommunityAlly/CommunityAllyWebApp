/// <reference path="../../../Scripts/typings/ui-grid/ui-grid.d.ts" />


namespace Ally
{
    export class Unit
    {
        unitId: number;
        name: string;
        percentageInterest: number;
        assessment: number;
        adjustedAssessment: number;
        adjustedAssessmentReason: string;
        addressId: number;
        notes: string;
        addedByDateUtc: Date;
        addedByUserId: string;

        fullAddress: any;
        nameWithUnit: string;

        // Not from the server
        isSelectedForEditUser: boolean;
        csvTestName: string;
        streetAddress: string;
    }


    export class HomeEntry
    {
        memberHomeId: number;
        userId: string;
        unitId: number;
        isRenter: boolean;
    }


    export class HomeEntryWithName extends Ally.HomeEntry
    {
        name: string;
    }


    export class Member
    {
        userId: string;
        firstName: string;
        lastName: string;
        email: string;
        isSiteManager: boolean;
        phoneNumber: string;
        shouldSendWelcomeEmail: boolean;
        addedDateUtc: Date;
        addressId: number;
        addressOneLiner: string;
    }


    export class MemberWithBoard extends Member
    {
        boardPosition: number;
        lastLoginDateUtc: Date;
        postmarkReportedBadEmailUtc: Date;
        mailingAddressObject: FullAddress;
        alternatePhoneNumber: string;
        managerNotes: string;
    }


    /// Represents a member of a CHTN site
    export class Resident extends MemberWithBoard
    {
        units: Ally.HomeEntryWithName[];
        shouldShowAvatarInListing: boolean;

        /** Only referenced when creating a new member. Indicates if this member was created from a
         * pending user */
        pendingMemberId: number;
    }


    export class UpdateResident extends Resident
    {
        isRenter: boolean;

        // Not from the server
        fullName: string;
        unitGridLabel: string;
        showAdvancedHomePicker: boolean;
        singleUnitId: number;
    }


    class RecentEmail
    {
        senderName: string;
        recipientGroup: string;
        messageSource: string;
        subject: string;
        sendDateUtc: Date;
        numRecipients: string;
        numAttachments: string;
    }


    class ResidentCsvRow
    {
        unitName: string;
        unitId: number;
        email: string;
        firstName: string;
        lastName: string;
        phoneNumber: string;
        isRenter: boolean;
        isAdmin: boolean;
        csvTestName: string;
        mailingAddress: string;
        alternatePhone: string;
        managerNotes: string;
    }


    export class PendingMember
    {
        pendingMemberId: number;
        groupId: number;
        submitDateUtc: Date;
        ipAddress: string;
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber: string;
        streetAddress: string;
        schoolsAttended: string;
    }


    /**
     * The controller for the page to add, edit, and delete members from the site
     */
    export class ManageResidentsController implements ng.IController
    {
        static $inject = ["$http", "$rootScope", "$interval", "fellowResidents", "uiGridConstants", "SiteInfo"];
        
        isAdmin: boolean = false;
        siteLaunchedDateUtc: Date;
        bulkImportRows: ResidentCsvRow[];
        multiselectOptions: string;
        allUnits: Ally.Unit[];
        homeName: string;
        showIsRenter: boolean;
        showEmailSettings: boolean = true;
        shouldShowHomePicker: boolean = true;
        showKansasPtaExport: boolean = false;
        boardPositions: any[];
        newResident: any;
        editUser: Ally.UpdateResident;
        sentWelcomeEmail: boolean;
        allEmailsSent: boolean;
        multiselectMulti: string = "single";
        gridApi: uiGrid.IGridApiOf<Ally.UpdateResident>;
        pendingMemberGridApi: uiGrid.IGridApiOf<PendingMember>;
        isSavingUser: boolean = false;
        residentGridOptions: uiGrid.IGridOptionsOf<Ally.UpdateResident>;
        pendingMemberGridOptions: uiGrid.IGridOptionsOf<PendingMember>;
        emailHistoryGridOptions: uiGrid.IGridOptionsOf<RecentEmail>;
        editUserForm: ng.IFormController;
        isLoading: boolean = false;
        adminSetPass_Username: string;
        adminSetPass_Password: string;
        adminSetPass_ResultMessage: string;
        isLoadingSettings: boolean = false;
        residentSettings: ChtnSiteSettings;
        residentSortInfo: any;
        bulkImportCsv: string;
        hasOneAdmin: boolean;
        shouldSortUnitsNumerically: boolean = false;
        showEmailHistory: boolean = false;
        bulkParseNormalizeNameCase: boolean = false;
        memberTypeLabel: string;
        showLaunchSite: boolean = true;
        showPendingMembers: boolean = false;
        isLoadingPending: boolean = false;
        pendingMemberSignUpUrl: string;
        selectedResidentDetailsView: string = "Primary";
        showAddHomeLink: boolean = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private $rootScope: ng.IRootScopeService, private $interval: ng.IIntervalService, private fellowResidents: Ally.FellowResidentsService, private uiGridConstants: uiGrid.IUiGridConstants, private siteInfo: Ally.SiteInfoService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isAdmin = this.siteInfo.userInfo.isAdmin;
            this.siteLaunchedDateUtc = this.siteInfo.privateSiteInfo.siteLaunchedDateUtc;
            this.bulkImportRows = [new ResidentCsvRow()];
            this.multiselectOptions = "";
            this.allUnits = null;
            this.homeName = AppConfig.homeName || "Unit";
            this.showIsRenter = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            this.shouldShowHomePicker = AppConfig.appShortName !== "pta";
            this.showKansasPtaExport = AppConfig.appShortName === "pta" && this.siteInfo.privateSiteInfo.groupAddress.state === "KS";
            this.showEmailSettings = !this.siteInfo.privateSiteInfo.isEmailSendingRestricted;
            this.memberTypeLabel = AppConfig.memberTypeLabel;
            this.showLaunchSite = AppConfig.appShortName !== "pta";
            this.showPendingMembers = AppConfig.appShortName === "pta";

            // Show the add home article link if the site isn't launched and is less than 5 days old
            this.showAddHomeLink = !this.siteInfo.privateSiteInfo.siteLaunchedDateUtc && moment().isBefore( moment( this.siteInfo.privateSiteInfo.creationDate ).add( 5, "days" ) );

            if( this.showPendingMembers )
            {
                this.pendingMemberSignUpUrl = `https://${HtmlUtil.getSubdomain()}.${AppConfig.baseTld}/#!/MemberSignUp`;

                // Hook up the address copy link
                setTimeout( () =>
                {
                    var clipboard = new Clipboard( ".clipboard-button" );

                    clipboard.on( "success", function( e: any )
                    {
                        Ally.HtmlUtil2.showTooltip( e.trigger, "Copied!" );

                        e.clearSelection();
                    } );

                    clipboard.on( "error", function( e: any )
                    {
                        Ally.HtmlUtil2.showTooltip( e.trigger, "Auto-copy failed, press CTRL+C now" );
                    } );

                }, 750 );
            }

            this.boardPositions = FellowResidentsService.BoardPositionNames;

            this.newResident = {
                boardPosition: 0,
                isRenter: false
            };

            this.editUser = null;

            var LocalKey_ResidentSort = "residentSort_v2";

            var defaultSort = { field: "lastName", direction: this.uiGridConstants.ASC };
            this.residentSortInfo = defaultSort;
            if( window.localStorage )
            {
                var sortOptions = window.localStorage.getItem( LocalKey_ResidentSort );
                if( sortOptions )
                    this.residentSortInfo = JSON.parse( sortOptions );

                if( !this.residentSortInfo.field )
                    this.residentSortInfo = defaultSort;
            }

            var homeColumnWidth = AppConfig.appShortName === "hoa" ? 140 : (this.showIsRenter ? 62 : 175);

            var innerThis = this;
            this.residentGridOptions =
                {
                    data: [],
                    enableFiltering: false,
                    columnDefs:
                    [
                        { field: 'firstName', displayName: 'First Name', cellClass: "resident-cell-first", enableFiltering: true },
                        { field: 'lastName', displayName: 'Last Name', cellClass: "resident-cell-last", enableFiltering: true },
                        { field: 'email', displayName: 'E-mail', cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text class="resident-cell-email" data-ng-style="{ \'color\': row.entity.postmarkReportedBadEmailUtc ? \'#F00\' : \'auto\' }">{{ row.entity.email }}</span></div>', enableFiltering: true },
                        { field: 'phoneNumber', displayName: 'Phone Number', width: 150, cellClass: "resident-cell-phone", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ row.entity.phoneNumber | tel }}</span></div>', enableFiltering: true },
                        {
                            field: 'unitGridLabel',
                            displayName: AppConfig.appShortName === 'condo' ? 'Unit' : 'Residence',
                            cellClass: "resident-cell-unit",
                            width: homeColumnWidth,
                            visible: AppConfig.isChtnSite,
                            sortingAlgorithm: function( a: string, b: string )
                            {
                                if( innerThis.shouldSortUnitsNumerically )
                                {
                                    return parseInt( a ) - parseInt( b );
                                }

                                return a.toString().localeCompare( b.toString() );
                            },
                            enableFiltering: true
                        },
                        {
                            field: 'isRenter',
                            displayName: 'Renter',
                            width: 80,
                            cellClass: "resident-cell-is-renter",
                            visible: this.showIsRenter,
                            cellTemplate: '<div class="ui-grid-cell-contents" style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" data-ng-checked="row.entity.isRenter"></div>',
                            enableFiltering: false
                        },
                        { field: 'boardPosition', displayName: 'Board', width: 125, cellClass: "resident-cell-board", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ grid.appScope.$ctrl.getBoardPositionName(row.entity.boardPosition) }}</span></div>', enableFiltering: false },
                        { field: 'isSiteManager', displayName: 'Admin', width: 80, cellClass: "resident-cell-site-manager", cellTemplate: '<div class="ui-grid-cell-contents" style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" data-ng-checked="row.entity.isSiteManager"></div>', enableFiltering: false }
                    ],
                    multiSelect: false,
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableFullRowSelection: true,
                    enableColumnMenus: false,
                    enableRowHeaderSelection: false,
                    onRegisterApi: function( gridApi )
                    {
                        innerThis.gridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged( innerThis.$rootScope, function( row )
                        {
                            var msg = 'row selected ' + row.isSelected;
                            innerThis.setEdit( row.entity );
                        } );

                        gridApi.core.on.sortChanged( innerThis.$rootScope, function( grid, sortColumns )
                        {
                            if( !sortColumns || sortColumns.length === 0 )
                                return;

                            // Remember the sort
                            innerThis.residentSortInfo = { field: sortColumns[0].field, direction: sortColumns[0].sort.direction };
                            window.localStorage.setItem( LocalKey_ResidentSort, JSON.stringify( innerThis.residentSortInfo ) );
                        } );

                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };

            this.pendingMemberGridOptions =
                {
                    data: [],
                    columnDefs:
                        [
                            { field: 'firstName', displayName: 'First Name' },
                            { field: 'lastName', displayName: 'Last Name' },
                            { field: 'email', displayName: 'E-mail' },
                            { field: 'phoneNumber', displayName: 'Phone Number', width: 150, cellClass: "resident-cell-phone", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ row.entity.phoneNumber | tel }}</span></div>' },
                        ],
                    multiSelect: false,
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableFullRowSelection: true,
                    enableColumnMenus: false,
                    enableRowHeaderSelection: false,
                    onRegisterApi: function( gridApi )
                    {
                        innerThis.pendingMemberGridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged( innerThis.$rootScope, function( row )
                        {
                            innerThis.selectPendingMember( row.entity );
                        } );

                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };

            if( window.innerWidth < 769 )
            {
                for( var i = 2; i < this.residentGridOptions.columnDefs.length; ++i )
                    this.residentGridOptions.columnDefs[i].visible = false;
            }

            this.emailHistoryGridOptions =
                {
                    columnDefs:
                        [
                            { field: 'senderName', displayName: 'Sender', width: 150 },
                            { field: 'recipientGroup', displayName: 'Sent To', width: 100},
                            { field: 'messageSource', displayName: 'Source', width: 100 },
                            { field: 'subject', displayName: 'Subject' },
                            { field: 'sendDateUtc', displayName: 'Send Date', width: 140, type: 'date', cellFilter: "date:'short'" },
                            { field: 'numRecipients', displayName: '#Recip.', width: 70 },
                            { field: 'numAttachments', displayName: '#Attach.', width: 80 }
                        ],
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: true,
                    paginationPageSize: 20,
                    paginationPageSizes: [20],
                    enableRowHeaderSelection: false,
                    onRegisterApi: function( gridApi )
                    {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };

            this.refreshResidents()
                .then( () => this.loadSettings() )
                .then( () =>
                {
                    if( AppConfig.appShortName === "pta" )
                        this.loadPendingMembers();
                } );
        }


        getBoardPositionName( boardValue: number )
        {
            if( !boardValue )
                return "";

            var boardPosition = jQuery.grep( FellowResidentsService.BoardPositionNames, function( pos, i ) { return pos.id === boardValue; } )[0];

            if( !boardPosition )
                return "";

            return boardPosition.name;
        }


        /**
        * View a pending member's information
        */
        selectPendingMember( pendingMember: PendingMember )
        {
            this.pendingMemberGridApi.selection.clearSelectedRows();

            var newUserInfo = new UpdateResident();
            newUserInfo.firstName = pendingMember.firstName;
            newUserInfo.lastName = pendingMember.lastName;
            newUserInfo.email = pendingMember.email;
            newUserInfo.phoneNumber = pendingMember.phoneNumber;
            newUserInfo.pendingMemberId = pendingMember.pendingMemberId;
            //newUserInfo.firstName = pendingMember.schoolsAttended;
            //newUserInfo.firstName = pendingMember.streetAddress;
            newUserInfo.boardPosition = 0;
            newUserInfo.shouldSendWelcomeEmail = false;

            this.setEdit( newUserInfo );
        }


        /**
        * Edit a resident's information
        */
        setEdit( resident: UpdateResident )
        {
            this.sentWelcomeEmail = false;

            if( resident === null )
            {
                this.editUser = null;
                return;
            }

            this.selectedResidentDetailsView = "Primary";
            this.editUserForm.$setPristine();

            var copiedUser = jQuery.extend( {}, resident );
            this.editUser = copiedUser;

            // Initialize the home picker state
            this.editUser.showAdvancedHomePicker = this.allUnits ? this.allUnits.length > 20 : false;
            this.multiselectMulti = "single";

            if( typeof ( this.editUser.units ) === "object" )
            {
                if( this.editUser.units.length > 0 )
                    this.editUser.singleUnitId = this.editUser.units[0].unitId;

                if( this.editUser.units.length > 1 )
                {
                    this.editUser.showAdvancedHomePicker = true;
                    this.multiselectMulti = "multiple";
                }
            }

            // Add an empty unit option for the advanced picker in single-select mode
            if( this.allUnits && this.allUnits.length > 20 && this.multiselectMulti === "single" )
            {
                // Add an empty entry since the multi-select control doesn't allow deselection
                if( this.allUnits[0].unitId !== -5 )
                {
                    var emptyUnit = new Ally.Unit();
                    emptyUnit.name = "None Selected";
                    emptyUnit.unitId = -5;
                    this.allUnits.unshift( emptyUnit );
                }
            }

            // Set the selected units
            _.each( this.allUnits, ( allUnit ) =>
            {
                var isSelected = _.find( this.editUser.units, function( userUnit: any ) { return userUnit.unitId === allUnit.unitId; } ) !== undefined;
                allUnit.isSelectedForEditUser = isSelected;
            } );

            //this.residentGridOptions.selectAll( false );
            this.gridApi.selection.clearSelectedRows();

            setTimeout( "$( '#edit-user-first-text-box' ).focus();", 100 );
        }


        /**
         * Send a resident the welcome e-mail
         */
        onSendWelcome()
        {
            this.isSavingUser = true;

            var innerThis = this;
            this.$http.put( "/api/Residents/" + this.editUser.userId + "/SendWelcome", null ).success( function()
            {
                innerThis.isSavingUser = false;
                innerThis.sentWelcomeEmail = true;
            } ).error( function()
            {
                innerThis.isSavingUser = false;
                alert( "Failed to send the welcome e-mail, please contact support if this problem persists." );
            } );
        }


        /**
         * Populate the text that is shown for the unit column in the resident grid
         */
        populateGridUnitLabels()
        {
            // Populate the unit names for the grid
            _.each( <Ally.UpdateResident[]>this.residentGridOptions.data, function( res )
            {
                var unitLabel = _.reduce( res.units, function( memo: string, u: Ally.HomeEntryWithName )
                {
                    if( memo.length > 0 )
                        return memo + "," + u.name;
                    else
                        return u.name;
                }, "" );

                res.unitGridLabel = unitLabel;
            } );
        }


        /**
         * Populate the residents
         */
        refreshResidents()
        {
            this.isLoading = true;

            var innerThis = this;
            return this.$http.get( "/api/Residents" ).success(( residentArray: Ally.UpdateResident[] ) =>
            {
                innerThis.isLoading = false;

                innerThis.residentGridOptions.data = residentArray;
                innerThis.residentGridOptions.minRowsToShow = residentArray.length;
                innerThis.residentGridOptions.virtualizationThreshold = residentArray.length;

                innerThis.residentGridOptions.enableFiltering = residentArray.length > 15;
                innerThis.gridApi.core.notifyDataChange( this.uiGridConstants.dataChange.COLUMN );

                innerThis.hasOneAdmin = _.filter( residentArray, r => r.isSiteManager ).length === 1 && residentArray.length > 1;

                //this.gridApi.grid.notifyDataChange( uiGridConstants.dataChange.ALL );

                // If we have sort info to use
                if( innerThis.residentSortInfo )
                {
                    var sortColumn = _.find( innerThis.gridApi.grid.columns, function( col ) { return col.field === innerThis.residentSortInfo.field; } );

                    if( sortColumn )
                        innerThis.gridApi.grid.sortColumn( sortColumn, innerThis.residentSortInfo.direction, false );
                }

                // Build the full name and convert the last login to local time
                _.forEach( residentArray, function( res )
                {
                    res.fullName = res.firstName + " " + res.lastName;
                    if( typeof ( res.email ) === "string" && res.email.indexOf( "@condoally.com" ) !== -1 )
                        res.email = "";

                    // Convert the last login timestamps to local time
                    if( res.lastLoginDateUtc )
                        res.lastLoginDateUtc = moment.utc( res.lastLoginDateUtc ).toDate();
                } );

                innerThis.populateGridUnitLabels();

                if( !innerThis.allUnits && AppConfig.isChtnSite )
                {
                    innerThis.isLoading = true;

                    innerThis.$http.get( "/api/Unit" ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<Ally.Unit[]> )
                    {
                        innerThis.isLoading = false;
                        innerThis.allUnits = <Ally.Unit[]>httpResponse.data;
                        
                        innerThis.shouldSortUnitsNumerically = _.every( innerThis.allUnits, u => HtmlUtil.isNumericString( u.name ) );

                        if( innerThis.shouldSortUnitsNumerically )
                            innerThis.allUnits = _.sortBy( innerThis.allUnits, u => parseFloat( u.name ) );
                        
                        // If we have a lot of units then allow searching
                        innerThis.multiselectOptions = innerThis.allUnits.length > 20 ? "filter" : "";
                    },
                    function()
                    {
                        innerThis.isLoading = false;
                        alert( "Failed to retrieve your association's home listing, please contact support." );
                    } );
                }

            } );
        }


        /**
         * Populate the pending members grid
         */
        loadPendingMembers()
        {
            this.isLoadingPending = true;
            
            this.$http.get( "/api/Member/Pending" ).then( ( response: ng.IHttpPromiseCallbackArg<PendingMember[]> ) =>
            {
                this.isLoadingPending = false;

                this.pendingMemberGridOptions.data = response.data;
                this.pendingMemberGridOptions.minRowsToShow = response.data.length;
                this.pendingMemberGridOptions.virtualizationThreshold = response.data.length;

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoadingPending = false;
            } );
        }


        /**
         * Occurs when the user presses the button to allow multiple home selections
         */
        enableMultiHomePicker()
        {
            if( this.editUser )
                this.editUser.showAdvancedHomePicker = true;
            this.multiselectMulti = 'multiple';

            if( this.allUnits && this.allUnits.length > 0 && this.allUnits[0].unitId === null )
                this.allUnits.shift();
        }


        /**
         * Reject a pending member
         */
        rejectPendingMember()
        {
            if( !this.editUser.pendingMemberId )
                return;

            if( !confirm( "Are you sure you want to remove this pending member? This action cannot be undone." ) )
                return;

            this.isLoading = false;

            this.$http.put( "/api/Member/Pending/Deny/" + this.editUser.pendingMemberId, null ).then( () =>
            {
                this.isLoading = false;
                this.editUser = null;
                this.loadPendingMembers();

            }, (response:ng.IHttpPromiseCallbackArg<ExceptionResult>) =>
            {
                this.isLoading = false;
                alert( "Failed to reject pending member: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Occurs when the user presses the button to update a resident's information or create a new
         * resident
         */
        onSaveResident()
        {
            if( !this.editUser )
                return;

            $( "#editUserForm" ).validate();
            if( !$( "#editUserForm" ).valid() )
                return;

            // If the logged-in user is editing their own user
            if( this.editUser.userId === this.$rootScope.userInfo.userId )
            {
                // If the user is removing their ability to manage the site
                if( this.siteInfo.userInfo.isSiteManager && !this.editUser.isSiteManager )
                {
                    if( !confirm( "If you remove yourself as a site admin you won't be able to continue making changes. Are you sure you want to remove yourself as a site admin?" ) )
                        return;
                }
            }

            // Map the UI entry of units to the type expected on the server
            if( !this.editUser.showAdvancedHomePicker )
                this.editUser.units = [{ unitId: this.editUser.singleUnitId, name: null, memberHomeId: null, userId: this.editUser.userId, isRenter: null }];

            this.isSavingUser = true;

            var innerThis = this;
            var onSave = function( response: ng.IHttpPromiseCallbackArg<any> )
            {
                innerThis.isSavingUser = false;

                if( typeof ( response.data.errorMessage ) === "string" )
                {
                    alert( "Failed to add resident: " + response.data.errorMessage );
                    return;
                }

                if( innerThis.editUser.pendingMemberId )
                    innerThis.loadPendingMembers();

                innerThis.editUser = null;
                innerThis.refreshResidents();
            };

            var isAddingNew = false;

            var onError = function( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> )
            {
                innerThis.isSavingUser = false;

                var errorMessage = isAddingNew ? "Failed to add new resident" : "Failed to update resident";
                if( response && response.data && response.data.exceptionMessage )
                    errorMessage += ": " + response.data.exceptionMessage;

                alert( errorMessage );
            };

            // If we don't have a user ID then that means this is a new resident
            if( !this.editUser.userId )
            {
                isAddingNew = true;
                analytics.track( "addNewResident" );
                this.$http.post( "/api/Residents", this.editUser ).then( onSave, onError );
            }
            // Otherwise we're editing an existing resident
            else
            {
                isAddingNew = false;
                analytics.track( "editResident" );
                this.$http.put( "/api/Residents", this.editUser ).then( onSave, onError );
            }

            // Update the fellow residents page next time we're there
            this.fellowResidents.clearResidentCache();
        }


        /**
         * Occurs when the user presses the button to set a user's password
         */
        OnAdminSetPassword()
        {
            var setPass =
                {
                    userName: this.adminSetPass_Username,
                    password: this.adminSetPass_Password
                };

            var innerThis = this;
            this.$http.post( "/api/AdminHelper/SetPassword", setPass ).success( function( resultMessage: string )
            {
                innerThis.adminSetPass_ResultMessage = resultMessage;
            } ).error( function( data )
            {
                var errorMessage = data.exceptionMessage ? data.exceptionMessage : data;
                alert( "Failed to set password: " + errorMessage );
            } );
        }


        /**
         * Load the resident settings
         */
        loadSettings()
        {
            this.isLoadingSettings = true;

            var innerThis = this;
            this.$http.get( "/api/Settings" ).success( ( data: ChtnSiteSettings ) =>
            {
                innerThis.isLoadingSettings = false;
                this.residentSettings = data;

                // Update the SiteInfoService so the privateSiteInfo properties reflects changes
                this.siteInfo.privateSiteInfo.rentersCanViewDocs = this.residentSettings.rentersCanViewDocs;
                this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads = this.residentSettings.whoCanCreateDiscussionThreads;

            } ).error(( exc: any ) =>
            {
                innerThis.isLoadingSettings = false;
                console.log( "Failed to retrieve settings" );
            } );
        }


        /**
         * Export the resident list as a CSV
         */
        exportResidentCsv()
        {
            if( typeof ( analytics ) !== "undefined" )
                analytics.track( 'exportResidentCsv' );

            var innerThis = this;

            var csvColumns = [
                {
                    headerText: "First Name",
                    fieldName: "firstName"
                },
                {
                    headerText: "Last Name",
                    fieldName: "lastName"
                },
                {
                    headerText: "Phone",
                    fieldName: "phoneNumber"
                },
                {
                    headerText: "E-mail",
                    fieldName: "email"
                },
                {
                    headerText: "Unit",
                    fieldName: "unitGridLabel"
                },
                {
                    headerText: "Is Renter",
                    fieldName: "isRenter"
                },
                {
                    headerText: "Is Admin",
                    fieldName: "isSiteManager"
                },
                {
                    headerText: "Board Position",
                    fieldName: "boardPosition",
                    dataMapper: function( value: number )
                    {
                        return innerThis.getBoardPositionName( value );
                    }
                },
                {
                    headerText: "Alternate Mailing",
                    fieldName: "mailingAddressObject",
                    dataMapper: function( value: FullAddress )
                    {
                        return !value ? "" : value.oneLiner;
                    }
                },
                {
                    headerText: "Alternate Phone",
                    fieldName: "alternatePhoneNumber"
                },
                {
                    headerText: "Manager Notes",
                    fieldName: "managerNotes"
                },
                {
                    headerText: "Last Login Date",
                    fieldName: "lastLoginDateUtc",
                    dataMapper: function( value: Date )
                    {
                        if( !value )
                            return "Has not logged-in";

                        return moment( value ).format( "YYYY-MM-DD HH:mm:00" );
                    }
                }
            ];

            var csvDataString = Ally.createCsvString( <any[]>this.residentGridOptions.data, csvColumns );
            csvDataString = "data:text/csv;charset=utf-8," + csvDataString;

            var encodedUri = encodeURI( csvDataString );

            // Works, but can't set the file name
            //window.open( encodedUri );

            var csvLink = document.createElement( "a" );
            csvLink.setAttribute( "href", encodedUri );
            csvLink.setAttribute( "download", "Residents.csv" );
            document.body.appendChild( csvLink ); // Required for FF

            csvLink.click(); // This will download the data file named "my_data.csv"

            setTimeout( function() { document.body.removeChild( csvLink ); }, 500 );
        }


        /**
         * Export the member list for a PTA in Kansas as a CSV ready to be uploaded to the state
         */
        exportKansasPtaCsv()
        {
            if( !this.siteInfo.privateSiteInfo.ptaUnitId )
            {
                alert( "You must first set your PTA unit ID in Manage -> Settings before you can export in this format." );
                return;
            }

            if( typeof ( analytics ) !== "undefined" )
                analytics.track( 'exportKansasPtaCsv' );

            var innerThis = this;

            var csvColumns = [
                {
                    headerText: "Local_Unit",
                    fieldName: "Local_Unit"
                },
                {
                    headerText: "First_Name",
                    fieldName: "firstName"
                },
                {
                    headerText: "Last_Name",
                    fieldName: "lastName"
                },
                {
                    headerText: "Number_of_Members",
                    fieldName: "Number_of_Members"
                },
                {
                    headerText: "Membership_Name",
                    fieldName: "Membership_Name"
                },
                {
                    headerText: "Name_Prefix",
                    fieldName: "Name_Prefix"
                },
                {
                    headerText: "Middle_Name",
                    fieldName: "Middle_Name"
                },
                {
                    headerText: "Name_Suffix",
                    fieldName: "Name_Suffix"
                },
                {
                    headerText: "Email",
                    fieldName: "email"
                },
                {
                    headerText: "Address_1",
                    fieldName: "Address_1"
                },
                {
                    headerText: "Address_2",
                    fieldName: "Address_2"
                },
                {
                    headerText: "Address_3",
                    fieldName: "Address_3"
                },
                {
                    headerText: "City",
                    fieldName: "City"
                },
                {
                    headerText: "State",
                    fieldName: "State"
                },
                {
                    headerText: "Zip",
                    fieldName: "Zip"
                },
                {
                    headerText: "Home_Telephone",
                    fieldName: "phoneNumber"
                },
                {
                    headerText: "Work_Telephone",
                    fieldName: "Work_Telephone"
                },
                {
                    headerText: "Mobile_Number",
                    fieldName: "Mobile_Number"
                },
                {
                    headerText: "Position",
                    fieldName: "Position"
                },
                {
                    headerText: "Begin_Date",
                    fieldName: "Begin_Date"
                },
                {
                    headerText: "End_Date",
                    fieldName: "End_Date"
                },
                {
                    headerText: "Second_Name",
                    fieldName: "Second_Name"
                },
                {
                    headerText: "Second_Email",
                    fieldName: "Second_Email"
                },
                {
                    headerText: "Teacher1",
                    fieldName: "Teacher1"
                },
                {
                    headerText: "Teacher2",
                    fieldName: "Teacher2"
                },
                {
                    headerText: "Teacher3",
                    fieldName: "Teacher3"
                },
                {
                    headerText: "Children_Names",
                    fieldName: "Children_Names"
                }
            ];

            var copiedMembers = _.clone( <any[]>this.residentGridOptions.data );
            for( let member of copiedMembers )
            {
                member.Local_Unit = this.siteInfo.privateSiteInfo.ptaUnitId.toString();
                member.Membership_Name = ( !member.firstName || member.firstName === "N/A" ) ? member.lastName : member.firstName;

                if( member.boardPosition !== 0 )
                    member.Position = this.getBoardPositionName( member.boardPosition );
            }

            var csvDataString = Ally.createCsvString( <any[]>this.residentGridOptions.data, csvColumns );
            csvDataString = "data:text/csv;charset=utf-8," + csvDataString;

            var encodedUri = encodeURI( csvDataString );

            // Works, but can't set the file name
            //window.open( encodedUri );

            var csvLink = document.createElement( "a" );
            csvLink.setAttribute( "href", encodedUri );
            csvLink.setAttribute( "download", "pta-members.csv" );
            document.body.appendChild( csvLink ); // Required for FF

            csvLink.click(); // This will download the file

            setTimeout( function() { document.body.removeChild( csvLink ); }, 500 );
        }


        /**
         * Save the resident settings to the server
         */
        saveResidentSettings()
        {
            analytics.track( "editResidentSettings" );

            this.isLoadingSettings = true;

            var innerThis = this;
            this.$http.put( "/api/Settings", this.residentSettings ).success(() => 
            {
                innerThis.isLoadingSettings = false;

                // Update the fellow residents page next time we're there
                innerThis.fellowResidents.clearResidentCache();

                innerThis.siteInfo.privateSiteInfo.canHideContactInfo = innerThis.residentSettings.canHideContactInfo;
            } ).error(() =>
            {
                innerThis.isLoadingSettings = false;
                alert( "Failed to update settings, please try again or contact support." );
            } );
        }


        /**
         * Occurs when the user presses the button to delete a resident
         */
        onDeleteResident()
        {
            if( !confirm( "Are you sure you want to remove this person from your building?" ) )
                return;

            if( this.siteInfo.userInfo.userId === this.editUser.userId )
            {
                if( !confirm( "If you remove your own account you won't be able to login anymore. Are you still sure?" ) )
                    return;
            }

            this.isSavingUser = true;

            var innerThis = this;
            this.$http.delete( "/api/Residents?userId=" + this.editUser.userId ).success(() =>
            {
                innerThis.isSavingUser = false;
                innerThis.editUser = null;

                // Update the fellow residents page next time we're there
                innerThis.fellowResidents.clearResidentCache();

                innerThis.refreshResidents();
            } ).error(() =>
            {
                alert( "Failed to remove the resident. Please let support know if this continues to happen." );
                innerThis.isSavingUser = false;
                innerThis.editUser = null;
            } );
        }


        /**
         * Occurs when the user presses the button to reset everyone's password
         */
        onSendAllWelcome()
        {
            if( !confirm( "This will e-mail all of the residents in your association. Do you want to proceed?" ) )
                return;

            this.isLoading = true;

            var innerThis = this;
            this.$http.put( "/api/Residents?userId&action=launchsite", null ).success( function( data: any )
            {
                innerThis.isLoading = false;
                innerThis.sentWelcomeEmail = true;
                innerThis.allEmailsSent = true;
            } ).error( function()
            {
                innerThis.isLoading = false;
                alert( "Failed to send welcome e-mail, please contact support if this problem persists." )
            } );
        }


        /**
         * Parse the bulk resident CSV text
         */
        parseBulkCsv()
        {
            var csvParser = ( <any>$ ).csv;
            var bulkRows = csvParser.toArrays( this.bulkImportCsv );

            this.bulkImportRows = [];

            var simplifyStreetName = function( streetAddress: string )
            {
                if( !streetAddress )
                    streetAddress = "";

                var simplifiedName = streetAddress.toLowerCase();

                simplifiedName = simplifiedName.replace( /0th /g, "0 " ).replace( /1st /g, "1 " );
                simplifiedName = simplifiedName.replace( /2nd /g, "2 " ).replace( /3rd /g, "3 " );
                simplifiedName = simplifiedName.replace( /4th /g, "4 " ).replace( /5th /g, "5 " );
                simplifiedName = simplifiedName.replace( /6th /g, "6 " ).replace( /7th /g, "7 " );
                simplifiedName = simplifiedName.replace( /8th /g, "8 " ).replace( /9th /g, "9 " );

                simplifiedName = simplifiedName.replace( /\./g, "" ).replace( / /g, "" );

                simplifiedName = simplifiedName.replace( /street/g, "st" ).replace( /road/g, "rd" ).replace( /drive/g, "dr" );
                simplifiedName = simplifiedName.replace( /place/g, "pl" ).replace( /avenue/g, "ave" );

                return simplifiedName;
            };

            if( this.allUnits )
            {
                for( var i = 0; i < this.allUnits.length; ++i )
                    this.allUnits[i].csvTestName = simplifyStreetName( this.allUnits[i].name );
            }

            for( var i = 0; i < bulkRows.length; ++i )
            {
                let curRow = <string[]>bulkRows[i];

                while( curRow.length < 10 )
                    curRow.push( "" );

                // Skip the header row, if there is one
                if( curRow[0] === "unit name" && curRow[1] === "e-mail address" && curRow[2] === "first name" )
                    continue;

                // Clean up the data
                for( let j = 0; j < curRow.length; ++j )
                {
                    if( HtmlUtil.isNullOrWhitespace( curRow[j] ) )
                        curRow[j] = null;
                    else
                        curRow[j] = curRow[j].trim();
                }

                let newRow: ResidentCsvRow = {
                    unitName: curRow[0] || null,
                    unitId: <number>undefined,
                    email: curRow[1],
                    firstName: curRow[2],
                    lastName: curRow[3],
                    phoneNumber: curRow[4],
                    isRenter: !HtmlUtil.isNullOrWhitespace( curRow[5] ),
                    isAdmin: !HtmlUtil.isNullOrWhitespace( curRow[6] ),
                    csvTestName: "",
                    mailingAddress: curRow[7],
                    alternatePhone: curRow[8],
                    managerNotes: curRow[9]
                };

                if( HtmlUtil.isNullOrWhitespace( newRow.unitName ) )
                    newRow.unitId = null;
                else
                {
                    newRow.csvTestName = simplifyStreetName( newRow.unitName );

                    var unit = _.find( this.allUnits, function( u ) { return u.csvTestName === newRow.csvTestName; } );
                    if( unit )
                        newRow.unitId = unit.unitId;
                    else
                        newRow.unitId = undefined;
                }

                // If this row contains two people
                let spouseRow = null;
                if( newRow.firstName && newRow.firstName.toLowerCase().indexOf( " and " ) !== -1 )
                {
                    spouseRow = _.clone( newRow );

                    var splitFirst = newRow.firstName.split( " and " );

                    newRow.firstName = splitFirst[0];
                    spouseRow.firstName = splitFirst[1];

                    if( newRow.email && newRow.email.indexOf( " / " ) !== -1 )
                    {
                        let splitEmail = newRow.email.split( " / " );
                        newRow.email = splitEmail[0];
                        spouseRow.email = splitEmail[1];
                    }
                    else
                        spouseRow.email = "";

                    spouseRow.phoneNumber = "";
                }
                
                if( this.bulkParseNormalizeNameCase )
                {
                    let capitalizeFirst = ( str: string ) =>
                    {
                        if( !str )
                            return str;

                        if( str.length === 1 )
                            return str.toUpperCase();

                        return str.charAt( 0 ).toUpperCase() + str.substr( 1 ).toLowerCase();
                    };

                    newRow.firstName = capitalizeFirst( newRow.firstName );
                    newRow.lastName = capitalizeFirst( newRow.lastName );

                    if( spouseRow )
                    {
                        spouseRow.firstName = capitalizeFirst( spouseRow.firstName );
                        spouseRow.lastName = capitalizeFirst( spouseRow.lastName );
                    }
                }


                this.bulkImportRows.push( newRow );

                if( spouseRow )
                    this.bulkImportRows.push( spouseRow );
            }
        }


        /**
         * Submit the bulk creation rows to the server
         */
        submitBulkRows()
        {
            this.isLoading = true;

            var innerThis = this;
            this.$http.post( "/api/Residents/BulkLoad", this.bulkImportRows ).success( function()
            {
                innerThis.isLoading = false;
                innerThis.bulkImportRows = [new ResidentCsvRow()];
                innerThis.bulkImportCsv = "";
                alert( "Success" );
                innerThis.refreshResidents();

            } ).error( function()
            {
                innerThis.isLoading = false;
                alert( "Bulk upload failed" );
            } );
        }


        /**
         * Add a row to the bulk table
         */
        addBulkRow()
        {
            var newRow: ResidentCsvRow = {
                unitName: "",
                unitId: <number>null,
                email: "",
                firstName: "",
                lastName: "",
                phoneNumber: "",
                isRenter: false,
                isAdmin: false,
                csvTestName: undefined,
                mailingAddress: "",
                alternatePhone: "",
                managerNotes: ""
            };

            // Try to step to the next unit
            if( this.allUnits )
            {
                if( this.bulkImportRows.length > 0 )
                {
                    var lastUnitId = this.bulkImportRows[this.bulkImportRows.length - 1].unitId;
                    var lastUnitIndex = _.findIndex( this.allUnits, function( u ) { return u.unitId === lastUnitId; } );

                    ++lastUnitIndex;

                    if( lastUnitIndex < this.allUnits.length )
                    {
                        newRow.unitName = this.allUnits[lastUnitIndex].name;
                        newRow.unitId = this.allUnits[lastUnitIndex].unitId;
                    }
                }
            }

            this.bulkImportRows.push( newRow );
        }


        /**
         * Display the list of recent e-mails
         */
        toggleEmailHistoryVisible()
        {
            this.showEmailHistory = !this.showEmailHistory;

            if( this.showEmailHistory && !this.emailHistoryGridOptions.data )
            {
                this.isLoadingSettings = true;

                this.$http.get( "/api/Email/RecentGroupEmails" ).then( ( response: ng.IHttpPromiseCallbackArg<RecentEmail[]> ) =>
                {
                    this.isLoadingSettings = false;
                    this.emailHistoryGridOptions.data = response.data;

                }, ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoadingSettings = false;
                    alert( "Failed to load e-mails: " + response.data.exceptionMessage );
                } );
            }
        }
    }
}


CA.angularApp.component( "manageResidents", {
    templateUrl: "/ngApp/chtn/manager/manage-residents.html",
    controller: Ally.ManageResidentsController
} );
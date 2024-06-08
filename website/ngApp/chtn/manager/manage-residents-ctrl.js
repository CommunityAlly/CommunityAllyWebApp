var Ally;
(function (Ally) {
    class Unit {
    }
    Ally.Unit = Unit;
    class PayerInfo {
    }
    Ally.PayerInfo = PayerInfo;
    class UnitWithOwner extends Unit {
    }
    Ally.UnitWithOwner = UnitWithOwner;
    class UnitDisplayOwner {
    }
    Ally.UnitDisplayOwner = UnitDisplayOwner;
    class UnitWithPayment extends UnitWithOwner {
    }
    Ally.UnitWithPayment = UnitWithPayment;
    class HomeEntry {
    }
    Ally.HomeEntry = HomeEntry;
    class HomeEntryWithName extends Ally.HomeEntry {
    }
    Ally.HomeEntryWithName = HomeEntryWithName;
    class Member {
    }
    Ally.Member = Member;
    class MemberWithBoard extends Member {
    }
    Ally.MemberWithBoard = MemberWithBoard;
    /// Represents a member of a CHTN site
    class Resident extends MemberWithBoard {
    }
    Ally.Resident = Resident;
    class UpdateResident extends Resident {
    }
    Ally.UpdateResident = UpdateResident;
    class RecentEmail {
    }
    class ResidentCsvRow {
    }
    class PendingMember {
    }
    Ally.PendingMember = PendingMember;
    /**
     * The controller for the page to add, edit, and delete members from the site
     */
    class ManageResidentsController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, fellowResidents, uiGridConstants, siteInfo, appCacheService) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.fellowResidents = fellowResidents;
            this.uiGridConstants = uiGridConstants;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.isAdmin = false;
            this.showEmailSettings = true;
            this.shouldShowHomePicker = true;
            this.showKansasPtaExport = false;
            this.multiselectMulti = "single";
            this.isSavingUser = false;
            this.isLoading = false;
            this.isLoadingSettings = false;
            this.shouldSortUnitsNumerically = false;
            this.showEmailHistory = false;
            this.emailHistorySinceDate = new Date();
            this.emailHistoryNumMonths = 6;
            this.bulkParseNormalizeNameCase = false;
            this.showLaunchSite = true;
            this.showPendingMembers = false;
            this.isLoadingPending = false;
            this.selectedResidentDetailsView = "Primary";
            this.showAddHomeLink = false;
            this.hasMemberNotOwnerRenter = false;
            this.didLoadResidentGridState = false;
            this.shouldSaveResidentGridState = true;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isAdmin = this.siteInfo.userInfo.isAdmin;
            this.siteLaunchedDateUtc = this.siteInfo.privateSiteInfo.siteLaunchedDateUtc;
            this.bulkImportRows = [new ResidentCsvRow()];
            this.multiselectOptions = "";
            this.allUnits = null;
            this.homeName = AppConfig.homeName || "Unit";
            this.showIsRenter = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            this.shouldShowResidentPermissions = this.showIsRenter || AppConfig.appShortName === "block-club";
            this.shouldShowHomePicker = AppConfig.appShortName !== "pta";
            this.showKansasPtaExport = AppConfig.appShortName === "pta" && this.siteInfo.privateSiteInfo.groupAddress.state === "KS";
            this.showEmailSettings = !this.siteInfo.privateSiteInfo.isEmailSendingRestricted;
            this.memberTypeLabel = AppConfig.memberTypeLabel;
            this.showLaunchSite = AppConfig.appShortName !== "pta";
            this.showPendingMembers = AppConfig.appShortName === "pta" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "neighborhood";
            this.hasMemberNotOwnerRenter = AppConfig.appShortName === "pta" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "neighborhood";
            // Show the add home article link if the site isn't launched and is less than 8 days old
            const twoWeeksAfterCreate = moment(this.siteInfo.privateSiteInfo.creationDate).add(14, "days");
            this.showAddHomeLink = !this.siteInfo.privateSiteInfo.siteLaunchedDateUtc && moment().isBefore(twoWeeksAfterCreate);
            if (this.showPendingMembers) {
                this.pendingMemberSignUpUrl = `https://${HtmlUtil.getSubdomain()}.${AppConfig.baseTld}/#!/MemberSignUp`;
                // Hook up the address copy link
                setTimeout(() => {
                    const clipboard = new ClipboardJS(".clipboard-button");
                    clipboard.on("success", (e) => {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Copied!");
                        e.clearSelection();
                    });
                    clipboard.on("error", (e) => {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Auto-copy failed, press CTRL+C now");
                    });
                }, 750);
            }
            this.boardPositions = Ally.FellowResidentsService.BoardPositionNames;
            this.newResident = {
                boardPosition: 0,
                isRenter: false
            };
            this.editUser = null;
            const LocalKey_ResidentSort = "residentSort_v2";
            const defaultSort = { field: "lastName", direction: this.uiGridConstants.ASC };
            this.residentSortInfo = defaultSort;
            if (window.localStorage) {
                const sortOptions = window.localStorage.getItem(LocalKey_ResidentSort);
                if (sortOptions)
                    this.residentSortInfo = JSON.parse(sortOptions);
                if (!this.residentSortInfo.field)
                    this.residentSortInfo = defaultSort;
            }
            const homeColumnWidth = AppConfig.appShortName === "hoa" ? 140 : (this.showIsRenter ? 62 : 175);
            this.residentGridOptions =
                {
                    data: [],
                    enableFiltering: false,
                    columnDefs: [
                        { field: 'firstName', displayName: 'First Name', cellClass: "resident-cell-first", enableFiltering: true },
                        { field: 'lastName', displayName: 'Last Name', cellClass: "resident-cell-last", enableFiltering: true },
                        { field: 'email', displayName: 'Email', cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text class="resident-cell-email" data-ng-style="{ \'color\': row.entity.postmarkReportedBadEmailUtc ? \'#F00\' : \'auto\' }">{{ row.entity.email }}</span></div>', enableFiltering: true },
                        { field: 'phoneNumber', displayName: 'Cell Phone', width: 150, cellClass: "resident-cell-phone", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ row.entity.phoneNumber | tel }}</span></div>', enableFiltering: true },
                        {
                            field: 'unitGridLabel',
                            displayName: AppConfig.appShortName === 'condo' ? 'Unit' : 'Residence',
                            cellClass: "resident-cell-unit",
                            width: homeColumnWidth,
                            visible: AppConfig.isChtnSite,
                            sortingAlgorithm: (a, b) => {
                                if (this.shouldSortUnitsNumerically) {
                                    return parseInt(a) - parseInt(b);
                                }
                                return a.toString().localeCompare(b.toString());
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
                        { field: 'isSiteManager', displayName: 'Admin', width: 80, cellClass: "resident-cell-site-manager", cellTemplate: '<div class="ui-grid-cell-contents" style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" data-ng-checked="row.entity.isSiteManager"></div>', enableFiltering: false },
                        { field: 'lastLoginDateUtc', displayName: 'Last Login', width: 140, enableFiltering: false, visible: false, type: 'date', cellFilter: "date:'short'" },
                        { field: 'alternatePhoneNumber', displayName: 'Alt Phone', width: 140, enableFiltering: false, visible: false },
                        { field: 'addedDateUtc', displayName: 'Added Date', width: 140, enableFiltering: false, visible: false, type: 'date', cellFilter: "date:'short'" },
                        { field: 'lotNumberLabel', displayName: 'Lot#', width: 140, enableFiltering: true, visible: false },
                    ],
                    multiSelect: false,
                    enableSorting: true,
                    enableHorizontalScrollbar: window.innerWidth < 996 ? this.uiGridConstants.scrollbars.ALWAYS : this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableFullRowSelection: true,
                    enableColumnMenus: false,
                    enableGridMenu: true,
                    enableRowHeaderSelection: false,
                    onRegisterApi: (gridApi) => {
                        this.residentsGridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged(this.$rootScope, (row) => {
                            this.setEdit(row.entity);
                        });
                        gridApi.core.on.sortChanged(this.$rootScope, (grid, sortColumns) => {
                            if (!sortColumns || sortColumns.length === 0)
                                return;
                            // Remember the sort
                            this.residentSortInfo = { field: sortColumns[0].field, direction: sortColumns[0].sort.direction };
                            window.localStorage.setItem(LocalKey_ResidentSort, JSON.stringify(this.residentSortInfo));
                        });
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            // Need to cast to any because property is missing from typed file
            this.residentGridOptions.gridMenuShowHideColumns = true;
            this.pendingMemberGridOptions =
                {
                    data: [],
                    columnDefs: [
                        { field: 'firstName', displayName: 'First Name' },
                        { field: 'lastName', displayName: 'Last Name' },
                        { field: 'email', displayName: 'Email' },
                        { field: 'phoneNumber', displayName: 'Phone Number', width: 150, cellClass: "resident-cell-phone", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ row.entity.phoneNumber | tel }}</span></div>' },
                    ],
                    multiSelect: false,
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableFullRowSelection: true,
                    enableColumnMenus: false,
                    enableRowHeaderSelection: false,
                    onRegisterApi: (gridApi) => {
                        this.pendingMemberGridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged(this.$rootScope, (row) => {
                            this.selectPendingMember(row.entity);
                        });
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            if (window.innerWidth < 769) {
                for (let i = 2; i < this.residentGridOptions.columnDefs.length; ++i)
                    this.residentGridOptions.columnDefs[i].visible = false;
            }
            this.emailHistoryGridOptions =
                {
                    columnDefs: [
                        { field: 'senderName', displayName: 'Sender', width: 150 },
                        { field: 'recipientGroup', displayName: 'Sent To', width: 100 },
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
                    onRegisterApi: (gridApi) => {
                        this.emailHistoryGridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged(this.$rootScope, (row) => {
                            this.viewingRecentEmailBody = row.entity.messageBody;
                        });
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            this.refreshResidents()
                .then(() => this.loadSettings())
                .then(() => {
                if (this.appCacheService.getAndClear("goToEmailHistory") === "true") {
                    document.getElementById("toggle-email-history-link").scrollIntoView();
                    this.toggleEmailHistoryVisible();
                }
                if (this.residentsGridApi && window.localStorage[ManageResidentsController.StoreKeyResidentGridState]) {
                    const gridState = JSON.parse(window.localStorage[ManageResidentsController.StoreKeyResidentGridState]);
                    if (gridState && typeof (gridState) === "object") {
                        this.residentsGridApi.saveState.restore(this, gridState);
                        this.residentsGridApi.grid.clearAllFilters(true, true, false);
                        this.didLoadResidentGridState = true;
                    }
                }
                if (this.showPendingMembers)
                    this.loadPendingMembers();
            });
        }
        /**
         * Called on a controller when its containing scope is destroyed. Use this hook for releasing external resources,
         * watches and event handlers.
         */
        $onDestroy() {
            // Save the grid state (column order, widths, visible, etc.)
            if (this.shouldSaveResidentGridState) {
                const gridState = this.residentsGridApi.saveState.save();
                window.localStorage[ManageResidentsController.StoreKeyResidentGridState] = JSON.stringify(gridState);
            }
        }
        getBoardPositionName(boardValue) {
            if (!boardValue)
                return "";
            const boardPosition = jQuery.grep(Ally.FellowResidentsService.BoardPositionNames, (pos, i) => pos.id === boardValue)[0];
            if (!boardPosition)
                return "";
            return boardPosition.name;
        }
        /**
        * View a pending member's information
        */
        selectPendingMember(pendingMember) {
            this.pendingMemberGridApi.selection.clearSelectedRows();
            const newUserInfo = new UpdateResident();
            newUserInfo.firstName = pendingMember.firstName;
            newUserInfo.lastName = pendingMember.lastName;
            newUserInfo.email = pendingMember.email;
            newUserInfo.phoneNumber = pendingMember.phoneNumber;
            newUserInfo.pendingMemberId = pendingMember.pendingMemberId;
            //newUserInfo.firstName = pendingMember.schoolsAttended;
            //newUserInfo.firstName = pendingMember.streetAddress;
            newUserInfo.boardPosition = 0;
            newUserInfo.shouldSendWelcomeEmail = false;
            this.setEdit(newUserInfo);
        }
        closeViewingEmail() {
            this.viewingRecentEmailBody = null;
            this.emailHistoryGridApi.selection.clearSelectedRows();
        }
        /**
        * Edit a resident's information
        */
        setEdit(resident) {
            this.sentWelcomeEmail = false;
            if (resident === null) {
                this.editUser = null;
                return;
            }
            this.selectedResidentDetailsView = "Primary";
            this.editUserForm.$setPristine();
            const copiedUser = jQuery.extend({}, resident);
            this.editUser = copiedUser;
            // Initialize the home picker state
            this.editUser.showAdvancedHomePicker = this.allUnits ? this.allUnits.length > 20 : false;
            this.multiselectMulti = "single";
            if (typeof (this.editUser.units) === "object") {
                if (this.editUser.units.length > 0)
                    this.editUser.singleUnitId = this.editUser.units[0].unitId;
                if (this.editUser.units.length > 1) {
                    this.editUser.showAdvancedHomePicker = true;
                    this.multiselectMulti = "multiple";
                }
            }
            // Add an empty unit option for the advanced picker in single-select mode
            if (this.allUnits && this.allUnits.length > 20 && this.multiselectMulti === "single") {
                // Add an empty entry since the multi-select control doesn't allow deselection
                if (this.allUnits[0].unitId !== -5) {
                    const emptyUnit = new Ally.Unit();
                    emptyUnit.name = "None Selected";
                    emptyUnit.unitId = -5;
                    this.allUnits.unshift(emptyUnit);
                }
            }
            // Set the selected units
            _.each(this.allUnits, (allUnit) => {
                const isSelected = _.find(this.editUser.units, (userUnit) => userUnit.unitId === allUnit.unitId) !== undefined;
                allUnit.isSelectedForEditUser = isSelected;
            });
            if (this.editUser.postmarkReportedBadEmailUtc && Ally.HtmlUtil2.isValidString(this.editUser.postmarkReportedBadEmailReason)) {
                this.editUser.badEmailDate = this.editUser.postmarkReportedBadEmailUtc;
                if (this.editUser.postmarkReportedBadEmailReason === "SpamComplaint"
                    || this.editUser.postmarkReportedBadEmailReason === "SpamComplaint")
                    this.editUser.friendlyBadEmailReason = "SpamReport";
                else if (this.editUser.postmarkReportedBadEmailReason === "InactiveRecipient")
                    this.editUser.friendlyBadEmailReason = "Inactive";
                else if (this.editUser.postmarkReportedBadEmailReason === "HardBounce")
                    this.editUser.friendlyBadEmailReason = "Bounce";
                else if (this.editUser.postmarkReportedBadEmailReason === "FailedDuringSend")
                    this.editUser.friendlyBadEmailReason = "FailedSend";
                else
                    this.editUser.friendlyBadEmailReason = this.editUser.postmarkReportedBadEmailReason;
            }
            //this.residentGridOptions.selectAll( false );
            this.residentsGridApi.selection.clearSelectedRows();
            setTimeout("$( '#edit-user-first-text-box' ).focus();", 100);
        }
        /**
         * Send a resident the welcome email
         */
        onSendWelcome() {
            this.isSavingUser = true;
            this.$http.put("/api/Residents/" + this.editUser.userId + "/SendWelcome", null).then(() => {
                this.isSavingUser = false;
                this.sentWelcomeEmail = true;
            }, () => {
                this.isSavingUser = false;
                alert("Failed to send the welcome email, please contact support if this problem persists.");
            });
        }
        /**
         * Populate the text that is shown for the unit column in the resident grid
         */
        populateGridUnitLabels() {
            // Populate the unit names for the grid
            _.each(this.residentGridOptions.data, (res) => {
                const unitLabel = _.reduce(res.units, (memo, u) => {
                    if (memo.length > 0)
                        return memo + "," + u.name;
                    else
                        return u.name;
                }, "");
                const lotNumberLabel = _.reduce(res.units, (memo, u) => {
                    if (!u.lotNumber)
                        return memo;
                    if (memo.length > 0)
                        return memo + "," + (u.lotNumber || "");
                    else
                        return (u.lotNumber || "");
                }, "");
                res.unitGridLabel = unitLabel;
                res.lotNumberLabel = lotNumberLabel;
            });
        }
        /**
         * Populate the residents
         */
        refreshResidents() {
            this.isLoading = true;
            return this.$http.get("/api/Residents").then((response) => {
                this.isLoading = false;
                const residentArray = response.data;
                // The addedDateUtc property was added after we had associations setup so some
                // dates come down as DateTime.Min. Replace those with the add date.
                residentArray.forEach(r => {
                    if (r.addedDateUtc && moment(r.addedDateUtc).isBefore(this.siteInfo.privateSiteInfo.creationDate))
                        r.addedDateUtc = this.siteInfo.privateSiteInfo.creationDate;
                });
                this.residentGridOptions.data = residentArray;
                this.residentGridOptions.minRowsToShow = residentArray.length;
                this.residentGridOptions.virtualizationThreshold = residentArray.length;
                this.residentGridOptions.enableFiltering = residentArray.length > 15;
                this.residentsGridApi.core.notifyDataChange(this.uiGridConstants.dataChange.COLUMN);
                this.hasOneAdmin = _.filter(residentArray, r => r.isSiteManager).length === 1 && residentArray.length > 1;
                //this.gridApi.grid.notifyDataChange( uiGridConstants.dataChange.ALL );
                // If we have sort info to use
                if (this.residentSortInfo) {
                    const sortColumn = _.find(this.residentsGridApi.grid.columns, (col) => col.field === this.residentSortInfo.field);
                    if (sortColumn)
                        this.residentsGridApi.grid.sortColumn(sortColumn, this.residentSortInfo.direction, false);
                }
                // Build the full name and convert the last login to local time
                _.forEach(residentArray, (res) => {
                    res.fullName = res.firstName + " " + res.lastName;
                    if (typeof (res.email) === "string" && res.email.indexOf("@condoally.com") !== -1)
                        res.email = "";
                    // Convert the last login timestamps to local time
                    if (res.lastLoginDateUtc)
                        res.lastLoginDateUtc = moment.utc(res.lastLoginDateUtc).toDate();
                });
                this.populateGridUnitLabels();
                if (!this.allUnits && AppConfig.isChtnSite) {
                    this.isLoading = true;
                    this.$http.get("/api/Unit").then((httpResponse) => {
                        this.isLoading = false;
                        this.allUnits = httpResponse.data;
                        this.shouldSortUnitsNumerically = _.every(this.allUnits, u => HtmlUtil.isNumericString(u.name));
                        if (this.shouldSortUnitsNumerically)
                            this.allUnits = _.sortBy(this.allUnits, u => parseFloat(u.name));
                        // If we have a lot of units then allow searching
                        this.multiselectOptions = this.allUnits.length > 20 ? "filter" : "";
                        // Show the note on how to add homes if there's only one home
                        const twoMonthsAfterCreate = moment(this.siteInfo.privateSiteInfo.creationDate).add(2, "months");
                        this.showAddHomeLink = this.allUnits.length < 3 && moment().isBefore(twoMonthsAfterCreate);
                    }, () => {
                        this.isLoading = false;
                        alert("Failed to retrieve your association's home listing, please contact support.");
                    });
                }
            });
        }
        /**
         * Populate the pending members grid
         */
        loadPendingMembers() {
            this.isLoadingPending = true;
            this.$http.get("/api/Member/Pending").then((response) => {
                this.isLoadingPending = false;
                this.pendingMemberGridOptions.data = response.data;
                this.pendingMemberGridOptions.minRowsToShow = response.data.length;
                this.pendingMemberGridOptions.virtualizationThreshold = response.data.length;
            }, (response) => {
                this.isLoadingPending = false;
                console.log("Failed to load pending members: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user presses the button to allow multiple home selections
         */
        enableMultiHomePicker() {
            if (this.editUser)
                this.editUser.showAdvancedHomePicker = true;
            this.multiselectMulti = 'multiple';
            if (this.allUnits && this.allUnits.length > 0 && this.allUnits[0].unitId === null)
                this.allUnits.shift();
        }
        /**
         * Reject a pending member
         */
        rejectPendingMember() {
            if (!this.editUser.pendingMemberId)
                return;
            if (!confirm("Are you sure you want to remove this pending member? This action cannot be undone."))
                return;
            this.isLoading = false;
            this.$http.put("/api/Member/Pending/Deny/" + this.editUser.pendingMemberId, null).then(() => {
                this.isLoading = false;
                this.editUser = null;
                this.loadPendingMembers();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to reject pending member: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user presses the button to update a resident's information or create a new
         * resident
         */
        onSaveResident() {
            if (!this.editUser)
                return;
            $("#editUserForm").validate();
            if (!$("#editUserForm").valid())
                return;
            // If the resident's first name or email has changed and the resident has been here
            // more than 2 weeks, warn the editor they should add new residents, not edit existing
            const addedMoment = moment(this.editUser.addedDateUtc);
            const twoWeeksAgoMoment = moment().subtract(2, "weeks");
            if (addedMoment.isBefore(twoWeeksAgoMoment)) {
                const originalUser = this.residentGridOptions.data.find(u => u.userId === this.editUser.userId);
                if (originalUser.firstName !== this.editUser.firstName || originalUser.email !== this.editUser.email) {
                    const confirmMsg = "You're editing a resident's information in a way that looks like you're actually trying to add a new resident to your group. It's VERY IMPORTANT that new residents are added via the 'Add Resident' button rather than edit an existing resident. Hit cancel if you're trying to add a new resident and we'll automatically pop-up a new window to add a resident with this data.";
                    if (!confirm(confirmMsg)) {
                        // Copy the front page data
                        const newUserInfo = new UpdateResident();
                        newUserInfo.shouldSendWelcomeEmail = false;
                        newUserInfo.firstName = this.editUser.firstName;
                        newUserInfo.lastName = this.editUser.lastName;
                        newUserInfo.email = this.editUser.email;
                        newUserInfo.phoneNumber = this.editUser.phoneNumber;
                        newUserInfo.boardPosition = this.editUser.boardPosition;
                        newUserInfo.isRenter = this.editUser.isRenter;
                        newUserInfo.singleUnitId = this.editUser.singleUnitId;
                        newUserInfo.units = _.clone(this.editUser.units);
                        newUserInfo.units.forEach(u => delete u.userId); // Don't use the edit user's user ID
                        newUserInfo.showAdvancedHomePicker = this.editUser.showAdvancedHomePicker;
                        this.setEdit(newUserInfo);
                        return;
                    }
                }
            }
            // If the logged-in user is editing their own user
            if (this.editUser.userId === this.$rootScope.userInfo.userId) {
                // If the user is removing their ability to manage the site
                if (this.siteInfo.userInfo.isSiteManager && !this.editUser.isSiteManager) {
                    if (!confirm("If you remove yourself as a site admin you won't be able to continue making changes. Are you sure you want to remove yourself as a site admin?"))
                        return;
                }
            }
            // Map the UI entry of units to the type expected on the server
            if (!this.editUser.showAdvancedHomePicker) {
                if (!this.editUser.singleUnitId)
                    this.editUser.units = [];
                else
                    this.editUser.units = [{ unitId: this.editUser.singleUnitId, name: null, memberHomeId: null, userId: this.editUser.userId, isRenter: false, lotNumber: null }];
            }
            this.isSavingUser = true;
            const onSave = (response) => {
                this.isSavingUser = false;
                if (typeof (response.data.errorMessage) === "string") {
                    alert("Failed to add resident: " + response.data.errorMessage);
                    return;
                }
                if (this.editUser.pendingMemberId)
                    this.loadPendingMembers();
                this.editUser = null;
                this.refreshResidents();
            };
            let isAddingNew = false;
            const onError = (response) => {
                this.isSavingUser = false;
                let errorMessage = isAddingNew ? "Failed to add new resident" : "Failed to update resident";
                if (response && response.data && response.data.exceptionMessage)
                    errorMessage += ": " + response.data.exceptionMessage;
                alert(errorMessage);
            };
            // If we don't have a user ID then that means this is a new resident
            if (!this.editUser.userId) {
                isAddingNew = true;
                analytics.track("addNewResident");
                this.$http.post("/api/Residents", this.editUser).then(onSave, onError);
            }
            // Otherwise we're editing an existing resident
            else {
                isAddingNew = false;
                analytics.track("editResident");
                this.$http.put("/api/Residents/UpdateUser", this.editUser).then(onSave, onError);
            }
            // Update the fellow residents page next time we're there
            this.fellowResidents.clearResidentCache();
        }
        /**
         * Occurs when the user presses the button to set a user's password
         */
        OnAdminSetPassword() {
            const setPass = {
                userName: this.adminSetPass_Username,
                password: this.adminSetPass_Password
            };
            this.$http.post("/api/AdminHelper/SetPassword", setPass).then((response) => {
                this.adminSetPass_ResultMessage = response.data;
            }, (response) => {
                alert("Failed to set password: " + response.data.exceptionMessage);
            });
        }
        /**
         * Load the resident settings
         */
        loadSettings() {
            this.isLoadingSettings = true;
            this.$http.get("/api/Settings/GetSiteSettings").then((response) => {
                this.isLoadingSettings = false;
                this.residentSettings = response.data;
                // Update the SiteInfoService so the privateSiteInfo properties reflects changes
                this.siteInfo.privateSiteInfo.rentersCanViewDocs = this.residentSettings.rentersCanViewDocs;
                this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads = this.residentSettings.whoCanCreateDiscussionThreads;
                this.siteInfo.privateSiteInfo.nonAdminCanAddVendors = this.residentSettings.nonAdminCanAddVendors;
            }, (response) => {
                this.isLoadingSettings = false;
                console.log("Failed to retrieve settings: " + response.data.exceptionMessage);
            });
        }
        /**
         * Export the resident list as a CSV
         */
        exportResidentCsv() {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportResidentCsv');
            const csvColumns = [
                {
                    headerText: "First Name",
                    fieldName: "firstName"
                },
                {
                    headerText: "Last Name",
                    fieldName: "lastName"
                },
                {
                    headerText: "CellPhone",
                    fieldName: "phoneNumber"
                },
                {
                    headerText: "Email",
                    fieldName: "email"
                },
                {
                    headerText: "Unit",
                    fieldName: "unitGridLabel"
                },
                {
                    headerText: "Lot#",
                    fieldName: "lotNumberLabel"
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
                    dataMapper: (value) => this.getBoardPositionName(value)
                },
                {
                    headerText: "Alternate Mailing",
                    fieldName: "mailingAddressObject",
                    dataMapper: (value) => {
                        if (!value)
                            return "";
                        if (value.recipientName)
                            return value.recipientName + " " + value.oneLiner;
                        return value.oneLiner;
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
                    dataMapper: (value) => {
                        if (!value)
                            return "Has not logged-in";
                        return moment(value).format("YYYY-MM-DD HH:mm:00");
                    }
                }
            ];
            const csvDataString = Ally.createCsvString(this.residentGridOptions.data, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Residents.csv");
        }
        /**
         * Export the member list for a PTA in Kansas as a CSV ready to be uploaded to the state
         */
        exportKansasPtaCsv() {
            if (!this.siteInfo.privateSiteInfo.ptaUnitId) {
                alert("You must first set your PTA unit ID in Manage -> Settings before you can export in this format.");
                return;
            }
            if (typeof (analytics) !== "undefined")
                analytics.track('exportKansasPtaCsv');
            const csvColumns = [
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
            const copiedMembers = _.clone(this.residentGridOptions.data);
            for (const member of copiedMembers) {
                member.Local_Unit = this.siteInfo.privateSiteInfo.ptaUnitId.toString();
                member.Membership_Name = (!member.firstName || member.firstName === "N/A") ? member.lastName : member.firstName;
                if (member.boardPosition !== 0)
                    member.Position = this.getBoardPositionName(member.boardPosition);
            }
            let csvDataString = Ally.createCsvString(this.residentGridOptions.data, csvColumns);
            csvDataString = "data:text/csv;charset=utf-8," + csvDataString;
            const encodedUri = encodeURI(csvDataString);
            // Works, but can't set the file name
            //window.open( encodedUri );
            const csvLink = document.createElement("a");
            csvLink.setAttribute("href", encodedUri);
            csvLink.setAttribute("download", "pta-members.csv");
            document.body.appendChild(csvLink); // Required for FF
            csvLink.click(); // This will download the file
            setTimeout(() => document.body.removeChild(csvLink), 500);
        }
        /**
         * Save the resident settings to the server
         */
        saveResidentSettings() {
            analytics.track("editResidentSettings");
            this.isLoadingSettings = true;
            this.$http.put("/api/Settings/UpdateSiteSettings", this.residentSettings).then(() => {
                this.isLoadingSettings = false;
                // Update the fellow residents page next time we're there
                this.fellowResidents.clearResidentCache();
                // Update the locally cached settings to match the saved values
                this.siteInfo.privateSiteInfo.canHideContactInfo = this.residentSettings.canHideContactInfo;
                this.siteInfo.privateSiteInfo.isDiscussionEmailGroupEnabled = this.residentSettings.isDiscussionEmailGroupEnabled;
                this.siteInfo.privateSiteInfo.nonAdminCanAddVendors = this.residentSettings.nonAdminCanAddVendors;
            }, () => {
                this.isLoadingSettings = false;
                alert("Failed to update settings, please try again or contact support.");
            });
        }
        /**
         * Occurs when the user presses the button to delete a resident
         */
        onDeleteResident() {
            if (!confirm("Are you sure you want to remove this person from your building?"))
                return;
            if (this.siteInfo.userInfo.userId === this.editUser.userId) {
                if (!confirm("If you remove your own account you won't be able to login anymore. Are you still sure?"))
                    return;
            }
            this.isSavingUser = true;
            this.$http.delete("/api/Residents?userId=" + this.editUser.userId).then(() => {
                this.isSavingUser = false;
                this.editUser = null;
                // Update the fellow residents page next time we're there
                this.fellowResidents.clearResidentCache();
                this.refreshResidents();
            }, () => {
                alert("Failed to remove the resident. Please let support know if this continues to happen.");
                this.isSavingUser = false;
                this.editUser = null;
            });
        }
        /**
         * Occurs when the user presses the button to reset everyone's password
         */
        onSendAllWelcome() {
            if (!confirm("This will email all of the residents in your association. Do you want to proceed?"))
                return;
            this.isLoading = true;
            this.$http.put("/api/Residents/UserAction?userId&action=launchsite", null).then(() => {
                this.isLoading = false;
                this.sentWelcomeEmail = true;
                this.allEmailsSent = true;
            }, () => {
                this.isLoading = false;
                alert("Failed to send welcome email, please contact support if this problem persists.");
            });
        }
        /**
         * Parse the bulk resident CSV text
         */
        parseBulkCsv() {
            const csvParser = $.csv;
            const bulkRows = csvParser.toArrays(this.bulkImportCsv);
            this.bulkImportRows = [];
            const simplifyStreetName = (streetAddress) => {
                if (!streetAddress)
                    streetAddress = "";
                let simplifiedName = streetAddress.toLowerCase();
                simplifiedName = simplifiedName.replace(/0th /g, "0 ").replace(/1st /g, "1 ");
                simplifiedName = simplifiedName.replace(/2nd /g, "2 ").replace(/3rd /g, "3 ");
                simplifiedName = simplifiedName.replace(/4th /g, "4 ").replace(/5th /g, "5 ");
                simplifiedName = simplifiedName.replace(/6th /g, "6 ").replace(/7th /g, "7 ");
                simplifiedName = simplifiedName.replace(/8th /g, "8 ").replace(/9th /g, "9 ");
                simplifiedName = simplifiedName.replace(/\./g, "").replace(/ /g, "");
                simplifiedName = simplifiedName.replace(/street/g, "st").replace(/road/g, "rd").replace(/drive/g, "dr");
                simplifiedName = simplifiedName.replace(/place/g, "pl").replace(/avenue/g, "ave");
                return simplifiedName;
            };
            if (this.allUnits) {
                for (let i = 0; i < this.allUnits.length; ++i)
                    this.allUnits[i].csvTestName = simplifyStreetName(this.allUnits[i].name);
            }
            for (let i = 0; i < bulkRows.length; ++i) {
                const curRow = bulkRows[i];
                while (curRow.length < 10)
                    curRow.push("");
                // Skip the header row, if there is one
                if (curRow[0] === "Address/Unit" && curRow[1] === "Email" && curRow[2] === "First Name")
                    continue;
                // Clean up the data
                for (let j = 0; j < curRow.length; ++j) {
                    if (HtmlUtil.isNullOrWhitespace(curRow[j]))
                        curRow[j] = null;
                    else
                        curRow[j] = curRow[j].trim();
                }
                const newRow = {
                    unitName: curRow[0] || null,
                    unitId: undefined,
                    email: curRow[1],
                    firstName: curRow[2],
                    lastName: curRow[3],
                    phoneNumber: curRow[4],
                    isRenter: !HtmlUtil.isNullOrWhitespace(curRow[5]),
                    isAdmin: !HtmlUtil.isNullOrWhitespace(curRow[6]),
                    csvTestName: "",
                    mailingAddress: curRow[7],
                    alternatePhone: curRow[8],
                    managerNotes: curRow[9],
                    emailHasDupe: false
                };
                if (HtmlUtil.isNullOrWhitespace(newRow.unitName))
                    newRow.unitId = null;
                else {
                    newRow.csvTestName = simplifyStreetName(newRow.unitName);
                    const unit = _.find(this.allUnits, (u) => u.csvTestName === newRow.csvTestName);
                    if (unit)
                        newRow.unitId = unit.unitId;
                    else
                        newRow.unitId = undefined;
                }
                // If this row contains two people
                let spouseRow = null;
                if (newRow.firstName && newRow.firstName.toLowerCase().indexOf(" & ") !== -1)
                    newRow.firstName = newRow.firstName.replace(" & ", " and  ");
                if (newRow.firstName && newRow.firstName.toLowerCase().indexOf(" and ") !== -1) {
                    spouseRow = _.clone(newRow);
                    const splitFirst = newRow.firstName.split(" and ");
                    newRow.firstName = splitFirst[0];
                    spouseRow.firstName = splitFirst[1];
                    if (newRow.email && newRow.email.indexOf(" / ") !== -1) {
                        const splitEmail = newRow.email.split(" / ");
                        newRow.email = splitEmail[0];
                        spouseRow.email = splitEmail[1];
                    }
                    else
                        spouseRow.email = "";
                    spouseRow.phoneNumber = "";
                }
                if (this.bulkParseNormalizeNameCase) {
                    const capitalizeFirst = (str) => {
                        if (!str)
                            return str;
                        if (str.length === 1)
                            return str.toUpperCase();
                        return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
                    };
                    newRow.firstName = capitalizeFirst(newRow.firstName);
                    newRow.lastName = capitalizeFirst(newRow.lastName);
                    if (spouseRow) {
                        spouseRow.firstName = capitalizeFirst(spouseRow.firstName);
                        spouseRow.lastName = capitalizeFirst(spouseRow.lastName);
                    }
                }
                this.bulkImportRows.push(newRow);
                if (spouseRow)
                    this.bulkImportRows.push(spouseRow);
            }
            // Find any duplicate email addresses
            for (const curRow of this.bulkImportRows)
                curRow.emailHasDupe = curRow.email && this.bulkImportRows.filter(r => r.email === curRow.email).length > 1;
        }
        /**
         * Submit the bulk creation rows to the server
         */
        submitBulkRows() {
            this.isLoading = true;
            this.$http.post("/api/Residents/BulkLoad", this.bulkImportRows, { timeout: 10 * 60 * 1000 }).then(() => {
                this.isLoading = false;
                this.bulkImportRows = [new ResidentCsvRow()];
                this.bulkImportCsv = "";
                alert("Success");
                this.refreshResidents();
            }, () => {
                this.isLoading = false;
                alert("Bulk upload failed");
            });
        }
        /**
         * Add a row to the bulk table
         */
        addBulkRow() {
            const newRow = {
                unitName: "",
                unitId: null,
                email: "",
                firstName: "",
                lastName: "",
                phoneNumber: "",
                isRenter: false,
                isAdmin: false,
                csvTestName: undefined,
                mailingAddress: "",
                alternatePhone: "",
                managerNotes: "",
                emailHasDupe: false
            };
            // Try to step to the next unit
            if (this.allUnits) {
                if (this.bulkImportRows.length > 0) {
                    const lastUnitId = this.bulkImportRows[this.bulkImportRows.length - 1].unitId;
                    let lastUnitIndex = _.findIndex(this.allUnits, (u) => u.unitId === lastUnitId);
                    ++lastUnitIndex;
                    if (lastUnitIndex < this.allUnits.length) {
                        newRow.unitName = this.allUnits[lastUnitIndex].name;
                        newRow.unitId = this.allUnits[lastUnitIndex].unitId;
                    }
                }
            }
            this.bulkImportRows.push(newRow);
        }
        /**
         * Display the list of recent emails
         */
        toggleEmailHistoryVisible() {
            this.showEmailHistory = !this.showEmailHistory;
            this.viewingRecentEmailBody = null;
            if (this.showEmailHistory && !this.emailHistoryGridOptions.data) {
                this.isLoadingSettings = true;
                this.$http.get("/api/Email/RecentGroupEmails").then((response) => {
                    this.isLoadingSettings = false;
                    this.emailHistoryGridOptions.data = response.data;
                }, (response) => {
                    this.isLoadingSettings = false;
                    alert("Failed to load emails: " + response.data.exceptionMessage);
                });
            }
        }
        /**
         * Load 6 more months of email history
         */
        loadMoreRecentEmails() {
            this.isLoadingSettings = true;
            const NumMonthsStep = 6;
            this.emailHistoryNumMonths += NumMonthsStep;
            this.emailHistorySinceDate = moment(this.emailHistorySinceDate).subtract(NumMonthsStep, "months").toDate();
            this.$http.get("/api/Email/RecentGroupEmails?sinceDateUtc=" + this.emailHistorySinceDate.toISOString()).then((response) => {
                this.isLoadingSettings = false;
                this.emailHistoryGridOptions.data = this.emailHistoryGridOptions.data.concat(response.data);
            }, (response) => {
                this.isLoadingSettings = false;
                alert("Failed to load emails: " + response.data.exceptionMessage);
            });
        }
        resetResidentGridState() {
            // Remove the saved grid state
            window.localStorage.removeItem(ManageResidentsController.StoreKeyResidentGridState);
            // Refresh the page, but don't save the grid state on exit
            this.shouldSaveResidentGridState = false;
            window.location.reload();
        }
        onAddNewMember() {
            const newUserInfo = new UpdateResident();
            newUserInfo.boardPosition = 0;
            newUserInfo.shouldSendWelcomeEmail = false;
            this.setEdit(newUserInfo);
        }
    }
    ManageResidentsController.$inject = ["$http", "$rootScope", "fellowResidents", "uiGridConstants", "SiteInfo", "appCacheService"];
    ManageResidentsController.StoreKeyResidentGridState = "AllyResGridState";
    Ally.ManageResidentsController = ManageResidentsController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageResidents", {
    templateUrl: "/ngApp/chtn/manager/manage-residents.html",
    controller: Ally.ManageResidentsController
});

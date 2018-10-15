/// <reference path="../../../Scripts/typings/ui-grid/ui-grid.d.ts" />
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    var Unit = /** @class */ (function () {
        function Unit() {
        }
        return Unit;
    }());
    Ally.Unit = Unit;
    var HomeEntry = /** @class */ (function () {
        function HomeEntry() {
        }
        return HomeEntry;
    }());
    Ally.HomeEntry = HomeEntry;
    var HomeEntryWithName = /** @class */ (function (_super) {
        __extends(HomeEntryWithName, _super);
        function HomeEntryWithName() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return HomeEntryWithName;
    }(Ally.HomeEntry));
    Ally.HomeEntryWithName = HomeEntryWithName;
    var Member = /** @class */ (function () {
        function Member() {
        }
        return Member;
    }());
    Ally.Member = Member;
    var MemberWithBoard = /** @class */ (function (_super) {
        __extends(MemberWithBoard, _super);
        function MemberWithBoard() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return MemberWithBoard;
    }(Member));
    Ally.MemberWithBoard = MemberWithBoard;
    /// Represents a member of a CHTN site
    var Resident = /** @class */ (function (_super) {
        __extends(Resident, _super);
        function Resident() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return Resident;
    }(MemberWithBoard));
    Ally.Resident = Resident;
    var UpdateResident = /** @class */ (function (_super) {
        __extends(UpdateResident, _super);
        function UpdateResident() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return UpdateResident;
    }(Resident));
    Ally.UpdateResident = UpdateResident;
    var RecentEmail = /** @class */ (function () {
        function RecentEmail() {
        }
        return RecentEmail;
    }());
    var ResidentCsvRow = /** @class */ (function () {
        function ResidentCsvRow() {
        }
        return ResidentCsvRow;
    }());
    /**
     * The controller for the page to add, edit, and delete members from the site
     */
    var ManageResidentsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManageResidentsController($http, $rootScope, $interval, fellowResidents, uiGridConstants, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$interval = $interval;
            this.fellowResidents = fellowResidents;
            this.uiGridConstants = uiGridConstants;
            this.siteInfo = siteInfo;
            this.isAdmin = false;
            this.showEmailSettings = true;
            this.shouldShowHomePicker = true;
            this.showKansasPtaExport = false;
            this.multiselectMulti = "single";
            this.isSavingUser = false;
            this.isLoading = false;
            this.isLoadingSettings = false;
            this.showEmailHistory = false;
            this.bulkParseNormalizeNameCase = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageResidentsController.prototype.$onInit = function () {
            this.isAdmin = this.siteInfo.userInfo.isAdmin;
            this.siteLaunchedDateUtc = this.siteInfo.privateSiteInfo.siteLaunchedDateUtc;
            this.bulkImportRows = [{}];
            this.multiselectOptions = "";
            this.allUnits = null;
            this.homeName = AppConfig.homeName || "Unit";
            this.showIsRenter = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            this.shouldShowHomePicker = AppConfig.appShortName !== "pta";
            this.showKansasPtaExport = true;
            AppConfig.appShortName === "pta" && this.siteInfo.privateSiteInfo.groupAddress.state === "KS";
            this.showEmailSettings = !this.siteInfo.privateSiteInfo.isEmailSendingRestricted;
            this.memberTypeLabel = AppConfig.memberTypeLabel;
            this.boardPositions = [
                { id: 0, name: "None" },
                { id: 1, name: "President" },
                { id: 2, name: "Treasurer" },
                { id: 4, name: "Secretary" },
                { id: 8, name: "Director/Trustee" },
                { id: 16, name: "Vice President" },
                { id: 32, name: "Property Manager" }
            ];
            this.newResident = {
                boardPosition: 0,
                isRenter: false
            };
            this.editUser = null;
            var LocalKey_ResidentSort = "residentSort_v2";
            var defaultSort = { field: "lastName", direction: this.uiGridConstants.ASC };
            this.residentSortInfo = defaultSort;
            if (window.localStorage) {
                var sortOptions = window.localStorage.getItem(LocalKey_ResidentSort);
                if (sortOptions)
                    this.residentSortInfo = JSON.parse(sortOptions);
                if (!this.residentSortInfo.field)
                    this.residentSortInfo = defaultSort;
            }
            var homeColumnWidth = AppConfig.appShortName === "hoa" ? 140 : (this.showIsRenter ? 62 : 175);
            var innerThis = this;
            this.residentGridOptions =
                {
                    data: [],
                    columnDefs: [
                        { field: 'firstName', displayName: 'First Name', cellClass: "resident-cell-first" },
                        { field: 'lastName', displayName: 'Last Name', cellClass: "resident-cell-last" },
                        { field: 'email', displayName: 'E-mail', cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text class="resident-cell-email" data-ng-style="{ \'color\': row.entity.postmarkReportedBadEmailUtc ? \'#F00\' : \'auto\' }">{{ row.entity.email }}</span></div>' },
                        {
                            field: 'unitGridLabel',
                            displayName: AppConfig.appShortName === 'condo' ? 'Unit' : 'Home',
                            cellClass: "resident-cell-unit",
                            width: homeColumnWidth,
                            visible: AppConfig.isChtnSite,
                            sortingAlgorithm: function (a, b) { return a.toString().localeCompare(b.toString()); }
                        },
                        {
                            field: 'isRenter',
                            displayName: 'Is Renter',
                            width: 80,
                            cellClass: "resident-cell-is-renter",
                            visible: this.showIsRenter,
                            cellTemplate: '<div class="ui-grid-cell-contents" style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" data-ng-checked="row.entity.isRenter"></div>'
                        },
                        { field: 'boardPosition', displayName: 'Board Position', width: 125, cellClass: "resident-cell-board", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ grid.appScope.$ctrl.getBoardPositionName(row.entity.boardPosition) }}</span></div>' },
                        { field: 'isSiteManager', displayName: 'Is Admin', width: 80, cellClass: "resident-cell-site-manager", cellTemplate: '<div class="ui-grid-cell-contents" style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" data-ng-checked="row.entity.isSiteManager"></div>' },
                        { field: 'phoneNumber', displayName: 'Phone Number', width: 150, cellClass: "resident-cell-phone", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ row.entity.phoneNumber | tel }}</span></div>' },
                    ],
                    multiSelect: false,
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableFullRowSelection: true,
                    enableColumnMenus: false,
                    enableRowHeaderSelection: false,
                    onRegisterApi: function (gridApi) {
                        innerThis.gridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged(innerThis.$rootScope, function (row) {
                            var msg = 'row selected ' + row.isSelected;
                            innerThis.setEdit(row.entity);
                        });
                        gridApi.core.on.sortChanged(innerThis.$rootScope, function (grid, sortColumns) {
                            if (!sortColumns || sortColumns.length === 0)
                                return;
                            // Remember the sort
                            var simpleSortInfo = { field: sortColumns[0].field, direction: sortColumns[0].sort.direction };
                            window.localStorage.setItem(LocalKey_ResidentSort, JSON.stringify(simpleSortInfo));
                        });
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            if (window.innerWidth < 769) {
                for (var i = 2; i < this.residentGridOptions.columnDefs.length; ++i)
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
                    onRegisterApi: function (gridApi) {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            this.refresh();
            this.loadSettings();
        };
        ManageResidentsController.prototype.getBoardPositionName = function (boardValue) {
            if (!boardValue)
                return "";
            var boardPosition = jQuery.grep(this.boardPositions, function (pos, i) { return pos.id === boardValue; })[0];
            if (!boardPosition)
                return "";
            return boardPosition.name;
        };
        /**
        * Edit a resident's information
        */
        ManageResidentsController.prototype.setEdit = function (resident) {
            var _this = this;
            this.sentWelcomeEmail = false;
            if (resident === null) {
                this.editUser = null;
                return;
            }
            this.editUserForm.$setPristine();
            var copiedUser = jQuery.extend({}, resident);
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
                    var emptyUnit = new Ally.Unit();
                    emptyUnit.name = "None Selected";
                    emptyUnit.unitId = -5;
                    this.allUnits.unshift(emptyUnit);
                }
            }
            // Set the selected units
            _.each(this.allUnits, function (allUnit) {
                var isSelected = _.find(_this.editUser.units, function (userUnit) { return userUnit.unitId === allUnit.unitId; }) !== undefined;
                allUnit.isSelectedForEditUser = isSelected;
            });
            //this.residentGridOptions.selectAll( false );
            this.gridApi.selection.clearSelectedRows();
            setTimeout("$( '#edit-user-first-text-box' ).focus();", 100);
        };
        /**
         * Send a resident the welcome e-mail
         */
        ManageResidentsController.prototype.onSendWelcome = function () {
            this.isSavingUser = true;
            var innerThis = this;
            this.$http.put("/api/Residents/" + this.editUser.userId + "/SendWelcome", null).success(function () {
                innerThis.isSavingUser = false;
                innerThis.sentWelcomeEmail = true;
            }).error(function () {
                innerThis.isSavingUser = false;
                alert("Failed to send the welcome e-mail, please contact support if this problem persists.");
            });
        };
        /**
         * Populate the text that is shown for the unit column in the resident grid
         */
        ManageResidentsController.prototype.populateGridUnitLabels = function () {
            // Populate the unit names for the grid
            _.each(this.residentGridOptions.data, function (res) {
                var unitLabel = _.reduce(res.units, function (memo, u) {
                    if (memo.length > 0)
                        return memo + "," + u.name;
                    else
                        return u.name;
                }, "");
                res.unitGridLabel = unitLabel;
            });
        };
        /**
         * Populate the residents
         */
        ManageResidentsController.prototype.refresh = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Residents").success(function (residentArray) {
                innerThis.isLoading = false;
                innerThis.residentGridOptions.data = residentArray;
                innerThis.residentGridOptions.minRowsToShow = residentArray.length;
                innerThis.residentGridOptions.virtualizationThreshold = residentArray.length;
                innerThis.hasOneAdmin = _.filter(residentArray, function (r) { return r.isSiteManager; }).length === 1 && residentArray.length > 1;
                //this.gridApi.grid.notifyDataChange( uiGridConstants.dataChange.ALL );
                // If we have sort info to use
                if (innerThis.residentSortInfo) {
                    var sortColumn = _.find(innerThis.gridApi.grid.columns, function (col) { return col.field === innerThis.residentSortInfo.field; });
                    if (sortColumn)
                        innerThis.gridApi.grid.sortColumn(sortColumn, innerThis.residentSortInfo.direction, false);
                }
                // Build the full name and convert the last login to local time
                _.forEach(residentArray, function (res) {
                    res.fullName = res.firstName + " " + res.lastName;
                    if (typeof (res.email) === "string" && res.email.indexOf("@condoally.com") !== -1)
                        res.email = "";
                    // Convert the last login timestamps to local time
                    if (res.lastLoginDateUtc)
                        res.lastLoginDateUtc = moment.utc(res.lastLoginDateUtc).toDate();
                });
                innerThis.populateGridUnitLabels();
                if (!innerThis.allUnits && AppConfig.isChtnSite) {
                    innerThis.isLoading = true;
                    innerThis.$http.get("/api/Unit").then(function (httpResponse) {
                        innerThis.isLoading = false;
                        innerThis.allUnits = httpResponse.data;
                        // If we have a lot of units then allow searching
                        innerThis.multiselectOptions = innerThis.allUnits.length > 20 ? "filter" : "";
                    }, function () {
                        innerThis.isLoading = false;
                        alert("Failed to retrieve your association's home listing, please contact support.");
                    });
                }
            });
        };
        /**
         * Occurs when the user presses the button to allow multiple home selections
         */
        ManageResidentsController.prototype.enableMultiHomePicker = function () {
            if (this.editUser)
                this.editUser.showAdvancedHomePicker = true;
            this.multiselectMulti = 'multiple';
            if (this.allUnits && this.allUnits.length > 0 && this.allUnits[0].unitId === null)
                this.allUnits.shift();
        };
        /**
         * Occurs when the user presses the button to update a resident's information or create a new
         * resident
         */
        ManageResidentsController.prototype.onSaveResident = function () {
            if (!this.editUser)
                return;
            $("#editUserForm").validate();
            if (!$("#editUserForm").valid())
                return;
            // If the logged-in user is editing their own user
            if (this.editUser.userId === this.$rootScope.userInfo.userId) {
                // If the user is removing their ability to manage the site
                if (this.siteInfo.userInfo.isSiteManager && !this.editUser.isSiteManager) {
                    if (!confirm("If you remove yourself as a site admin you won't be able to continue making changes. Are you sure you want to remove yourself as a site admin?"))
                        return;
                }
            }
            // Map the UI entry of units to the type expected on the server
            if (!this.editUser.showAdvancedHomePicker)
                this.editUser.units = [{ unitId: this.editUser.singleUnitId }];
            this.isSavingUser = true;
            var innerThis = this;
            var onSave = function (response) {
                innerThis.isSavingUser = false;
                if (typeof (response.data.errorMessage) === "string") {
                    alert("Failed to add resident: " + response.data.errorMessage);
                    return;
                }
                innerThis.editUser = null;
                innerThis.refresh();
            };
            var isAddingNew = false;
            var onError = function (response) {
                innerThis.isSavingUser = false;
                var errorMessage = isAddingNew ? "Failed to add new resident" : "Failed to update resident";
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
            else {
                isAddingNew = false;
                analytics.track("editResident");
                this.$http.put("/api/Residents", this.editUser).then(onSave, onError);
            }
            // Update the fellow residents page next time we're there
            this.fellowResidents.clearResidentCache();
        };
        /**
         * Occurs when the user presses the button to set a user's password
         */
        ManageResidentsController.prototype.OnAdminSetPassword = function () {
            var setPass = {
                userName: this.adminSetPass_Username,
                password: this.adminSetPass_Password
            };
            var innerThis = this;
            this.$http.post("/api/AdminHelper/SetPassword", setPass).success(function (resultMessage) {
                innerThis.adminSetPass_ResultMessage = resultMessage;
            }).error(function (data) {
                var errorMessage = data.exceptionMessage ? data.exceptionMessage : data;
                alert("Failed to set password: " + errorMessage);
            });
        };
        /**
         * Load the resident settings
         */
        ManageResidentsController.prototype.loadSettings = function () {
            var _this = this;
            this.isLoadingSettings = true;
            var innerThis = this;
            this.$http.get("/api/Settings").success(function (data) {
                innerThis.isLoadingSettings = false;
                _this.residentSettings = data;
            }).error(function (exc) {
                innerThis.isLoadingSettings = false;
                console.log("Failed to retrieve settings");
            });
        };
        /**
         * Export the resident list as a CSV
         */
        ManageResidentsController.prototype.exportResidentCsv = function () {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportResidentCsv');
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
                    dataMapper: function (value) {
                        return innerThis.getBoardPositionName(value);
                    }
                },
                {
                    headerText: "Last Login Date",
                    fieldName: "lastLoginDateUtc",
                    dataMapper: function (value) {
                        if (!value)
                            return "Has not logged-in";
                        return moment(value).format("YYYY-MM-DD HH:mm:00");
                    }
                }
            ];
            var csvDataString = Ally.createCsvString(this.residentGridOptions.data, csvColumns);
            csvDataString = "data:text/csv;charset=utf-8," + csvDataString;
            var encodedUri = encodeURI(csvDataString);
            // Works, but can't set the file name
            //window.open( encodedUri );
            var csvLink = document.createElement("a");
            csvLink.setAttribute("href", encodedUri);
            csvLink.setAttribute("download", "Residents.csv");
            document.body.appendChild(csvLink); // Required for FF
            csvLink.click(); // This will download the data file named "my_data.csv"
            setTimeout(function () { document.body.removeChild(csvLink); }, 500);
        };
        /**
         * Export the member list for a PTA in Kansas as a CSV ready to be uploaded to the state
         */
        ManageResidentsController.prototype.exportKansasPtaCsv = function () {
            if (!this.siteInfo.privateSiteInfo.ptaUnitId) {
                alert("You must first set your PTA unit ID in Manage -> Settings before you can export this list");
                return;
            }
            if (typeof (analytics) !== "undefined")
                analytics.track('exportKansasPtaCsv');
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
            var copiedMembers = _.clone(this.residentGridOptions.data);
            for (var _i = 0, copiedMembers_1 = copiedMembers; _i < copiedMembers_1.length; _i++) {
                var member = copiedMembers_1[_i];
                member.Local_Unit = this.siteInfo.privateSiteInfo.ptaUnitId.toString();
            }
            var csvDataString = Ally.createCsvString(this.residentGridOptions.data, csvColumns);
            csvDataString = "data:text/csv;charset=utf-8," + csvDataString;
            var encodedUri = encodeURI(csvDataString);
            // Works, but can't set the file name
            //window.open( encodedUri );
            var csvLink = document.createElement("a");
            csvLink.setAttribute("href", encodedUri);
            csvLink.setAttribute("download", "pta-members.csv");
            document.body.appendChild(csvLink); // Required for FF
            csvLink.click(); // This will download the file
            setTimeout(function () { document.body.removeChild(csvLink); }, 500);
        };
        /**
         * Save the resident settings to the server
         */
        ManageResidentsController.prototype.saveResidentSettings = function () {
            analytics.track("editResidentSettings");
            this.isLoadingSettings = true;
            var innerThis = this;
            this.$http.put("/api/Settings", this.residentSettings).success(function () {
                innerThis.isLoadingSettings = false;
                // Update the fellow residents page next time we're there
                innerThis.fellowResidents.clearResidentCache();
                innerThis.siteInfo.privateSiteInfo.canHideContactInfo = innerThis.residentSettings.canHideContactInfo;
            }).error(function () {
                innerThis.isLoadingSettings = false;
                alert("Failed to update settings, please try again or contact support.");
            });
        };
        /**
         * Occurs when the user presses the button to delete a resident
         */
        ManageResidentsController.prototype.onDeleteResident = function () {
            if (!confirm("Are you sure you want to remove this person from your building?"))
                return;
            if (this.siteInfo.userInfo.userId === this.editUser.userId) {
                if (!confirm("If you remove your own account you won't be able to login anymore. Are you still sure?"))
                    return;
            }
            this.isSavingUser = true;
            var innerThis = this;
            this.$http.delete("/api/Residents?userId=" + this.editUser.userId).success(function () {
                innerThis.isSavingUser = false;
                innerThis.editUser = null;
                // Update the fellow residents page next time we're there
                innerThis.fellowResidents.clearResidentCache();
                innerThis.refresh();
            }).error(function () {
                alert("Failed to remove the resident. Please let support know if this continues to happen.");
                innerThis.isSavingUser = false;
                innerThis.editUser = null;
            });
        };
        /**
         * Occurs when the user presses the button to reset everyone's password
         */
        ManageResidentsController.prototype.onSendAllWelcome = function () {
            if (!confirm("This will e-mail all of the residents in your association. Do you want to proceed?"))
                return;
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/Residents?userId&action=launchsite", null).success(function (data) {
                innerThis.isLoading = false;
                innerThis.sentWelcomeEmail = true;
                innerThis.allEmailsSent = true;
            }).error(function () {
                innerThis.isLoading = false;
                alert("Failed to send welcome e-mail, please contact support if this problem persists.");
            });
        };
        /**
         * Parse the bulk resident CSV text
         */
        ManageResidentsController.prototype.parseBulkCsv = function () {
            var csvParser = $.csv;
            var bulkRows = csvParser.toArrays(this.bulkImportCsv);
            this.bulkImportRows = [];
            var simplifyStreetName = function (streetAddress) {
                if (!streetAddress)
                    streetAddress = "";
                var simplifiedName = streetAddress.toLowerCase();
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
                for (var i = 0; i < this.allUnits.length; ++i)
                    this.allUnits[i].csvTestName = simplifyStreetName(this.allUnits[i].name);
            }
            var _loop_1 = function () {
                var curRow = bulkRows[i];
                while (curRow.length < 7)
                    curRow.push("");
                // Skip the header row, if there is one
                if (curRow[0] === "unit name" && curRow[1] === "e-mail address" && curRow[2] === "first name")
                    return "continue";
                // Clean up the data
                for (var j = 0; j < curRow.length; ++j) {
                    if (HtmlUtil.isNullOrWhitespace(curRow[j]))
                        curRow[j] = null;
                    else
                        curRow[j] = curRow[j].trim();
                }
                var newRow = {
                    unitName: curRow[0] || null,
                    unitId: undefined,
                    email: curRow[1],
                    firstName: curRow[2],
                    lastName: curRow[3],
                    phoneNumber: curRow[4],
                    isRenter: !HtmlUtil.isNullOrWhitespace(curRow[5]),
                    isAdmin: !HtmlUtil.isNullOrWhitespace(curRow[6]),
                    csvTestName: ""
                };
                if (HtmlUtil.isNullOrWhitespace(newRow.unitName))
                    newRow.unitId = null;
                else {
                    newRow.csvTestName = simplifyStreetName(newRow.unitName);
                    unit = _.find(this_1.allUnits, function (u) { return u.csvTestName === newRow.csvTestName; });
                    if (unit)
                        newRow.unitId = unit.unitId;
                    else
                        newRow.unitId = undefined;
                }
                // If this row contains two people
                var spouseRow = null;
                if (newRow.firstName && newRow.firstName.toLowerCase().indexOf(" and ") !== -1) {
                    spouseRow = _.clone(newRow);
                    splitFirst = newRow.firstName.split(" and ");
                    newRow.firstName = splitFirst[0];
                    spouseRow.firstName = splitFirst[1];
                    if (newRow.email && newRow.email.indexOf(" / ") !== -1) {
                        var splitEmail = newRow.email.split(" / ");
                        newRow.email = splitEmail[0];
                        spouseRow.email = splitEmail[1];
                    }
                    else
                        spouseRow.email = "";
                    spouseRow.phoneNumber = "";
                }
                if (this_1.bulkParseNormalizeNameCase) {
                    var capitalizeFirst = function (str) {
                        if (!str)
                            return str;
                        if (str.length === 1)
                            return str.toUpperCase();
                        return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();
                    };
                    newRow.firstName = capitalizeFirst(newRow.firstName);
                    newRow.lastName = capitalizeFirst(newRow.lastName);
                    if (spouseRow) {
                        spouseRow.firstName = capitalizeFirst(spouseRow.firstName);
                        spouseRow.lastName = capitalizeFirst(spouseRow.lastName);
                    }
                }
                this_1.bulkImportRows.push(newRow);
                if (spouseRow)
                    this_1.bulkImportRows.push(spouseRow);
            };
            var this_1 = this, unit, splitFirst;
            for (var i = 0; i < bulkRows.length; ++i) {
                _loop_1();
            }
        };
        /**
         * Submit the bulk creation rows to the server
         */
        ManageResidentsController.prototype.submitBulkRows = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/Residents/BulkLoad", this.bulkImportRows).success(function () {
                innerThis.isLoading = false;
                innerThis.bulkImportRows = [{}];
                innerThis.bulkImportCsv = "";
                alert("Success");
            }).error(function () {
                innerThis.isLoading = false;
                alert("Bulk upload failed");
            });
        };
        /**
         * Add a row to the bulk table
         */
        ManageResidentsController.prototype.addBulkRow = function () {
            var newRow = {
                unitName: "",
                unitId: null,
                email: "",
                firstName: "",
                lastName: "",
                phoneNumber: "",
                isRenter: false,
                isAdmin: false,
                csvTestName: undefined
            };
            // Try to step to the next unit
            if (this.allUnits) {
                if (this.bulkImportRows.length > 0) {
                    var lastUnitId = this.bulkImportRows[this.bulkImportRows.length - 1].unitId;
                    var lastUnitIndex = _.findIndex(this.allUnits, function (u) { return u.unitId === lastUnitId; });
                    ++lastUnitIndex;
                    if (lastUnitIndex < this.allUnits.length) {
                        newRow.unitName = this.allUnits[lastUnitIndex].name;
                        newRow.unitId = this.allUnits[lastUnitIndex].unitId;
                    }
                }
            }
            this.bulkImportRows.push(newRow);
        };
        /**
         * Display the list of recent e-mails
         */
        ManageResidentsController.prototype.toggleEmailHistoryVisible = function () {
            var _this = this;
            this.showEmailHistory = !this.showEmailHistory;
            if (this.showEmailHistory && !this.emailHistoryGridOptions.data) {
                this.isLoadingSettings = true;
                this.$http.get("/api/Email/RecentGroupEmails").then(function (response) {
                    _this.isLoadingSettings = false;
                    _this.emailHistoryGridOptions.data = response.data;
                }, function (response) {
                    _this.isLoadingSettings = false;
                    alert("Failed to load e-mails: " + response.data.exceptionMessage);
                });
            }
        };
        ManageResidentsController.$inject = ["$http", "$rootScope", "$interval", "fellowResidents", "uiGridConstants", "SiteInfo"];
        return ManageResidentsController;
    }());
    Ally.ManageResidentsController = ManageResidentsController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageResidents", {
    templateUrl: "/ngApp/chtn/manager/manage-residents.html",
    controller: Ally.ManageResidentsController
});

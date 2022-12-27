var Ally;
(function (Ally) {
    /**
     * The controller for the page that lists group members
     */
    var GroupMembersController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupMembersController(fellowResidents, siteInfo, appCacheService, $http) {
            this.fellowResidents = fellowResidents;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.$http = $http;
            this.isLoading = true;
            this.isLoadingGroupEmails = false;
            this.isLoadingSaveEmailGroup = false;
            this.emailLists = [];
            this.customEmailList = [];
            this.unitPrefix = "Unit ";
            this.groupEmailDomain = "";
            this.shouldShowNewCustomEmailModal = false;
            this.allyAppName = AppConfig.appName;
            this.groupShortName = siteInfo.publicSiteInfo.shortName;
            this.showMemberList = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
            this.groupEmailDomain = "inmail." + AppConfig.baseTld;
            this.unitPrefix = AppConfig.appShortName === "condo" ? "Unit " : "";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupMembersController.prototype.$onInit = function () {
            var _this = this;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.fellowResidents.getByUnitsAndResidents().then(function (data) {
                _this.isLoading = false;
                _this.unitList = data.byUnit;
                _this.allResidents = data.residents;
                _this.committees = data.committees;
                if (!_this.allResidents && data.ptaMembers)
                    _this.allResidents = data.ptaMembers;
                // Sort by last name for member lists, first name otherwise
                if (_this.showMemberList)
                    _this.allResidents = _.sortBy(_this.allResidents, function (r) { return (r.lastName || "").toLowerCase(); });
                else
                    _this.allResidents = _.sortBy(_this.allResidents, function (r) { return (r.fullName || "").toLowerCase(); });
                _this.boardMembers = _.filter(_this.allResidents, function (r) { return r.boardPosition !== Ally.FellowResidentsService.BoardPos_None && r.boardPosition !== Ally.FellowResidentsService.BoardPos_PropertyManager; });
                _this.boardPropMgrs = _.filter(_this.allResidents, function (r) { return r.boardPosition === Ally.FellowResidentsService.BoardPos_PropertyManager; });
                _this.boardMessageRecipient = null;
                if (_this.boardMembers.length > 0) {
                    var hasBoardEmail = _.some(_this.boardMembers, function (m) { return m.hasEmail; });
                    if (hasBoardEmail) {
                        _this.boardMessageRecipient = {
                            fullName: "Entire Board",
                            firstName: "everyone on the board",
                            hasEmail: true,
                            userId: GroupMembersController.AllBoardUserId
                        };
                    }
                }
                // Remove board members from the member list
                if (AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club")
                    _this.allResidents = _.filter(_this.allResidents, function (r) { return r.boardPosition === 0; });
                var _loop_1 = function (i) {
                    _this.boardMembers[i].boardPositionName = _.find(Ally.FellowResidentsService.BoardPositionNames, function (bm) { return bm.id === _this.boardMembers[i].boardPosition; }).name;
                };
                for (var i = 0; i < _this.boardMembers.length; ++i) {
                    _loop_1(i);
                }
                _this.boardPropMgrs.forEach(function (bpm) { return bpm.boardPositionName = _.find(Ally.FellowResidentsService.BoardPositionNames, function (bm) { return bm.id === bpm.boardPosition; }).name; });
                var boardSortOrder = [
                    1,
                    64,
                    16,
                    2,
                    4,
                    8,
                    32
                ];
                _this.boardMembers = _.sortBy(_this.boardMembers, function (bm) {
                    var sortIndex = _.indexOf(boardSortOrder, bm.boardPosition);
                    if (sortIndex === -1)
                        sortIndex = 100;
                    return sortIndex;
                });
                var getEmails = function (memo, unit) {
                    Array.prototype.push.apply(memo, unit.owners);
                    return memo;
                };
                _this.allOwners = _.reduce(_this.unitList, getEmails, []);
                _this.allOwners = _.map(_.groupBy(_this.allOwners, function (resident) {
                    return resident.email;
                }), function (grouped) {
                    return grouped[0];
                });
                // Remove duplicates
                _this.allOwnerEmails = _.reduce(_this.allOwners, function (memo, owner) { if (HtmlUtil.isValidString(owner.email)) {
                    memo.push(owner.email);
                } return memo; }, []);
                if (_this.unitList && _this.unitList.length > 0)
                    _this.unitList = Ally.HtmlUtil2.smartSortStreetAddresses(_this.unitList, "name");
                if (_this.committees) {
                    // Only show committees with a contact person
                    //TWC - 10/19/18 - Show committees even without a contact person
                    //this.committees = _.reject( this.committees, c => !c.contactUser );
                    _this.committees = _.sortBy(_this.committees, function (c) { return c.committeeName.toLowerCase(); });
                }
                // If we should scroll to a specific home
                var scrollToUnitId = _this.appCacheService.getAndClear("scrollToUnitId");
                if (scrollToUnitId) {
                    var scrollToElemId_1 = "unit-id-" + scrollToUnitId;
                    setTimeout(function () {
                        document.getElementById(scrollToElemId_1).scrollIntoView();
                        $("#" + scrollToElemId_1).effect("pulsate", { times: 3 }, 2000);
                    }, 300);
                }
                // Populate the email name lists, delayed to help the page render faster
                setTimeout(function () { return _this.loadGroupEmails(); }, 500);
            }, function (httpErrorResponse) {
                alert("Failed to retrieve group members. Please let tech support know via the contact form in the bottom right.");
                console.log("Failed to retrieve group members: " + httpErrorResponse.data.exceptionMessage);
            });
        };
        GroupMembersController.prototype.updateMemberFilter = function () {
            //TODO
            var lowerFilter = (this.memberSearchTerm || '').toLowerCase();
            var filterSearchFiles = function (unitListing) {
                if ((unitListing.name || '').toLowerCase().indexOf(lowerFilter) !== -1)
                    return true;
                return false;
            };
            //this.searchFileList = _.filter( this.fullSearchFileList, filterSearchFiles );
        };
        GroupMembersController.prototype.loadGroupEmails = function () {
            var _this = this;
            this.hasMissingEmails = _.some(this.allResidents, function (r) { return !r.hasEmail; });
            this.groupEmailsLoadError = null;
            this.isLoadingGroupEmails = true;
            this.fellowResidents.getAllGroupEmails().then(function (emailGroups) {
                _this.isLoadingGroupEmails = false;
                _this.emailLists = emailGroups.standardGroups;
                _this.customEmailList = emailGroups.customGroups;
                // Populate custom group email names
                if (_this.customEmailList) {
                    for (var _i = 0, _a = _this.customEmailList; _i < _a.length; _i++) {
                        var curGroupEmail = _a[_i];
                        curGroupEmail.usersFullNames = curGroupEmail.members.map(function (e) { return _this.allResidents.find(function (r) { return r.userId === e.userId; }).fullName; });
                    }
                }
                // Hook up the address copy link
                setTimeout(function () {
                    var clipboard = new Clipboard(".clipboard-button");
                    clipboard.on("success", function (e) {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Copied!");
                        e.clearSelection();
                    });
                    clipboard.on("error", function (e) {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Auto-copy failed, press CTRL+C now");
                    });
                }, 750);
            }, function (httpResponse) {
                _this.isLoadingGroupEmails = false;
                _this.groupEmailsLoadError = "Failed to load group email addresses: " + httpResponse.data.exceptionMessage;
            });
        };
        /**
        * Called to open the model to create a new custom group email address
        */
        GroupMembersController.prototype.onAddNewCustomEmailGroup = function () {
            this.shouldShowNewCustomEmailModal = true;
            this.editGroupEmailInfo = new SaveEmailGroupInfo();
            this.allResidents.forEach(function (r) { return r.isAssociated = false; });
            window.setTimeout(function () { return document.getElementById("custom-group-email-short-name-text").focus(); }, 50);
        };
        /**
        * Called to toggle membership in a custom group email address
        */
        GroupMembersController.prototype.onGroupEmailMemberClicked = function (resident) {
            // Add the user ID if it's not already in the list, remove it if it is
            var existingMemberIdIndex = this.editGroupEmailInfo.memberUserIds.indexOf(resident.userId);
            if (existingMemberIdIndex === -1)
                this.editGroupEmailInfo.memberUserIds.push(resident.userId);
            else
                this.editGroupEmailInfo.memberUserIds.splice(existingMemberIdIndex, 1);
        };
        /**
        * Called to save a custom group email address
        */
        GroupMembersController.prototype.saveGroupEmailInfo = function () {
            var _this = this;
            this.isLoadingSaveEmailGroup = true;
            this.groupEmailSaveError = null;
            var onSave = function () {
                _this.isLoadingSaveEmailGroup = false;
                _this.shouldShowNewCustomEmailModal = false;
                _this.editGroupEmailInfo = null;
                // Refresh the emails, clear the cache first since we added a new group email address
                _this.fellowResidents.clearResidentCache();
                _this.loadGroupEmails();
            };
            var onError = function (httpResponse) {
                _this.isLoadingSaveEmailGroup = false;
                _this.groupEmailSaveError = "Failed to process your request: " + httpResponse.data.exceptionMessage;
            };
            if (this.editGroupEmailInfo.existingGroupEmailId)
                this.$http.put("/api/BuildingResidents/EditCustomGroupEmail", this.editGroupEmailInfo).then(onSave, onError);
            else
                this.$http.post("/api/BuildingResidents/NewCustomGroupEmail", this.editGroupEmailInfo).then(onSave, onError);
        };
        /**
        * Called when the user clicks the button to edit a custom group email address
        */
        GroupMembersController.prototype.editGroupEmail = function (groupEmail) {
            var _this = this;
            this.shouldShowNewCustomEmailModal = true;
            this.editGroupEmailInfo = new SaveEmailGroupInfo();
            this.editGroupEmailInfo.existingGroupEmailId = groupEmail.customGroupEmailId;
            this.editGroupEmailInfo.description = groupEmail.description;
            this.editGroupEmailInfo.shortName = groupEmail.shortName;
            this.editGroupEmailInfo.memberUserIds = groupEmail.members.map(function (m) { return m.userId; });
            this.allResidents.forEach(function (r) { return r.isAssociated = _this.editGroupEmailInfo.memberUserIds.indexOf(r.userId) !== -1; });
            window.setTimeout(function () { return document.getElementById("custom-group-email-short-name-text").focus(); }, 50);
        };
        /**
        * Called when the user clicks the button to delete a custom group email address
        */
        GroupMembersController.prototype.deleteGroupEmail = function (groupEmail) {
            var _this = this;
            if (!confirm("Are you sure you want to delete this group email address? Emails sent to this address will no longer be delivered."))
                return;
            this.isLoadingGroupEmails = true;
            this.$http.delete("/api/BuildingResidents/DeleteCustomGroupEmail/" + groupEmail.customGroupEmailId).then(function () {
                _this.isLoadingGroupEmails = false;
                // Refresh the emails, clear the cache first since we added a new email group
                _this.fellowResidents.clearResidentCache();
                _this.loadGroupEmails();
            }, function (httpResponse) {
                _this.isLoadingGroupEmails = false;
                _this.groupEmailSaveError = "Failed to process your request: " + httpResponse.data.exceptionMessage;
            });
        };
        GroupMembersController.$inject = ["fellowResidents", "SiteInfo", "appCacheService", "$http"];
        GroupMembersController.AllBoardUserId = "af615460-d92f-4878-9dfa-d5e4a9b1f488";
        return GroupMembersController;
    }());
    Ally.GroupMembersController = GroupMembersController;
    var SaveEmailGroupInfo = /** @class */ (function () {
        function SaveEmailGroupInfo() {
            this.memberUserIds = [];
        }
        return SaveEmailGroupInfo;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("groupMembers", {
    templateUrl: "/ngApp/chtn/member/group-members.html",
    controller: Ally.GroupMembersController
});

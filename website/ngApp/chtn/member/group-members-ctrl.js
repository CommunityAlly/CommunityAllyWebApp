var Ally;
(function (Ally) {
    /**
     * The controller for the page that lists group members
     */
    class GroupMembersController {
        /**
         * The constructor for the class
         */
        constructor(fellowResidents, siteInfo, appCacheService, $http) {
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
            this.isPremiumPlanActive = false;
            this.allyAppName = AppConfig.appName;
            this.groupShortName = siteInfo.publicSiteInfo.shortName;
            this.showMemberList = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
            this.groupEmailDomain = "inmail." + AppConfig.baseTld;
            this.unitPrefix = AppConfig.appShortName === "condo" ? "Unit " : "";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.fellowResidents.getByUnitsAndResidents().then((data) => {
                this.isLoading = false;
                this.unitList = data.byUnit;
                this.allResidents = data.residents;
                this.committees = data.committees;
                if (!this.allResidents && data.ptaMembers)
                    this.allResidents = data.ptaMembers;
                // Sort by last name for member lists, first name otherwise
                if (this.showMemberList)
                    this.allResidents = _.sortBy(this.allResidents, r => (r.lastName || "").toLowerCase());
                else
                    this.allResidents = _.sortBy(this.allResidents, r => (r.fullName || "").toLowerCase());
                this.boardMembers = _.filter(this.allResidents, (r) => r.boardPosition !== Ally.FellowResidentsService.BoardPos_None && r.boardPosition !== Ally.FellowResidentsService.BoardPos_PropertyManager);
                this.boardPropMgrs = _.filter(this.allResidents, (r) => r.boardPosition === Ally.FellowResidentsService.BoardPos_PropertyManager);
                this.boardMessageRecipient = null;
                if (this.boardMembers.length > 0) {
                    const hasBoardEmail = _.some(this.boardMembers, function (m) { return m.hasEmail; });
                    if (hasBoardEmail) {
                        this.boardMessageRecipient = {
                            fullName: "Entire Board",
                            firstName: "everyone on the board",
                            hasEmail: true,
                            userId: GroupMembersController.AllBoardUserId
                        };
                    }
                }
                // Remove board members from the member list
                if (AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club")
                    this.allResidents = _.filter(this.allResidents, function (r) { return r.boardPosition === 0; });
                for (let i = 0; i < this.boardMembers.length; ++i)
                    this.boardMembers[i].boardPositionName = _.find(Ally.FellowResidentsService.BoardPositionNames, (bm) => bm.id === this.boardMembers[i].boardPosition).name;
                this.boardPropMgrs.forEach(bpm => bpm.boardPositionName = _.find(Ally.FellowResidentsService.BoardPositionNames, (bm) => bm.id === bpm.boardPosition).name);
                const boardSortOrder = [
                    1,
                    64,
                    16,
                    2,
                    4,
                    8,
                    32
                ];
                this.boardMembers = _.sortBy(this.boardMembers, function (bm) {
                    let sortIndex = _.indexOf(boardSortOrder, bm.boardPosition);
                    if (sortIndex === -1)
                        sortIndex = 100;
                    return sortIndex;
                });
                const getEmails = function (memo, unit) {
                    Array.prototype.push.apply(memo, unit.owners);
                    return memo;
                };
                this.allOwners = _.reduce(this.unitList, getEmails, []);
                this.allOwners = _.map(_.groupBy(this.allOwners, function (resident) {
                    return resident.email;
                }), function (grouped) {
                    return grouped[0];
                });
                // Remove duplicates
                this.allOwnerEmails = _.reduce(this.allOwners, function (memo, owner) { if (HtmlUtil.isValidString(owner.email)) {
                    memo.push(owner.email);
                } return memo; }, []);
                if (this.unitList && this.unitList.length > 0)
                    this.unitList = Ally.HtmlUtil2.smartSortStreetAddresses(this.unitList, "name");
                if (this.committees) {
                    // Only show committees with a contact person
                    //TWC - 10/19/18 - Show committees even without a contact person
                    //this.committees = _.reject( this.committees, c => !c.contactUser );
                    this.committees = _.sortBy(this.committees, c => c.committeeName.toLowerCase());
                }
                // If we should scroll to a specific home
                const scrollToUnitId = this.appCacheService.getAndClear("scrollToUnitId");
                if (scrollToUnitId) {
                    const scrollToElemId = "unit-id-" + scrollToUnitId;
                    setTimeout(() => {
                        document.getElementById(scrollToElemId).scrollIntoView();
                        $("#" + scrollToElemId).effect("pulsate", { times: 3 }, 2000);
                    }, 300);
                }
                // Populate the email name lists, delayed to help the page render faster
                setTimeout(() => this.loadGroupEmails(), 500);
            }, (httpErrorResponse) => {
                alert("Failed to retrieve group members. Please let tech support know via the contact form in the bottom right.");
                console.log("Failed to retrieve group members: " + httpErrorResponse.data.exceptionMessage);
            });
        }
        updateMemberFilter() {
            //TODO
            const lowerFilter = (this.memberSearchTerm || '').toLowerCase();
            const filterSearchFiles = (unitListing) => {
                if ((unitListing.name || '').toLowerCase().indexOf(lowerFilter) !== -1)
                    return true;
                return false;
            };
            //this.searchFileList = _.filter( this.fullSearchFileList, filterSearchFiles );
        }
        loadGroupEmails() {
            this.hasMissingEmails = _.some(this.allResidents, function (r) { return !r.hasEmail; });
            this.groupEmailsLoadError = null;
            this.isLoadingGroupEmails = true;
            this.fellowResidents.getAllGroupEmails().then((emailGroups) => {
                this.isLoadingGroupEmails = false;
                this.emailLists = emailGroups.standardGroups;
                this.customEmailList = emailGroups.customGroups;
                // Populate custom group email names
                if (this.customEmailList) {
                    for (const curGroupEmail of this.customEmailList) {
                        curGroupEmail.usersFullNames = [];
                        for (const curGroupMember of curGroupEmail.members) {
                            const resident = this.allResidents.find(r => r.userId === curGroupMember.userId);
                            if (resident)
                                curGroupEmail.usersFullNames.push(resident.fullName);
                        }
                    }
                }
                // Hook up the address copy link
                setTimeout(function () {
                    const clipboard = new ClipboardJS(".clipboard-button");
                    clipboard.on("success", function (e) {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Copied!");
                        e.clearSelection();
                    });
                    clipboard.on("error", function (e) {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Auto-copy failed, press CTRL+C now");
                    });
                }, 750);
            }, (httpResponse) => {
                this.isLoadingGroupEmails = false;
                this.groupEmailsLoadError = "Failed to load group email addresses: " + httpResponse.data.exceptionMessage;
            });
        }
        /**
        * Called to open the model to create a new custom group email address
        */
        onAddNewCustomEmailGroup() {
            this.shouldShowNewCustomEmailModal = true;
            this.editGroupEmailInfo = new SaveEmailGroupInfo();
            this.allResidents.forEach(r => r.isAssociated = false);
            window.setTimeout(() => document.getElementById("custom-group-email-short-name-text").focus(), 50);
        }
        /**
        * Called to toggle membership in a custom group email address
        */
        onGroupEmailMemberClicked(resident) {
            // Add the user ID if it's not already in the list, remove it if it is
            const existingMemberIdIndex = this.editGroupEmailInfo.memberUserIds.indexOf(resident.userId);
            if (existingMemberIdIndex === -1)
                this.editGroupEmailInfo.memberUserIds.push(resident.userId);
            else
                this.editGroupEmailInfo.memberUserIds.splice(existingMemberIdIndex, 1);
        }
        /**
        * Called to save a custom group email address
        */
        saveCustomGroupEmailInfo() {
            this.isLoadingSaveEmailGroup = true;
            this.groupEmailSaveError = null;
            const onSave = () => {
                this.isLoadingSaveEmailGroup = false;
                this.shouldShowNewCustomEmailModal = false;
                this.editGroupEmailInfo = null;
                // Refresh the emails, clear the cache first since we added a new group email address
                this.fellowResidents.clearResidentCache();
                this.loadGroupEmails();
            };
            const onError = (httpResponse) => {
                this.isLoadingSaveEmailGroup = false;
                this.groupEmailSaveError = "Failed to process your request: " + httpResponse.data.exceptionMessage;
            };
            if (this.editGroupEmailInfo.existingGroupEmailId)
                this.$http.put("/api/BuildingResidents/EditCustomGroupEmail", this.editGroupEmailInfo).then(onSave, onError);
            else
                this.$http.post("/api/BuildingResidents/NewCustomGroupEmail", this.editGroupEmailInfo).then(onSave, onError);
        }
        /**
        * Called when the user clicks the button to edit a custom group email address
        */
        editCustomGroupEmail(groupEmail) {
            this.shouldShowNewCustomEmailModal = true;
            this.editGroupEmailInfo = new SaveEmailGroupInfo();
            this.editGroupEmailInfo.existingGroupEmailId = groupEmail.customGroupEmailId;
            this.editGroupEmailInfo.description = groupEmail.description;
            this.editGroupEmailInfo.shortName = groupEmail.shortName;
            this.editGroupEmailInfo.memberUserIds = groupEmail.members.map(m => m.userId);
            this.editGroupEmailInfo.allowPublicIncoming = groupEmail.allowPublicIncoming;
            this.allResidents.forEach(r => r.isAssociated = this.editGroupEmailInfo.memberUserIds.indexOf(r.userId) !== -1);
            window.setTimeout(() => document.getElementById("custom-group-email-short-name-text").focus(), 50);
        }
        /**
        * Called when the user clicks the button to delete a custom group email address
        */
        deleteGroupEmail(groupEmail) {
            if (!confirm("Are you sure you want to delete this group email address? Emails sent to this address will no longer be delivered."))
                return;
            this.isLoadingGroupEmails = true;
            this.$http.delete("/api/BuildingResidents/DeleteCustomGroupEmail/" + groupEmail.customGroupEmailId).then(() => {
                this.isLoadingGroupEmails = false;
                // Refresh the emails, clear the cache first since we added a new email group
                this.fellowResidents.clearResidentCache();
                this.loadGroupEmails();
            }, (httpResponse) => {
                this.isLoadingGroupEmails = false;
                this.groupEmailSaveError = "Failed to process your request: " + httpResponse.data.exceptionMessage;
            });
        }
    }
    GroupMembersController.$inject = ["fellowResidents", "SiteInfo", "appCacheService", "$http"];
    GroupMembersController.AllBoardUserId = "af615460-d92f-4878-9dfa-d5e4a9b1f488";
    Ally.GroupMembersController = GroupMembersController;
    class SaveEmailGroupInfo {
        constructor() {
            this.memberUserIds = [];
        }
    }
})(Ally || (Ally = {}));
CA.angularApp.component("groupMembers", {
    templateUrl: "/ngApp/chtn/member/group-members.html",
    controller: Ally.GroupMembersController
});

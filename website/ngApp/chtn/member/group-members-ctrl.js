var Ally;
(function (Ally) {
    var CommitteeListingInfo = /** @class */ (function () {
        function CommitteeListingInfo() {
        }
        return CommitteeListingInfo;
    }());
    /**
     * The controller for the page that lists group members
     */
    var GroupMembersController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupMembersController(fellowResidents, siteInfo) {
            this.fellowResidents = fellowResidents;
            this.siteInfo = siteInfo;
            this.isLoading = true;
            this.emailLists = [];
            this.allyAppName = AppConfig.appName;
            this.groupShortName = HtmlUtil.getSubdomain();
            this.showMemberList = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupMembersController.prototype.$onInit = function () {
            var _this = this;
            this.fellowResidents.getByUnitsAndResidents().then(function (data) {
                _this.isLoading = false;
                _this.unitList = data.byUnit;
                _this.allResidents = data.residents;
                _this.committees = data.committees;
                // Sort by last name
                _this.allResidents = _.sortBy(_this.allResidents, function (r) { return r.lastName; });
                _this.boardMembers = _.filter(data.residents, function (r) { return r.boardPosition !== 0; });
                _this.boardMessageRecipient = null;
                if (_this.boardMembers.length > 0) {
                    var hasBoardEmail = _.some(_this.boardMembers, function (m) { return m.hasEmail; });
                    if (hasBoardEmail) {
                        _this.boardMessageRecipient = {
                            fullName: "Entire Board",
                            firstName: "everyone on the board",
                            hasEmail: true,
                            userId: "af615460-d92f-4878-9dfa-d5e4a9b1f488"
                        };
                    }
                }
                // Remove board members from the member list
                if (AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club")
                    _this.allResidents = _.filter(_this.allResidents, function (r) { return r.boardPosition === 0; });
                var boardPositionNames = [
                    { id: 0, name: "None" },
                    { id: 1, name: "President" },
                    { id: 2, name: "Treasurer" },
                    { id: 4, name: "Secretary" },
                    { id: 8, name: "Director" },
                    { id: 16, name: "Vice President" },
                    { id: 32, name: "Property Manager" }
                ];
                for (var i = 0; i < _this.boardMembers.length; ++i) {
                    _this.boardMembers[i].boardPositionName = _.find(boardPositionNames, function (bm) { return bm.id === _this.boardMembers[i].boardPosition; }).name;
                }
                var boardSortOrder = [
                    1,
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
                var useNumericNames = _.every(_this.unitList, function (u) { return HtmlUtil.isNumericString(u.name); });
                if (useNumericNames)
                    _this.unitList = _.sortBy(_this.unitList, function (u) { return +u.name; });
                // Populate the e-mail name lists
                _this.setupGroupEmails();
            });
        };
        GroupMembersController.prototype.setupGroupEmails = function () {
            var _this = this;
            this.hasMissingEmails = _.some(this.allResidents, function (r) { return !r.hasEmail; });
            var innerThis = this;
            this.fellowResidents.getGroupEmailObject().then(function (emailLists) {
                _this.emailLists = emailLists;
                // Hook up the address copy link
                setTimeout(function () {
                    var clipboard = new Clipboard(".clipboard-button");
                    var showTooltip = function (element, text) {
                        $(element).qtip({
                            style: {
                                classes: 'qtip-light qtip-shadow'
                            },
                            position: {
                                my: "leftMiddle",
                                at: "rightMiddle"
                            },
                            content: { text: text },
                            events: {
                                hide: function (e) {
                                    $(e.originalEvent.currentTarget).qtip("destroy");
                                }
                            }
                        });
                        $(element).qtip("show");
                    };
                    clipboard.on("success", function (e) {
                        showTooltip(e.trigger, "Copied!");
                        e.clearSelection();
                    });
                    clipboard.on("error", function (e) {
                        showTooltip(e.trigger, "Auto-copy failed, press CTRL+C now");
                    });
                }, 750);
            });
        };
        GroupMembersController.$inject = ["fellowResidents", "SiteInfo"];
        return GroupMembersController;
    }());
    Ally.GroupMembersController = GroupMembersController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupMembers", {
    templateUrl: "/ngApp/chtn/member/group-members.html",
    controller: Ally.GroupMembersController
});

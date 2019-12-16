var Ally;
(function (Ally) {
    /**
     * The controller for the page that lists group members
     */
    var GroupMembersController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupMembersController(fellowResidents, siteInfo, appCacheService) {
            this.fellowResidents = fellowResidents;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.isLoading = true;
            this.emailLists = [];
            this.unitPrefix = "Unit ";
            this.groupEmailDomain = "";
            this.allyAppName = AppConfig.appName;
            this.groupShortName = HtmlUtil.getSubdomain();
            this.showMemberList = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
            this.groupEmailDomain = "inmail." + AppConfig.baseTld;
            this.unitPrefix = AppConfig.appShortName === "condo" ? "Unit " : "";
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
                if (!_this.allResidents && data.ptaMembers)
                    _this.allResidents = data.ptaMembers;
                // Sort by last name
                _this.allResidents = _.sortBy(_this.allResidents, function (r) { return r.lastName; });
                _this.boardMembers = _.filter(_this.allResidents, function (r) { return r.boardPosition !== 0; });
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
                for (var i = 0; i < _this.boardMembers.length; ++i) {
                    _this.boardMembers[i].boardPositionName = _.find(Ally.FellowResidentsService.BoardPositionNames, function (bm) { return bm.id === _this.boardMembers[i].boardPosition; }).name;
                }
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
                if (_this.unitList && _this.unitList.length > 0) {
                    var useNumericNames = _.every(_this.unitList, function (u) { return HtmlUtil.isNumericString(u.name); });
                    if (useNumericNames)
                        _this.unitList = _.sortBy(_this.unitList, function (u) { return +u.name; });
                    else {
                        var firstSuffix = _this.unitList[0].name.substr(_this.unitList[0].name.indexOf(" "));
                        var allHaveSameSuffix = _.every(_this.unitList, function (u) { return HtmlUtil.endsWith(u.name, firstSuffix); });
                        if (allHaveSameSuffix) {
                            _this.unitList = _.sortBy(_this.unitList, function (u) { return parseInt(u.name.substr(0, u.name.indexOf(" "))); });
                        }
                    }
                }
                if (_this.committees) {
                    // Only show commitees with a contact person
                    //TWC - 10/19/18 - Show committees even without a contact person
                    //this.committees = _.reject( this.committees, c => !c.contactUser );
                    _this.committees = _.sortBy(_this.committees, function (c) { return c.committeeName.toLowerCase(); });
                }
                // If we should scroll to a specific home
                var scrollToUnitId = _this.appCacheService.getAndClear("scrollToUnitId");
                if (scrollToUnitId) {
                    var scrollToElemId = "unit-id-" + scrollToUnitId;
                    setTimeout(function () {
                        document.getElementById(scrollToElemId).scrollIntoView();
                        $("#" + scrollToElemId).effect("pulsate", { times: 3 }, 2000);
                    }, 300);
                }
                // Populate the e-mail name lists
                _this.setupGroupEmails();
            });
        };
        GroupMembersController.prototype.updateMemberFilter = function () {
            var lowerFilter = angular.lowercase(this.memberSearchTerm) || '';
            var filterSearchFiles = function (unitListing) {
                if (angular.lowercase(unitListing.name || '').indexOf(lowerFilter) !== -1)
                    return true;
                return false;
                //if( _.any(unitListing.owners) )
                //return angular.lowercase( unitListing.name || '' ).indexOf( lowerFilter ) !== -1
                //    || angular.lowercase( file.uploadDateString || '' ).indexOf( lowerFilter ) !== -1
                //    || angular.lowercase( file.uploaderFullName || '' ).indexOf( lowerFilter ) !== -1;
            };
            //this.searchFileList = _.filter( this.fullSearchFileList, filterSearchFiles );
            //setTimeout( function()
            //{
            //    // Force redraw of the document. Not sure why, but the file list disappears on Chrome
            //    var element = document.getElementById( "documents-area" );
            //    var disp = element.style.display;
            //    element.style.display = 'none';
            //    var trick = element.offsetHeight;
            //    element.style.display = disp;
            //}, 50 );
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
                    clipboard.on("success", function (e) {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Copied!");
                        e.clearSelection();
                    });
                    clipboard.on("error", function (e) {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Auto-copy failed, press CTRL+C now");
                    });
                }, 750);
            });
        };
        GroupMembersController.$inject = ["fellowResidents", "SiteInfo", "appCacheService"];
        return GroupMembersController;
    }());
    Ally.GroupMembersController = GroupMembersController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupMembers", {
    templateUrl: "/ngApp/chtn/member/group-members.html",
    controller: Ally.GroupMembersController
});

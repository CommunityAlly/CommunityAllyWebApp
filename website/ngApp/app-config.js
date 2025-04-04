function RoutePath(path, templateUrl, controller, menuTitle, role = null) {
    if (path[0] !== '/')
        path = "/" + path;
    this.path = path;
    this.templateUrl = templateUrl;
    this.controller = controller;
    this.menuTitle = menuTitle;
    this.role = role || Role_Authorized;
    // authorized, all, manager, admin
    this.controllerAs = typeof controller === "function" ? "vm" : null;
}
function RoutePath_v2(routeOptions) {
    if (routeOptions.path[0] !== '/')
        routeOptions.path = "/" + routeOptions.path;
    this.path = routeOptions.path;
    this.templateUrl = routeOptions.templateUrl;
    this.templateHtml = routeOptions.templateHtml;
    this.controller = routeOptions.controller;
    this.menuTitle = routeOptions.menuTitle;
    this.role = routeOptions.role || Role_Authorized;
    // authorized, all, manager, admin
    this.controllerAs = typeof routeOptions.controller === "function" ? "vm" : null;
}
var Ally;
(function (Ally) {
    class RouteOptions_v3 {
    }
    Ally.RouteOptions_v3 = RouteOptions_v3;
    // For use with the newer Angular component objects
    class RoutePath_v3 {
        constructor(routeOptions) {
            this.reloadOnSearch = true;
            if (routeOptions.path[0] !== '/')
                routeOptions.path = "/" + routeOptions.path;
            this.path = routeOptions.path;
            this.templateHtml = routeOptions.templateHtml;
            this.menuTitle = routeOptions.menuTitle;
            this.role = routeOptions.role || Role_Authorized;
            this.reloadOnSearch = routeOptions.reloadOnSearch === undefined ? false : routeOptions.reloadOnSearch;
            this.pageTitle = routeOptions.pageTitle;
        }
    }
    Ally.RoutePath_v3 = RoutePath_v3;
    class AppConfigInfo {
    }
    AppConfigInfo.dwollaPreviewShortNames = ["qa", "dwollademo", "dwollademo1", "900wainslie", "elingtonvillagepoa"];
    AppConfigInfo.dwollaEnvironmentName = "prod";
    AppConfigInfo.localNewsAllyDomain = "https://localnewsally2-h7fccdagf6cmdub8.northcentralus-01.azurewebsites.net/";
    Ally.AppConfigInfo = AppConfigInfo;
    class PeriodicPaymentFrequency {
    }
    Ally.PeriodicPaymentFrequency = PeriodicPaymentFrequency;
})(Ally || (Ally = {}));
var Role_Authorized = "authorized";
var Role_All = "all";
var Role_Manager = "manager";
var Role_Admin = "admin";
// The names need to match the PeriodicPaymentFrequency enum
var PeriodicPaymentFrequencies = [
    { name: "Monthly", intervalName: "month", id: 50, signUpNote: "Billed on the 1st of each month" },
    { name: "Quarterly", intervalName: "quarter", id: 51, signUpNote: "Billed on January 1, April 1, July 1, October 1" },
    { name: "Semiannually", intervalName: "half-year", id: 52, signUpNote: "Billed on January 1 and July 1" },
    { name: "Annually", intervalName: "year", id: 53, signUpNote: "Billed on January 1" }
];
function FrequencyIdToInfo(frequencyId) {
    if (isNaN(frequencyId) || frequencyId < 50)
        return null;
    return PeriodicPaymentFrequencies[frequencyId - 50];
}
function GetLongPayPeriodNames(intervalName) {
    if (intervalName === "month") {
        return ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
    }
    else if (intervalName === "quarter") {
        return ["Q1", "Q2", "Q3", "Q4"];
    }
    else if (intervalName === "half-year") {
        return ["First Half", "Second Half"];
    }
    return null;
}
function GetShortPayPeriodNames(intervalName) {
    if (intervalName === "month") {
        return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    }
    else if (intervalName === "quarter") {
        return ["Q1", "Q2", "Q3", "Q4"];
    }
    else if (intervalName === "half-year") {
        return ["1st Half", "2nd Half"];
    }
    return null;
}
///////////////////////////////////////////////////////////////////////////////////////////////////
// Condo Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
const CondoAllyAppConfig = {
    appShortName: "condo",
    appName: "Condo Ally",
    baseTld: "condoally.com",
    baseUrl: "https://condoally.com/",
    isChtnSite: true,
    homeName: "Unit",
    memberTypeLabel: "Resident",
    menu: [
        // Member-only pages
        new Ally.RoutePath_v3({ path: "Home", templateHtml: "<chtn-home></chtn-home>", menuTitle: "Home" }),
        new Ally.RoutePath_v3({ path: "Home/DiscussionThread/:discussionThreadId", templateHtml: "<chtn-home></chtn-home>", pageTitle: "Discussion Thread" }),
        new Ally.RoutePath_v3({ path: "Info/Docs", templateHtml: "<association-info></association-info>", menuTitle: "Documents & Info", reloadOnSearch: false, pageTitle: "Documents" }),
        new Ally.RoutePath_v3({ path: "Info/:viewName", templateHtml: "<association-info></association-info>", pageTitle: "Info" }),
        new Ally.RoutePath_v3({ path: "Logbook", templateHtml: "<logbook-page></logbook-page>" }),
        new Ally.RoutePath_v3({ path: "Calendar", templateHtml: "<logbook-page></logbook-page>", menuTitle: "Calendar" }),
        new Ally.RoutePath_v3({ path: "Map", templateHtml: "<chtn-map></chtn-map>", menuTitle: "Map" }),
        new Ally.RoutePath_v3({ path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Directory" }),
        new Ally.RoutePath_v3({ path: "Committee/:committeeId/:viewName", templateHtml: "<committee-parent></committee-parent>", pageTitle: "Committee" }),
        new Ally.RoutePath_v3({ path: "Committee/:committeeId/Home/DiscussionThread/:discussionThreadId", templateHtml: "<committee-parent></committee-parent>" }),
        new Ally.RoutePath_v3({ path: "EmailChangeConfirm/:emailChangeId", templateHtml: "<email-change-confirm></email-change-confirm>" }),
        new Ally.RoutePath_v3({ path: "MyProfile", templateHtml: "<my-profile></my-profile>", pageTitle: "My Profile" }),
        // Public pages
        new Ally.RoutePath_v3({ path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All, pageTitle: "Forgot Password" }),
        new Ally.RoutePath_v3({ path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All, pageTitle: "Login" }),
        new Ally.RoutePath_v3({ path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All, pageTitle: "Help" }),
        new Ally.RoutePath_v3({ path: "SignUp", templateHtml: "<condo-sign-up-wizard></condo-sign-up-wizard>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "EmailAbuse/:idValue", templateHtml: "<email-abuse></email-abuse>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "DiscussionManage/:idValue", templateHtml: "<discussion-manage></discussion-manage>" }),
        new Ally.RoutePath_v3({ path: "NeighborSignUp", templateHtml: "<neighbor-sign-up></neighbor-sign-up>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "GroupRedirect/:appName/:shortName", templateHtml: "<group-redirect></group-redirect>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "MemberSignUp", templateHtml: "<pending-member-sign-up></pending-member-sign-up>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "Page/:slug", templateHtml: "<custom-page-view></custom-page-view>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "CollectiveCounponTest", templateHtml: "<collective-coupon-detail></collective-coupon-detail>", menuTitle: null, role: Role_All }),
        // Manager pages
        new Ally.RoutePath_v3({ path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Residents", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "ManageCommittees", templateHtml: "<manage-committees></manage-committees>", menuTitle: "Committees", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "ManagePolls", templateHtml: "<manage-polls></manage-polls>", menuTitle: "Polls/Voting", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Financials/OnlinePayments", templateHtml: "<financial-parent></financial-parent>", menuTitle: "Financials", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Financials/StripeLinkRefresh", templateHtml: "<stripe-link-refresh></stripe-link-refresh>", role: Role_Manager }),
        //new Ally.RoutePath_v3( { path: "ManagePayments", templateHtml: "<div class='page'><div>Heads up! This page has moved to Manage -> Financials -> Online Payments. We will be removing this menu item soon.</div></div>", menuTitle: "Online Payments", role: Role_Manager } ),
        //new Ally.RoutePath_v3( { path: "AssessmentHistory", templateHtml: "<div class='page'><div>Heads up! This page has moved to Manage -> Financials -> Assessment History. We will be removing this menu item soon.</div></div>", menuTitle: "Assessment History", role: Role_Manager } ),
        new Ally.RoutePath_v3({ path: "Mailing/Invoice", templateHtml: "<mailing-parent></mailing-parent>", menuTitle: "Mailing/Invoices", role: Role_Manager, pageTitle: "Send Invoice" }),
        new Ally.RoutePath_v3({ path: "ManageCustomPages", templateHtml: "<manage-custom-pages></manage-custom-pages>", menuTitle: "Custom Pages", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Mailing/:viewName", templateHtml: "<mailing-parent></mailing-parent>", role: Role_Manager, pageTitle: "Mailing" }),
        new Ally.RoutePath_v3({ path: "Settings/SiteSettings", templateHtml: "<settings-parent></settings-parent>", menuTitle: "Settings", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Settings/:viewName", templateHtml: "<settings-parent></settings-parent>", role: Role_Manager, pageTitle: "Settings" }),
        new Ally.RoutePath_v3({ path: "Financials/:viewName", templateHtml: "<financial-parent></financial-parent>", role: Role_Manager, pageTitle: "Financials" }),
        new Ally.RoutePath_v3({ path: "GroupAmenities", templateHtml: "<group-amenities></group-amenities>", role: Role_Manager, pageTitle: "Survey" }),
        new Ally.RoutePath_v3({ path: "Admin/ManageGroups", templateHtml: "<manage-groups></manage-groups>", menuTitle: "All Groups", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "Admin/ManageHomes", templateHtml: "<manage-homes></manage-homes>", menuTitle: "Homes", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "Activity Log", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "Admin/ManageAddressPolys", templateHtml: "<manage-address-polys></manage-address-polys>", menuTitle: "View Groups on Map", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "Admin/ViewPolys", templateHtml: "<view-polys></view-polys>", menuTitle: "View Polygons", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "Admin/ViewResearch", templateHtml: "<view-research></view-research>", menuTitle: "View Research", role: Role_Admin }),
    ]
};
///////////////////////////////////////////////////////////////////////////////////////////////////
// Neighborhood Watch Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
//const WatchAppConfig: Ally.AppConfigInfo =
//{
//    appShortName: "watch",
//    appName: "Neighborhood Watch Ally",
//    baseTld: "watchally.org",
//    baseUrl: "https://watchally.org/",
//    menu: [
//        new RoutePath( "Home", "/ngApp/watch/member/WatchHome.html", WatchHomeCtrl, "Home" ),
//        new RoutePath( "Members", "/ngApp/watch/member/WatchMembers.html", WatchMembersCtrl, "Members" ),
//        new RoutePath( "Calendar", "/ngApp/watch/member/WatchCalendar.html", WatchCalendarCtrl, "Calendar" ),
//        new Ally.RoutePath_v3( { path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All } ),
//        new Ally.RoutePath_v3( { path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All } ),
//        new Ally.RoutePath_v3( { path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All } ),
//        new Ally.RoutePath_v3( { path: "MyProfile", templateHtml: "<my-profile></my-profile>" } ),
//        new RoutePath( "ManageMembers", "/ngApp/watch/manager/ManageMembers.html", ManageMembersCtrl, "Members", Role_Manager ),
//        new RoutePath( "Settings", "/ngApp/watch/manager/Settings.html", WatchSettingsCtrl, "Settings", Role_Manager ),
//        new RoutePath( "/Admin/ManageWatchGroups", "/ngApp/Admin/ManageAssociations.html", "ManageAssociationsController", "Manage Groups", Role_Admin ),
//        new Ally.RoutePath_v3( { path: "/Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "View Activity Log", role: Role_Admin } ),
//        new Ally.RoutePath_v3( { path: "/Admin/ManageAddressPolys", templateHtml: "<manage-address-polys></manage-address-polys>", menuTitle: "Edit Addresses", role: Role_Admin } ),
//    ]
//};
///////////////////////////////////////////////////////////////////////////////////////////////////
// Service Professional Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
//const ServiceAppConfig: Ally.AppConfigInfo =
//{
//    appShortName: "service",
//    appName: "Service Professional Ally",
//    baseTld: "serviceally.org",
//    baseUrl: "https://serviceally.org/",
//    menu: [
//        new RoutePath( "Jobs", "/ngApp/service/Jobs.html", ServiceJobsCtrl, "Jobs" ),
//        new RoutePath( "BusinessInfo", "/ngApp/service/BusinessInfo.html", ServiceBusinessInfoCtrl, "Business Info" ),
//        new RoutePath( "Banking", "/ngApp/service/BankInfo.html", ServiceBankInfoCtrl, "Banking" ),
//        new Ally.RoutePath_v3( { path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All } ),
//        new Ally.RoutePath_v3( { path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All } ),
//        new Ally.RoutePath_v3( { path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All } ),
//        new Ally.RoutePath_v3( { path: "MyProfile", templateHtml: "<my-profile></my-profile>" } ),
//        new Ally.RoutePath_v3( { path: "/Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "View Activity Log", role: Role_Admin } ),
//    ]
//};
///////////////////////////////////////////////////////////////////////////////////////////////////
// Home Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
const HomeAppConfig = {
    appShortName: "home",
    appName: "Home Ally",
    baseTld: "homeally.org",
    baseUrl: "https://homeally.org/",
    isChtnSite: false,
    homeName: "Home",
    memberTypeLabel: "User",
    menu: [
        //new RoutePath_v2( { path: "ToDo", templateUrl: "/ngApp/home/ToDos.html", controller: ServiceJobsCtrl, menuTitle: "Jobs" } ),
        new Ally.RoutePath_v3({ path: "SignUp", templateHtml: "<home-sign-up></home-sign-up>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "CPView/:slug", templateHtml: "<custom-page-view></custom-page-view>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "MyProfile", templateHtml: "<my-profile></my-profile>" }),
        new Ally.RoutePath_v3({ path: "Home", templateHtml: "<home-group-home></home-group-home>", menuTitle: "Home" }),
        new Ally.RoutePath_v3({ path: "Info/Docs", templateHtml: "<association-info></association-info>", menuTitle: "Documents & Info" }),
        new Ally.RoutePath_v3({ path: "Info/:viewName", templateHtml: "<association-info></association-info>" }),
        new Ally.RoutePath_v3({ path: "Logbook", templateHtml: "<logbook-page></logbook-page>" }),
        new Ally.RoutePath_v3({ path: "Calendar", templateHtml: "<logbook-page></logbook-page>", menuTitle: "Calendar" }),
        new Ally.RoutePath_v3({ path: "Users", templateHtml: "<home-users></home-users>", menuTitle: "Users", role: Role_Manager }),
        //new Ally.RoutePath_v3( { path: "Map", templateHtml: "<chtn-map></chtn-map>", menuTitle: "Map" } ),
        new Ally.RoutePath_v3({ path: "Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "View Activity Log", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "HomeSignUp", templateHtml: "<neighbor-sign-up></neighbor-sign-up>", role: Role_All })
    ]
};
///////////////////////////////////////////////////////////////////////////////////////////////////
// HOA Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
const HOAAppConfig = _.clone(CondoAllyAppConfig);
HOAAppConfig.appShortName = "hoa";
HOAAppConfig.appName = "HOA Ally";
HOAAppConfig.baseTld = "hoaally.org";
HOAAppConfig.baseUrl = "https://hoaally.org/";
HOAAppConfig.homeName = "Home";
HOAAppConfig.menu.push(new Ally.RoutePath_v3({ path: "HoaSignUp", templateHtml: "<hoa-sign-up-wizard></hoa-sign-up-wizard>", role: Role_All }));
///////////////////////////////////////////////////////////////////////////////////////////////////
// Neighborhood Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
const NeighborhoodAppConfig = _.clone(CondoAllyAppConfig);
NeighborhoodAppConfig.appShortName = "neighborhood";
NeighborhoodAppConfig.appName = "Neighborhood Ally";
NeighborhoodAppConfig.baseTld = "neighborhoodally.org";
NeighborhoodAppConfig.baseUrl = "https://neighborhoodally.org/";
NeighborhoodAppConfig.homeName = "Home";
// Remove Residents and Manage Residents
NeighborhoodAppConfig.menu = _.reject(NeighborhoodAppConfig.menu, function (mi) { return mi.menuTitle === "Residents" || mi.menuTitle === "Directory"; });
// Add them back under the name "Members"
NeighborhoodAppConfig.menu.push(new Ally.RoutePath_v3({ path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Members" }));
NeighborhoodAppConfig.menu.splice(0, 0, new Ally.RoutePath_v3({ path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Members", role: Role_Manager }));
// Remove assessment history and add dues history
NeighborhoodAppConfig.menu = _.reject(NeighborhoodAppConfig.menu, function (mi) { return mi.menuTitle === "Assessment History"; });
NeighborhoodAppConfig.menu.splice(3, 0, new Ally.RoutePath_v3({ path: "DuesHistory", menuTitle: "Dues History", templateHtml: "<dues-history></dues-history>", role: Role_Manager }));
NeighborhoodAppConfig.menu.push(new Ally.RoutePath_v3({ path: "NeighborhoodSignUp", templateHtml: "<neighborhood-sign-up-wizard></neighborhood-sign-up-wizard>", role: Role_All }));
//NeighborhoodAppConfig.menu.push( new Ally.RoutePath_v3( { path: "MemberSignUp", templateHtml: "<pending-member-sign-up></pending-member-sign-up>", role: Role_All } ) );
///////////////////////////////////////////////////////////////////////////////////////////////////
// Block Club Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
const BlockClubAppConfig = _.clone(CondoAllyAppConfig);
BlockClubAppConfig.appShortName = "block-club";
BlockClubAppConfig.appName = "Block Club Ally";
BlockClubAppConfig.baseTld = "blockclubally.org";
BlockClubAppConfig.baseUrl = "https://blockclubally.org/";
BlockClubAppConfig.homeName = "Home";
BlockClubAppConfig.memberTypeLabel = "Member";
// Remove Residents and Manage Residents
BlockClubAppConfig.menu = _.reject(BlockClubAppConfig.menu, function (mi) { return mi.menuTitle === "Residents" || mi.menuTitle === "Directory"; });
// Add them back under the name "Members"
BlockClubAppConfig.menu.push(new Ally.RoutePath_v3({ path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Members" }));
BlockClubAppConfig.menu.splice(0, 0, new Ally.RoutePath_v3({ path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Members", role: Role_Manager }));
// Remove assessment history and add dues history
BlockClubAppConfig.menu = _.reject(BlockClubAppConfig.menu, function (mi) { return mi.menuTitle === "Assessment History"; });
BlockClubAppConfig.menu.splice(3, 0, new Ally.RoutePath_v3({ path: "AssessmentHistory", menuTitle: "Membership Dues History", templateHtml: "<assessment-history></assessment-history>", role: Role_Manager }));
BlockClubAppConfig.menu.push(new Ally.RoutePath_v3({ path: "NeighborhoodSignUp", templateHtml: "<neighborhood-sign-up-wizard></neighborhood-sign-up-wizard>", role: Role_All }));
//BlockClubAppConfig.menu.push( new Ally.RoutePath_v3( { path: "MemberSignUp", templateHtml: "<pending-member-sign-up></pending-member-sign-up>", role: Role_All } ) );
///////////////////////////////////////////////////////////////////////////////////////////////////
// PTA Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
const PtaAppConfig = _.clone(CondoAllyAppConfig);
PtaAppConfig.appShortName = "pta";
PtaAppConfig.appName = "PTA Ally";
PtaAppConfig.baseTld = "ptaally.org";
PtaAppConfig.baseUrl = "https://ptaally.org/";
PtaAppConfig.isChtnSite = false;
PtaAppConfig.homeName = "Home";
PtaAppConfig.memberTypeLabel = "Member";
PtaAppConfig.menu = [
    new Ally.RoutePath_v3({ path: "Home", templateHtml: "<chtn-home></chtn-home>", menuTitle: "Home" }),
    new Ally.RoutePath_v3({ path: "Info/Docs", templateHtml: "<association-info></association-info>", menuTitle: "Documents & Info" }),
    new Ally.RoutePath_v3({ path: "Info/:viewName", templateHtml: "<association-info></association-info>" }),
    new Ally.RoutePath_v3({ path: "Logbook", templateHtml: "<logbook-page></logbook-page>" }),
    new Ally.RoutePath_v3({ path: "Calendar", templateHtml: "<logbook-page></logbook-page>", menuTitle: "Calendar" }),
    //new Ally.RoutePath_v3( { path: "Map", templateHtml: "<chtn-map></chtn-map>", menuTitle: "Map" } ),
    new Ally.RoutePath_v3({ path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Members" }),
    new Ally.RoutePath_v3({ path: "Committee/:committeeId/:viewName", templateHtml: "<committee-parent></committee-parent>" }),
    new Ally.RoutePath_v3({ path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All }),
    new Ally.RoutePath_v3({ path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All }),
    new Ally.RoutePath_v3({ path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All }),
    new Ally.RoutePath_v3({ path: "MemberSignUp", templateHtml: "<pending-member-sign-up></pending-member-sign-up>", menuTitle: null, role: Role_All }),
    new Ally.RoutePath_v3({ path: "MyProfile", templateHtml: "<my-profile></my-profile>" }),
    new Ally.RoutePath_v3({ path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Members", role: Role_Manager }),
    new Ally.RoutePath_v3({ path: "ManageCommittees", templateHtml: "<manage-committees></manage-committees>", menuTitle: "Committees", role: Role_Manager }),
    new Ally.RoutePath_v3({ path: "ManagePolls", templateHtml: "<manage-polls></manage-polls>", menuTitle: "Polls/Voting", role: Role_Manager }),
    //new Ally.RoutePath_v3( { path: "ManagePayments", templateHtml: "<manage-payments></manage-payments>", menuTitle: "Online Payments", role: Role_Manager } ),
    new Ally.RoutePath_v3({ path: "AssessmentHistory", templateHtml: "<assessment-history></assessment-history>", menuTitle: "Membership Dues History", role: Role_Manager }),
    new Ally.RoutePath_v3({ path: "Settings", templateHtml: "<chtn-settings></chtn-settings>", menuTitle: "Settings", role: Role_Manager }),
    new Ally.RoutePath_v3({ path: "Admin/ManageGroups", templateHtml: "<manage-groups></manage-groups>", menuTitle: "All Groups", role: Role_Admin }),
    new Ally.RoutePath_v3({ path: "Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "Activity Log", role: Role_Admin }),
    new Ally.RoutePath_v3({ path: "Admin/ManageAddressPolys", templateHtml: "<manage-address-polys></manage-address-polys>", menuTitle: "View Groups on Map", role: Role_Admin }),
    new Ally.RoutePath_v3({ path: "PtaSignUp", templateHtml: "<neighbor-sign-up></neighbor-sign-up>", role: Role_All })
];
var AppConfig = null;
let lowerDomain = document.domain.toLowerCase();
if (!HtmlUtil.isNullOrWhitespace(OverrideOriginalUrl) || lowerDomain === "localhost")
    lowerDomain = OverrideOriginalUrl;
if (!lowerDomain)
    console.log("Unable to find domain, make sure to set OverrideBaseApiPath and OverrideOriginalUrl at the top of ally-app.ts");
if (lowerDomain.indexOf("condo") !== -1)
    AppConfig = CondoAllyAppConfig;
//else if( lowerDomain.indexOf( "watchally" ) !== -1 )
//    AppConfig = WatchAppConfig;
//else if( lowerDomain.indexOf( "serviceally" ) !== -1 )
//    AppConfig = ServiceAppConfig;
else if (lowerDomain.indexOf("homeally") !== -1
    || lowerDomain.indexOf("helloathome") !== -1)
    AppConfig = HomeAppConfig;
else if (lowerDomain.indexOf("hoa") !== -1)
    AppConfig = HOAAppConfig;
else if (lowerDomain.indexOf("neighborhoodally") !== -1
    || lowerDomain.indexOf("helloneighborhood") !== -1)
    AppConfig = NeighborhoodAppConfig;
else if (lowerDomain.indexOf("chicagoblock") !== -1
    || lowerDomain.indexOf("blockclub") !== -1)
    AppConfig = BlockClubAppConfig;
else if (lowerDomain.indexOf("ptaally") !== -1)
    AppConfig = PtaAppConfig;
else {
    console.log("Unknown ally app");
    AppConfig = CondoAllyAppConfig;
}
// No changes should be made to the config object
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
// Commented out because this appears to break route navigation. I'm wondering if AngularJS's
// router is trying to modify something on the controller object on the menu items.
// Object.freeze( AppConfig );
// This is redundant due to how JS works, but we have it anyway to prevent confusion
window.AppConfig = AppConfig;
AppConfig.isPublicRoute = function (path) {
    // Default to the current hash
    if (!path)
        path = window.location.hash;
    // Remove the leading hashbang
    if (HtmlUtil.startsWith(path, "#!"))
        path = path.substr(2);
    // If the path has a parameter, only test the first word
    const hasParameter = path.indexOf("/", 1) !== -1;
    if (hasParameter)
        path = path.substr(0, path.indexOf("/", 1));
    const route = _.find(AppConfig.menu, function (m) {
        let testPath = m.path;
        if (!testPath)
            return false;
        // Only test the first part of paths with parameters
        if (hasParameter && testPath.indexOf("/", 1) !== -1)
            testPath = testPath.substr(0, testPath.indexOf("/", 1));
        return testPath === path;
    });
    if (!route)
        return false;
    return route.role === Role_All;
};
// Set the browser title
document.title = AppConfig.appName;

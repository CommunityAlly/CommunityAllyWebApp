// eslint-disable-next-line no-var
declare var ClipboardJS: any;


namespace Ally
{
    /**
     * The controller for the page that lists group members
     */
    export class GroupMembersController implements ng.IController
    {
        static $inject = ["fellowResidents", "SiteInfo", "appCacheService", "$http"];
        static AllBoardUserId = "af615460-d92f-4878-9dfa-d5e4a9b1f488";

        isLoading: boolean = true;
        isLoadingGroupEmails: boolean = false;
        isLoadingSaveEmailGroup: boolean = false;
        allyAppName: string;
        groupShortName: string;
        shouldShowMemberList = false;
        emailLists: GroupEmailInfo[] = [];
        customEmailList: CustomEmailGroup[] = [];
        allResidents: FellowChtnResident[];
        allUnitList: UnitListing[];
        filteredUnitList: UnitListing[];
        memberSearchTerm: string;
        boardMembers: FellowChtnResident[];
        boardPropMgrs: FellowChtnResident[];
        committees: CommitteeListingInfo[];
        boardMessageRecipient: any;
        allOwners: any[];
        allOwnerEmails: any[];
        hasMissingEmails: boolean;
        unitPrefix: string = "Unit ";
        groupEmailDomain: string = "";
        shouldShowNewCustomEmailModal: boolean = false;
        editGroupEmailInfo: SaveEmailGroupInfo;
        editGroupEmailInfoInputShortName: string;
        groupEmailsLoadError: string;
        groupEmailSaveError: string;
        isSiteManager: boolean;
        isPremiumPlanActive = false;
        shouldShowQuickFilter = false;
        quickFilterText = "";


        /**
         * The constructor for the class
         */
        constructor( private fellowResidents: Ally.FellowResidentsService,
            private siteInfo: Ally.SiteInfoService,
            private appCacheService: AppCacheService,
            private $http: ng.IHttpService )
        {
            this.allyAppName = AppConfig.appName;
            this.groupShortName = siteInfo.publicSiteInfo.shortName;
            this.shouldShowMemberList = AppConfig.appShortName === NeighborhoodAppConfig.appShortName
                || AppConfig.appShortName === "block-club"
                || AppConfig.appShortName === "pta"
                || AppConfig.appShortName === RnoAppConfig.appShortName;
            this.groupEmailDomain = "inmail." + AppConfig.baseTld;
            this.unitPrefix = AppConfig.appShortName === "condo" ? "Unit " : "";
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;

            if( AppConfig.isChtnSite )
                this.shouldShowQuickFilter = this.siteInfo.privateSiteInfo.numUnits > 10;

            // Neighborhoods can override the member list type
            if( this.shouldShowMemberList && ( AppConfig.appShortName === NeighborhoodAppConfig.appShortName || AppConfig.appShortName === RnoAppConfig.appShortName ) && this.siteInfo.privateSiteInfo.shouldUseFamiliarNeighborUi )
                this.shouldShowMemberList = false;

            this.fellowResidents.getByUnitsAndResidents().then(
                ( data: FellowResidents ) =>
                {
                    this.isLoading = false;
                    this.allUnitList = data.byUnit;
                    this.allResidents = data.residents;
                    this.committees = data.committees;

                    if( !this.allResidents && data.ptaMembers )
                        this.allResidents = <FellowChtnResident[]>data.ptaMembers;

                    // Sort by last name for member lists, first name otherwise
                    if( this.shouldShowMemberList )
                        this.allResidents = _.sortBy( this.allResidents, r => ( r.lastName || "" ).toLowerCase() );
                    else
                        this.allResidents = _.sortBy( this.allResidents, r => ( r.fullName || "" ).toLowerCase() );

                    this.boardMembers = _.filter( this.allResidents, ( r: FellowChtnResident ) => r.boardPosition !== FellowResidentsService.BoardPos_None && r.boardPosition !== FellowResidentsService.BoardPos_PropertyManager );
                    this.boardPropMgrs = _.filter( this.allResidents, ( r: FellowChtnResident ) => r.boardPosition === FellowResidentsService.BoardPos_PropertyManager );

                    this.boardMessageRecipient = null;
                    if( this.boardMembers.length > 0 )
                    {
                        const hasBoardEmail = _.some( this.boardMembers, function( m ) { return m.hasEmail; } );

                        if( hasBoardEmail )
                        {
                            this.boardMessageRecipient = {
                                fullName: "Entire Board",
                                firstName: "everyone on the board",
                                hasEmail: true,
                                userId: GroupMembersController.AllBoardUserId
                            };
                        }
                    }
                    // Remove board members from the member list
                    if( AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" )
                        this.allResidents = _.filter( this.allResidents, function( r ) { return r.boardPosition === 0; } );

                    for( let i = 0; i < this.boardMembers.length; ++i )
                        this.boardMembers[i].boardPositionName = _.find( FellowResidentsService.BoardPositionNames, ( bm ) => bm.id === this.boardMembers[i].boardPosition ).name;

                    this.boardPropMgrs.forEach( bpm => bpm.boardPositionName = _.find( FellowResidentsService.BoardPositionNames, ( bm ) => bm.id === bpm.boardPosition ).name );

                    const boardSortOrder = [
                        1,
                        64,
                        16,
                        2,
                        4,
                        8,
                        32
                    ];

                    this.boardMembers = _.sortBy( this.boardMembers, function( bm )
                    {
                        let sortIndex = _.indexOf( boardSortOrder, bm.boardPosition );
                        if( sortIndex === -1 )
                            sortIndex = 100;

                        return sortIndex;
                    } );

                    const getEmails = function( memo: any[], unit: any )
                    {
                        Array.prototype.push.apply( memo, unit.owners );
                        return memo;
                    };

                    this.allOwners = _.reduce( this.allUnitList, getEmails, [] );

                    this.allOwners = _.map( _.groupBy( this.allOwners, function( resident )
                    {
                        return resident.email;
                    } ), function( grouped )
                    {
                        return grouped[0];
                    } );

                    // Remove duplicates
                    this.allOwnerEmails = _.reduce( this.allOwners, function( memo: any[], owner: any ) { if( HtmlUtil.isValidString( owner.email ) ) { memo.push( owner.email ); } return memo; }, [] );

                    if( this.allUnitList && this.allUnitList.length > 0 )
                        this.allUnitList = HtmlUtil2.smartSortStreetAddresses( this.allUnitList, "name" );
                    this.filteredUnitList = this.allUnitList;

                    if( this.committees )
                    {
                        // Only show committees with a contact person
                        //TWC - 10/19/18 - Show committees even without a contact person
                        //this.committees = _.reject( this.committees, c => !c.contactUser );

                        this.committees = _.sortBy( this.committees, c => c.committeeName.toLowerCase() );
                    }

                    // If we should scroll to a specific home
                    const scrollToUnitId = this.appCacheService.getAndClear( "scrollToUnitId" );
                    if( scrollToUnitId )
                    {
                        const scrollToElemId = "unit-id-" + scrollToUnitId;
                        setTimeout( () =>
                        {
                            document.getElementById( scrollToElemId ).scrollIntoView();
                            $( "#" + scrollToElemId ).effect( "pulsate", { times: 3 }, 2000 );
                        }, 300 );
                    }

                    // Populate the email name lists, delayed to help the page render faster
                    setTimeout( () => this.loadGroupEmails(), 500 );
                },
                ( httpErrorResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    alert( "Failed to retrieve group members. Please let tech support know via the contact form in the bottom right." );
                    console.log( "Failed to retrieve group members: " + httpErrorResponse.data.exceptionMessage );
                }
            );
        }


        //updateMemberFilter()
        //{
        //    //TODO
        //    const lowerFilter = ( this.memberSearchTerm || '').toLowerCase();
        //    const filterSearchFiles = ( unitListing: UnitListing ) =>
        //    {
        //        if( ( unitListing.name || '' ).toLowerCase().indexOf( lowerFilter ) !== -1 )
        //            return true;

        //        return false;
        //    };

        //    //this.searchFileList = _.filter( this.fullSearchFileList, filterSearchFiles );
        //}


        loadGroupEmails()
        {
            this.hasMissingEmails = _.some( this.allResidents, function( r ) { return !r.hasEmail; } );

            this.groupEmailsLoadError = null;
            this.isLoadingGroupEmails = true;

            this.fellowResidents.getAllGroupEmails().then(
                ( emailGroups: GroupEmailGroups ) =>
                {
                    this.isLoadingGroupEmails = false;

                    this.emailLists = emailGroups.standardGroups;
                    this.customEmailList = emailGroups.customGroups;

                    // Populate custom group email names
                    if( this.customEmailList )
                    {
                        for( const curGroupEmail of this.customEmailList )
                        {
                            curGroupEmail.usersFullNames = [];
                            for( const curGroupMember of curGroupEmail.members )
                            {
                                const resident = this.allResidents.find( r => r.userId === curGroupMember.userId );
                                if( resident )
                                    curGroupEmail.usersFullNames.push( resident.fullName );
                            }
                        }
                    }

                    // Hook up the address copy link
                    setTimeout( function ()
                    {
                        const clipboard = new ClipboardJS( ".clipboard-button" );

                        clipboard.on( "success", function ( e: any )
                        {
                            Ally.HtmlUtil2.showTooltip( e.trigger, "Copied!" );

                            e.clearSelection();
                        } );

                        clipboard.on( "error", function ( e: any )
                        {
                            Ally.HtmlUtil2.showTooltip( e.trigger, "Auto-copy failed, press CTRL+C now" );
                        } );

                    }, 750 );
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoadingGroupEmails = false;

                    this.groupEmailsLoadError = "Failed to load group email addresses: " + httpResponse.data.exceptionMessage;
                }
            );
        }


        /**
        * Called to open the model to create a new custom group email address
        */
        onAddNewCustomEmailGroup()
        {
            this.shouldShowNewCustomEmailModal = true;
            this.editGroupEmailInfo = new SaveEmailGroupInfo();
            this.editGroupEmailInfoInputShortName = "";
            this.allResidents.forEach( r => r.isAssociated = false );

            window.setTimeout( () => document.getElementById( "custom-group-email-short-name-text" ).focus(), 50 );
        }


        /**
        * Called to toggle membership in a custom group email address
        */
        onGroupEmailMemberClicked(resident:FellowChtnResident)
        {
            // Add the user ID if it's not already in the list, remove it if it is
            const existingMemberIdIndex = this.editGroupEmailInfo.memberUserIds.indexOf( resident.userId );
            if( existingMemberIdIndex === -1 )
                this.editGroupEmailInfo.memberUserIds.push( resident.userId );
            else
                this.editGroupEmailInfo.memberUserIds.splice( existingMemberIdIndex, 1 );
        }


        /**
        * Called to save a custom group email address
        */
        saveCustomGroupEmailInfo()
        {
            this.isLoadingSaveEmailGroup = true;
            this.groupEmailSaveError = null;

            const onSave = () =>
            {
                this.isLoadingSaveEmailGroup = false;
                this.shouldShowNewCustomEmailModal = false;
                this.editGroupEmailInfo = null;
                this.editGroupEmailInfoInputShortName = "";

                // Refresh the emails, clear the cache first since we added a new group email address
                this.fellowResidents.clearResidentCache();
                this.loadGroupEmails();
            };

            const onError = ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoadingSaveEmailGroup = false;

                this.groupEmailSaveError = "Failed to process your request: " + httpResponse.data.exceptionMessage;
            };

            if( this.editGroupEmailInfo.existingGroupEmailId )
                this.$http.put( "/api/BuildingResidents/EditCustomGroupEmail", this.editGroupEmailInfo ).then( onSave, onError );
            else
                this.$http.post( "/api/BuildingResidents/NewCustomGroupEmail", this.editGroupEmailInfo ).then( onSave, onError );
        }


        /**
        * Called when the user clicks the button to edit a custom group email address
        */
        editCustomGroupEmail( groupEmail: CustomEmailGroup )
        {
            this.shouldShowNewCustomEmailModal = true;
            this.editGroupEmailInfo = new SaveEmailGroupInfo();
            this.editGroupEmailInfo.existingGroupEmailId = groupEmail.customGroupEmailId;
            this.editGroupEmailInfo.description = groupEmail.description;
            this.editGroupEmailInfo.shortName = groupEmail.shortName;
            this.editGroupEmailInfoInputShortName = this.editGroupEmailInfo.shortName;
            this.editGroupEmailInfo.memberUserIds = groupEmail.members.map( m => m.userId );
            this.editGroupEmailInfo.allowPublicIncoming = groupEmail.allowPublicIncoming;
            this.allResidents.forEach( r => r.isAssociated = this.editGroupEmailInfo.memberUserIds.indexOf( r.userId ) !== -1 );

            window.setTimeout( () => document.getElementById( "custom-group-email-short-name-text" ).focus(), 50 );
        }


        /**
        * Called when the user clicks the button to delete a custom group email address
        */
        deleteGroupEmail( groupEmail: CustomEmailGroup )
        {
            if( !confirm( "Are you sure you want to delete this group email address? Emails sent to this address will no longer be delivered." ) )
                return;

            this.isLoadingGroupEmails = true;

            this.$http.delete( "/api/BuildingResidents/DeleteCustomGroupEmail/" + groupEmail.customGroupEmailId ).then(
                () =>
                {
                    this.isLoadingGroupEmails = false;

                    // Refresh the emails, clear the cache first since we added a new email group
                    this.fellowResidents.clearResidentCache();
                    this.loadGroupEmails();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoadingGroupEmails = false;

                    this.groupEmailSaveError = "Failed to process your request: " + httpResponse.data.exceptionMessage;
                }
            );
        }


        /**
         * Occurs when the user enters quick filter text to filter the list of units
         */
        onQuickFilterChange()
        {
            if( !this.quickFilterText )
                this.filteredUnitList = this.allUnitList;
            else
            {
                const lowerFilter = this.quickFilterText.toLowerCase();

                const unitContainsFilter = ( unit: UnitListing ) =>
                {
                    // If we're using a unit prefix, include that in the unit name test
                    if( this.unitPrefix && this.unitPrefix.length > 0 )
                    {
                        if( ( this.unitPrefix + unit.name ).toLowerCase().indexOf( lowerFilter ) !== -1 )
                            return true;
                    }
                    // Otherwise just test the unit name
                    else if( unit.name.toLowerCase().indexOf( lowerFilter ) !== -1 )
                        return true;

                    if( unit.owners && unit.owners.length > 0 )
                    {
                        const ownerNames = unit.owners.filter( o => !!o.fullName ).map( o => o.fullName.toLowerCase() );
                        if( ownerNames.some( on => on.indexOf( lowerFilter ) !== -1 ) )
                            return true;
                    }

                    if( unit.renters && unit.renters.length > 0 )
                    {
                        const renterNames = unit.renters.filter( o => !!o.fullName ).map( o => o.fullName.toLowerCase() );
                        if( renterNames.some( rn => rn.indexOf( lowerFilter ) !== -1 ) )
                            return true;
                    }

                    return false;
                };

                this.filteredUnitList = this.allUnitList.filter( u => unitContainsFilter( u ) );
            }
        }


        updateEditGroupEmailShortName()
        {
            this.editGroupEmailInfo.shortName = HtmlUtil2.stripNonAlphanumeric( (this.editGroupEmailInfoInputShortName || "").toLocaleLowerCase() );
        }
    }

    class SaveEmailGroupInfo
    {
        existingGroupEmailId: number;
        shortName: string;
        description: string;
        memberUserIds: string[] = [];
        allowPublicIncoming: boolean;
    }
}


CA.angularApp.component( "groupMembers", {
    templateUrl: "/ngApp/chtn/member/group-members.html",
    controller: Ally.GroupMembersController
} );
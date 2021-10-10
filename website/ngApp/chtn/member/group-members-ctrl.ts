declare var Clipboard: any;


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
        showMemberList: boolean;
        emailLists: GroupEmailInfo[] = [];
        customEmailList: CustomEmailGroup[] = [];
        allResidents: FellowChtnResident[];
        unitList: UnitListing[];
        memberSearchTerm: string;
        boardMembers: FellowChtnResident[];
        committees: CommitteeListingInfo[];
        boardMessageRecipient: any;
        allOwners: any[];
        allOwnerEmails: any[];
        hasMissingEmails: boolean;
        unitPrefix: string = "Unit ";
        groupEmailDomain: string = "";
        shouldShowNewCustomEmailModal: boolean = false;
        editGroupEmailInfo: SaveEmailGroupInfo;
        groupEmailsLoadError: string;
        groupEmailSaveError: string;
        isSiteManager: boolean;


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
            this.showMemberList = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
            this.groupEmailDomain = "inmail." + AppConfig.baseTld;

            this.unitPrefix = AppConfig.appShortName === "condo" ? "Unit " : "";
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;

            this.fellowResidents.getByUnitsAndResidents().then( ( data: FellowResidents ) =>
            {
                this.isLoading = false;
                this.unitList = data.byUnit;
                this.allResidents = data.residents;
                this.committees = data.committees;

                if( !this.allResidents && data.ptaMembers )
                    this.allResidents = <FellowChtnResident[]>data.ptaMembers;

                // Sort by last name for member lists, first name otherwise
                if( this.showMemberList )
                    this.allResidents = _.sortBy( this.allResidents, r => ( r.lastName || "" ).toLowerCase() );
                else
                    this.allResidents = _.sortBy( this.allResidents, r => ( r.fullName || "" ).toLowerCase() );

                this.boardMembers = _.filter( this.allResidents, function( r: any ) { return r.boardPosition !== 0; } );
                this.boardMessageRecipient = null;
                if( this.boardMembers.length > 0 )
                {
                    var hasBoardEmail = _.some( this.boardMembers, function( m ) { return m.hasEmail; } );

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
                
                for( var i = 0; i < this.boardMembers.length; ++i )
                {
                    this.boardMembers[i].boardPositionName = _.find( FellowResidentsService.BoardPositionNames, ( bm ) => { return bm.id === this.boardMembers[i].boardPosition; } ).name;
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

                this.boardMembers = _.sortBy( this.boardMembers, function( bm )
                {
                    var sortIndex = _.indexOf( boardSortOrder, bm.boardPosition );
                    if( sortIndex === -1 )
                        sortIndex = 100;

                    return sortIndex;
                } );

                var getEmails = function( memo: any[], unit: any )
                {
                    Array.prototype.push.apply( memo, unit.owners );
                    return memo;
                };

                this.allOwners = _.reduce( this.unitList, getEmails, [] );

                this.allOwners = _.map( _.groupBy( this.allOwners, function( resident )
                {
                    return resident.email;
                } ), function( grouped )
                    {
                        return grouped[0];
                    } );

                // Remove duplicates
                this.allOwnerEmails = _.reduce( this.allOwners, function( memo: any[], owner: any ) { if( HtmlUtil.isValidString( owner.email ) ) { memo.push( owner.email ); } return memo; }, [] );

                if( this.unitList && this.unitList.length > 0 )
                    this.unitList = HtmlUtil2.smartSortStreetAddresses( this.unitList, "name" );
                
                if( this.committees )
                {
                    // Only show committees with a contact person
                    //TWC - 10/19/18 - Show committees even without a contact person
                    //this.committees = _.reject( this.committees, c => !c.contactUser );

                    this.committees = _.sortBy( this.committees, c => c.committeeName.toLowerCase() );
                }

                // If we should scroll to a specific home
                let scrollToUnitId = this.appCacheService.getAndClear("scrollToUnitId");
                if( scrollToUnitId )
                {
                    var scrollToElemId = "unit-id-" + scrollToUnitId;
                    setTimeout( () =>
                    {
                        document.getElementById( scrollToElemId ).scrollIntoView();
                        $( "#" + scrollToElemId ).effect( "pulsate", { times: 3 }, 2000 );
                    }, 300 );
                }

                // Populate the e-mail name lists, delayed to help the page render faster
                setTimeout( () => this.loadGroupEmails(), 500 );
            }, ( httpErrorResponse ) =>
            {
                alert( "Failed to retrieve group members. Please let tech support know via the contact form in the bottom right." );
            } );
        }


        updateMemberFilter()
        {
            var lowerFilter = angular.lowercase( this.memberSearchTerm ) || '';
            let filterSearchFiles = ( unitListing: UnitListing ) =>
            {
                if( angular.lowercase( unitListing.name || '' ).indexOf( lowerFilter ) !== -1 )
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
        }


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
                        for( let curGroupEmail of this.customEmailList )
                            curGroupEmail.usersFullNames = curGroupEmail.members.map( e => this.allResidents.find( r => r.userId === e.userId ).fullName );
                    }

                    // Hook up the address copy link
                    setTimeout( function ()
                    {
                        const clipboard = new Clipboard( ".clipboard-button" );

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
        saveGroupEmailInfo()
        {
            this.isLoadingSaveEmailGroup = true;
            this.groupEmailSaveError = null;

            const onSave = () =>
            {
                this.isLoadingSaveEmailGroup = false;
                this.shouldShowNewCustomEmailModal = false;
                this.editGroupEmailInfo = null;

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
        editGroupEmail( groupEmail: CustomEmailGroup )
        {
            this.shouldShowNewCustomEmailModal = true;
            this.editGroupEmailInfo = new SaveEmailGroupInfo();
            this.editGroupEmailInfo.existingGroupEmailId = groupEmail.customGroupEmailId;
            this.editGroupEmailInfo.description = groupEmail.description;
            this.editGroupEmailInfo.shortName = groupEmail.shortName;
            this.editGroupEmailInfo.memberUserIds = groupEmail.members.map( m => m.userId );
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
    }

    class SaveEmailGroupInfo
    {
        existingGroupEmailId: number;
        shortName: string;
        description: string;
        memberUserIds: string[] = [];
    }
}


CA.angularApp.component( "groupMembers", {
    templateUrl: "/ngApp/chtn/member/group-members.html",
    controller: Ally.GroupMembersController
} );
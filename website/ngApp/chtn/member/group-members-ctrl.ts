declare var Clipboard: any;


namespace Ally
{
    /**
     * The controller for the page that lists group members
     */
    export class GroupMembersController implements ng.IController
    {
        static $inject = ["fellowResidents", "SiteInfo", "appCacheService"];

        isLoading: boolean = true;
        allyAppName: string;
        groupShortName: string;
        showMemberList: boolean;
        emailLists: GroupEmailInfo[] = [];
        allResidents: FellowChtnResident[];
        unitList: any[];
        boardMembers: FellowChtnResident[];
        committees: CommitteeListingInfo[];
        boardMessageRecipient: any;
        allOwners: any[];
        allOwnerEmails: any[];
        hasMissingEmails: boolean;
        unitPrefix: string = "Unit ";
        groupEmailDomain: string = "";


        /**
         * The constructor for the class
         */
        constructor( private fellowResidents: Ally.FellowResidentsService, private siteInfo: Ally.SiteInfoService, private appCacheService: AppCacheService )
        {
            this.allyAppName = AppConfig.appName;
            this.groupShortName = HtmlUtil.getSubdomain();
            this.showMemberList = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
            this.groupEmailDomain = "inmail." + AppConfig.baseTld;

            this.unitPrefix = AppConfig.appShortName === "condo" ? "Unit " : "";
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.fellowResidents.getByUnitsAndResidents().then( ( data: FellowResidents ) =>
            {
                this.isLoading = false;
                this.unitList = data.byUnit;
                this.allResidents = data.residents;
                this.committees = data.committees;

                if( !this.allResidents && data.ptaMembers )
                    this.allResidents = <FellowChtnResident[]>data.ptaMembers;

                // Sort by last name
                this.allResidents = _.sortBy( this.allResidents, function( r ) { return r.lastName; } );

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
                            userId: "af615460-d92f-4878-9dfa-d5e4a9b1f488"
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
                {
                    var useNumericNames = _.every( this.unitList, u => HtmlUtil.isNumericString( u.name ) );
                    if( useNumericNames )
                        this.unitList = _.sortBy( this.unitList, u => +u.name );
                    else
                    {
                        var firstSuffix = this.unitList[0].name.substr( this.unitList[0].name.indexOf( " " ) );
                        let allHaveSameSuffix = _.every( this.unitList, u => HtmlUtil.endsWith( u.name, firstSuffix ) );
                        if( allHaveSameSuffix )
                        {
                            this.unitList = _.sortBy( this.unitList, u => parseInt( u.name.substr( 0, u.name.indexOf( " " ) ) ) );
                        }
                    }
                }
                
                if( this.committees )
                {
                    // Only show commitees with a contact person
                    //TWC - 10/19/18 - Show committees even without a contact person
                    //this.committees = _.reject( this.committees, c => !c.contactUser );

                    this.committees = _.sortBy( this.committees, c => c.committeeName.toLowerCase() );
                }

                // If we should scroll to a specific home
                let scrollToUnitId = this.appCacheService.getAndClear("scrollToUnitId");
                if( scrollToUnitId )
                {
                    var scrollToElemId = "unit-id-" + scrollToUnitId;
                    setTimeout( () => document.getElementById(scrollToElemId).scrollIntoView(), 300 );
                }

                // Populate the e-mail name lists
                this.setupGroupEmails();
            } );
        }


        setupGroupEmails()
        {
            this.hasMissingEmails = _.some( this.allResidents, function( r ) { return !r.hasEmail; } );

            var innerThis = this;
            this.fellowResidents.getGroupEmailObject().then( (emailLists:GroupEmailInfo[]) =>
            {
                this.emailLists = emailLists;

                // Hook up the address copy link
                setTimeout( function()
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
            });
        }
    }
}


CA.angularApp.component( "groupMembers", {
    templateUrl: "/ngApp/chtn/member/group-members.html",
    controller: Ally.GroupMembersController
} );
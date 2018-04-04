declare var Clipboard: any;


namespace Ally
{
    class CommitteeListingInfo
    {
        committeeId: number;
        committeeName: string;
        contactUser: FellowChtnResident;
        isPrivate: boolean;
    }


    /**
     * The controller for the page that lists group members
     */
    export class GroupMembersController implements ng.IController
    {
        static $inject = ["fellowResidents", "SiteInfo"];

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


        /**
         * The constructor for the class
         */
        constructor( private fellowResidents: Ally.FellowResidentsService, private siteInfo: Ally.SiteInfoService )
        {
            this.allyAppName = AppConfig.appName;
            this.groupShortName = HtmlUtil.getSubdomain();
            this.showMemberList = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club";
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

                // Sort by last name
                this.allResidents = _.sortBy( this.allResidents, function( r ) { return r.lastName; } );

                this.boardMembers = _.filter( data.residents, function( r: any ) { return r.boardPosition !== 0; } );
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

                var boardPositionNames = [
                    { id: 0, name: "None" },
                    { id: 1, name: "President" },
                    { id: 2, name: "Treasurer" },
                    { id: 4, name: "Secretary" },
                    { id: 8, name: "Director" },
                    { id: 16, name: "Vice President" },
                    { id: 32, name: "Property Manager" }
                ];

                for( var i = 0; i < this.boardMembers.length; ++i )
                {
                    this.boardMembers[i].boardPositionName = _.find( boardPositionNames, ( bm ) => { return bm.id === this.boardMembers[i].boardPosition; } ).name;
                }

                var boardSortOrder = [
                    1,
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

                var useNumericNames = _.every( this.unitList, function( u ) { return HtmlUtil.isNumericString( u.name ); } );
                if( useNumericNames )
                    this.unitList = _.sortBy( this.unitList, function( u ) { return +u.name; } );

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

                    var showTooltip = function( element: any, text: string )
                    {
                        $( element ).qtip( {
                            style: {
                                classes: 'qtip-light qtip-shadow'
                            },
                            position: {
                                my: "leftMiddle",
                                at: "rightMiddle"
                            },
                            content: { text: text },
                            events: {
                                hide: function( e: any )
                                {
                                    $( e.originalEvent.currentTarget ).qtip( "destroy" );
                                }
                            }
                        } );

                        $( element ).qtip( "show" );
                    };


                    clipboard.on( "success", function( e: any )
                    {
                        showTooltip( e.trigger, "Copied!" );

                        e.clearSelection();
                    } );

                    clipboard.on( "error", function( e: any )
                    {
                        showTooltip( e.trigger, "Auto-copy failed, press CTRL+C now" );
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
declare var Clipboard: any;


namespace Ally
{
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
        showGroupEmailInfo: boolean;
        emailLists: any;
        allResidents: any[];
        unitList: any[];
        boardMembers: any[];
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
            this.showGroupEmailInfo = siteInfo.privateSiteInfo.canSendEmail;
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.emailLists =
                {
                    board: [],
                    discussion: [],
                    owners: [],
                    renters: [],
                    residentOwners: [],
                    nonResidentOwners: [],
                    residentOwnersAndRenters: [],
                    propertyManagers: [],
                    everyone: []
                };

            var innerThis = this;
            this.fellowResidents.getByUnitsAndResidents().then( function( data: any )
            {
                innerThis.isLoading = false;
                innerThis.unitList = data.byUnit;
                innerThis.allResidents = data.residents;

                // Sort by last name
                innerThis.allResidents = _.sortBy( innerThis.allResidents, function( r ) { return r.lastName; } );

                innerThis.boardMembers = _.filter( data.residents, function( r: any ) { return r.boardPosition !== 0; } );
                innerThis.boardMessageRecipient = null;
                if( innerThis.boardMembers.length > 0 )
                {
                    var hasBoardEmail = _.some( innerThis.boardMembers, function( m ) { return m.hasEmail; } );

                    if( hasBoardEmail )
                    {
                        innerThis.boardMessageRecipient = {
                            fullName: "Entire Board",
                            firstName: "everyone on the board",
                            hasEmail: true,
                            userId: "af615460-d92f-4878-9dfa-d5e4a9b1f488"
                        };
                    }
                }
                // Remove board members from the member list
                if( AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" )
                    innerThis.allResidents = _.filter( innerThis.allResidents, function( r ) { return r.boardPosition === 0; } );

                var boardPositionNames = [
                    { id: 0, name: "None" },
                    { id: 1, name: "President" },
                    { id: 2, name: "Treasurer" },
                    { id: 4, name: "Secretary" },
                    { id: 8, name: "Director" },
                    { id: 16, name: "Vice President" },
                    { id: 32, name: "Property Manager" }
                ];

                for( var i = 0; i < innerThis.boardMembers.length; ++i )
                {
                    innerThis.boardMembers[i].boardPositionName = _.find( boardPositionNames, function( bm ) { return bm.id === innerThis.boardMembers[i].boardPosition; } ).name;
                }

                var boardSortOrder = [
                    1,
                    16,
                    2,
                    4,
                    8,
                    32
                ];

                innerThis.boardMembers = _.sortBy( innerThis.boardMembers, function( bm )
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

                innerThis.allOwners = _.reduce( innerThis.unitList, getEmails, [] );

                innerThis.allOwners = _.map( _.groupBy( innerThis.allOwners, function( resident )
                {
                    return resident.email;
                } ), function( grouped )
                    {
                        return grouped[0];
                    } );

                // Remove duplicates
                innerThis.allOwnerEmails = _.reduce( innerThis.allOwners, function( memo: any[], owner: any ) { if( HtmlUtil.isValidString( owner.email ) ) { memo.push( owner.email ); } return memo; }, [] );

                var useNumericNames = _.every( innerThis.unitList, function( u ) { return HtmlUtil.isNumericString( u.name ); } );
                if( useNumericNames )
                    innerThis.unitList = _.sortBy( innerThis.unitList, function( u ) { return +u.name; } );

                // Populate the e-mail name lists
                innerThis.setupGroupEmails();
            } );
        }


        setupGroupEmails()
        {
            this.hasMissingEmails = _.some( this.allResidents, function( r ) { return !r.hasEmail; } );

            this.fellowResidents.setupGroupEmailObject( this.allResidents, this.unitList, this.emailLists );

            if( AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" )
                delete this.emailLists.owners;

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
        }
    }
}


CA.angularApp.component( "groupMembers", {
    templateUrl: "/ngApp/chtn/member/group-members.html",
    controller: Ally.GroupMembersController
} );
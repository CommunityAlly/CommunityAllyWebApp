function ManageMembersCtrl( $scope, $http, $rootScope, $interval, $http )
{

    var vm = this;

    // Test data
    $scope.members = [];


    $scope.newMember = {
        boardPosition: 0,
        isRenter: false
    };

    $scope.editUser = null;


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Select a member and open a modal to edit their information
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.setEdit = function( member )
    {
        $scope.sentWelcomeEmail = false;

        if( member === null )
        {
            $scope.editUser = null;
            return;
        }

        $scope.editUserForm.$setPristine();

        var copiedMember = jQuery.extend( {}, member );
        $scope.editUser = copiedMember;

        $scope.memberGridOptions.selectAll( false );

        setTimeout( "$( '#edit-user-first-text-box' ).focus();", 100 );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Send a member the welcome e-mail
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onSendWelcome = function()
    {
        $scope.isSavingUser = true;

        $http.put( "/api/Member/" + $scope.editUser.userId + "/SendWelcome" ).then( function()
        {
            $scope.isSavingUser = false;
            $scope.sentWelcomeEmail = true;
        }, function()
        {
            alert( "Failed to send the welcome e-mail, please contact support if this problem persists." )
            $scope.isSavingUser = false;
        } );
    };


    //$scope.memberGridOptions = {
    //    data: 'members'
    //};

    var MembersResource = $resource( '/api/Member', null,
        {
            'update': { method: 'PUT' }
        } );

    var defaultSort = { fields: ['lastName'], directions: ['asc'] };
    var memberSortInfo = defaultSort;
    if( window.localStorage )
    {
        var sortOptions = window.localStorage.getItem( "memberSort" );
        if( sortOptions )
            memberSortInfo = JSON.parse( sortOptions );

        if( memberSortInfo.fields.length === 0 )
            memberSortInfo = defaultSort;

        // Store the grid's sort state every 2 seconds to maintain whatever was last selected.
        // Why not just when the sort changes?
        $interval( function()
        {
            var simpleSortInfo = { fields: $scope.memberGridOptions.sortInfo.fields, directions: $scope.memberGridOptions.sortInfo.directions };
            window.localStorage.setItem( "memberSort", JSON.stringify( simpleSortInfo ) );
        }, 2000 );
    }

    $scope.memberGridOptions =
    {
        data: "members",
        plugins: [new ngGridFlexibleHeightPlugin()],
        columnDefs:
        [
            { field: 'firstName', displayName: 'First Name', cellClass: "resident-cell-first" },
            { field: 'lastName', displayName: 'Last Name', cellClass: "resident-cell-last" },
            { field: 'email', displayName: 'E-mail', cellClass: "resident-cell-email" },
            { field: 'isSiteManager', displayName: 'Admin', width: 60, cellClass: "resident-cell-site-manager", cellTemplate: '<div style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" ng-checked="row.getProperty(col.field)"></div>' },
            { field: 'phoneNumber', displayName: 'Phone Number', width: 150, cellClass: "resident-cell-phone", cellTemplate: '<div class="ngCellText" ng-class="col.colIndex()"><span ng-cell-text>{{ row.getProperty(col.field) | tel }}</span></div>' },
        ],
        afterSelectionChange: function( rowItem )
        {
            if( rowItem.selected )
                $scope.setEdit( rowItem.entity );
        },
        sortInfo: memberSortInfo,
        multiSelect: false
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Populate the members
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.refresh = function()
    {
        $scope.isLoading = true;

        $http.get( "/api/Member/Watch" ).then( function( httpResponse )
        {
            $scope.members = httpResponse.data;

            // Hide e-mail address that are @condoally.com that indicates no e-mail address is
            // set
            _.forEach( $scope.members, function( res )
            {
                res.fullName = res.firstName + " " + res.lastName;
                if( typeof ( res.email ) === "string" && res.email.indexOf( "@condoally.com" ) !== -1 )
                    res.email = "";
            } );

            $scope.isLoading = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user presses the button to update a member's information or create a new
    // member
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onSaveMember = function()
    {
        if( $scope.editUser == null )
            return;

        $( "#editUserForm" ).validate();
        if( !$( "#editUserForm" ).valid() )
            return;

        $scope.isSavingUser = true;

        var onSave = function()
        {
            $scope.editUser = null;
            $scope.isSavingUser = false;
            $scope.refresh();
        };

        var onError = onSave;

        if( !$scope.editUser.userId )
            $http.post( "/api/Member", $scope.editUser ).then( onSave, onError );
        else
            $http.put( "/api/Member", $scope.editUser ).then( onSave, onError );

        // TODO Update the fellow residents page next time we're there
        // $cacheFactory.get('$http').remove("/api/BuildingResidents");
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user presses the button to set a user's password
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.OnAdminSetPassword = function()
    {
        var setPass =
            {
                userName: $scope.adminSetPass_Username,
                password: $scope.adminSetPass_Password
            };

        $http.post( "/api/AdminHelper/SetPassword", setPass ).then( function( httpResponse )
        {
            $scope.adminSetPass_ResultMessage = httpResponse.data;
        }, function()
        {
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user presses the button to delete a resident
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onDeleteMember = function()
    {
        if( !confirm( "Are you sure you want to remove this person from your neighborhood watch group?" ) )
            return;

        $http.delete( "/api/Member", { userId: $scope.editUser.userId, unitId: $scope.editUser.unitId } ).then( function()
        {
            $scope.editUser = null;
            $scope.refresh();
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user presses the button to reset everyone's password
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onSendAllWelcome = function()
    {
        $scope.isLoading = true;

        $http.put( "/api/Member?userId&action=launchsite" ).then( function()
        {
            $scope.isLoading = false;
            $scope.sentWelcomeEmail = true;
            $scope.allEmailsSent = true;
        }, function()
        {
            alert( "Failed to send welcome e-mail, please contact support if this problem persists." )
            $scope.isLoading = false;
        } );
    };

    $scope.refresh();
}
ManageMembersCtrl.$inject = ['$scope', '$http', '$rootScope', '$interval', '$http'];
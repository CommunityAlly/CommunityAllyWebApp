function WatchMembersCtrl( $rootScope, $resource, SiteInfo )
{
    var vm = this;

    var WatchMembersResource = $resource( '/api/Watch/MemberList' );
    
    
    var getHousePolys = function ( memberList )
    {
        var usedAddressIds = [];
        var housePolys = [];

        _.each( memberList, function ( m )
        {
            if ( !m.houseGpsBounds )
                return;

            var addressHasAlreadyBeenAdded = _.some( usedAddressIds, function ( id ) { return id == m.addressId; } );
            if ( addressHasAlreadyBeenAdded )
                return;

            usedAddressIds.push( m.addressId );
            housePolys.push( m.houseGpsBounds );
        } );

        return housePolys;
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Populate the page from the server
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.refreshData = function () {
        vm.isLoading = true;

        vm.memberList = WatchMembersResource.query( function () {
            vm.isLoading = false;
            
            vm.housePolys = getHousePolys( vm.memberList );
        } );
    };

    vm.mapCenter = SiteInfo.privateSiteInfo.gpsPosition;
    vm.groupBounds = SiteInfo.publicSiteInfo.gpsBounds;

    vm.refreshData();
}

WatchMembersCtrl.$inject = [ "$rootScope", "$resource", "SiteInfo" ];
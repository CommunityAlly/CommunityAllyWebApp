function WatchHomeCtrl($rootScope, $resource, SiteInfo)
{
    var vm = this;

    var WatchMembersResource = $resource( '/api/Watch/Home' );
    var LocalNewsResource = $resource( 'https://localnewsally.org/api/LocalNews', null, { cache: true } );


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Populate the page from the server
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.refreshData = function()
    {
        vm.isLoading = true;

        vm.watchMembers = WatchMembersResource.get( function()
        {            
            vm.isLoading = false;
        } );
    };

    LocalNewsResource.query( {
        clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
        chicagoWard: SiteInfo.publicSiteInfo.chicagoWard,
        zipCode: SiteInfo.publicSiteInfo.zipCode,
        cityNeighborhood: SiteInfo.publicSiteInfo.localNewsNeighborhoodQuery
    }, function ( localNews )
    {
        vm.localNews = localNews;
        //console.log(localNews);
        vm.isLoading_LocalNews = false;
    } );
}

WatchHomeCtrl.$inject = ["$rootScope", "$resource", "SiteInfo"];
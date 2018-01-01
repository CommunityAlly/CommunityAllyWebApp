function WatchSettingsCtrl($http, $rootScope, $resource, SiteInfo)
{
    var vm = this;

    // Test data
    vm.settings = {};

    vm.defaultBGImage = $( document.documentElement ).css( "background-image" );

    vm.showQaButton = $rootScope.userInfo.emailAddress === "president@mycondoally.com";
    

    var SettingsResource = $resource( '/api/Settings', null,
        {
            'update': { method: 'PUT' }
        } );


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Populate the page from the server
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.refreshData = function()
    {
        vm.isLoading = true;

        vm.settings = SettingsResource.get( function()
        {
            vm.isLoading = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user wants to save a new site title
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.onSiteTitleChange = function()
    {
        vm.isLoading = true;

        SettingsResource.update( { siteTitle: vm.settings.siteTitle }, function()
        {
            location.reload();
            vm.isLoading = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user wants to save a new welcome message
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.onWelcomeMessageUpdate = function()
    {
        vm.isLoading = true;

        SettingsResource.update( { welcomeMessage: vm.settings.welcomeMessage }, function()
        {
            SiteInfo.privateSiteInfo.welcomeMessage = vm.settings.welcomeMessage;
            vm.isLoading = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user clicks a new background image
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.onImageClick = function( bgImage )
    {
        vm.settings.bgImageFileName = bgImage;
        SettingsJS._defaultBG = bgImage;

        SettingsResource.update( { BGImageFileName: vm.settings.bgImageFileName }, function()
        {
            $( ".test-bg-image" ).removeClass( "test-bg-image-selected" );

            $( "img[src='" + $rootScope.bgImagePath + bgImage + "']" ).addClass( "test-bg-image-selected" );

            vm.isLoading = false;
        } );
    };


    vm.onImageHoverOver = function( bgImage )
    {
        $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + bgImage + ")" );
    };


    vm.onImageHoverOut = function()
    {
        if( typeof ( vm.settings.bgImageFileName ) === "string" && vm.settings.bgImageFileName.length > 0 )
            $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + vm.settings.bgImageFileName + ")" );
        else
            $( document.documentElement ).css( "background-image", vm.defaultBGImage );
    };


    vm.onQaDeleteSite = function()
    {
        $http.get( "/api/QA/DeleteThisAssociation" ).then( function()
        {
            location.reload();
        }, function( httpResponse )
        {
            alert( "Failed to delete site: " + httpResponse.data.message );
        } );
    };

    vm.mapInstance = new google.maps.Map( document.getElementById( 'map-canvas' ), vm.mapInfo );


    vm.refreshData();
}

WatchSettingsCtrl.$inject = ["$http", "$rootScope", "$resource", "SiteInfo"];

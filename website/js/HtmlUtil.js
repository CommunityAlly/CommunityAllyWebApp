// Here for easier debugging
function GlobalRedirect( path )
{
    window.location = path;
}


var HtmlUtil =
{
    GetQueryStringParameter: function ( parameterName )
    {
        var fullQueryString = window.location.search.substring( 1 );
        var params = fullQueryString.split( "&" );

        var parameterValue = false;
        for ( var paramIndex = 0; paramIndex < params.length; ++paramIndex )
        {
            var curParameterName = params[paramIndex].substring( 0, params[paramIndex].indexOf( '=' ) );

            if ( curParameterName === parameterName )
                parameterValue = params[paramIndex].substring( params[paramIndex].indexOf( '=' ) + 1 );
        }

        return parameterValue;
    },

    // From http://www.quirksmode.org/js/cookies.html
    createCookie: function ( name, value, days, domain )
    {
        var expires;

        if ( days )
        {
            var date = new Date();
            date.setTime( date.getTime() + ( days * 24 * 60 * 60 * 1000 ) );
            expires = "; expires=" + date.toGMTString();
        }
        else
        {
            expires = "";
        }
        
        var cookieString = escape( name ) + "=" + escape( value ) + expires + ";path=/";

        if( !HtmlUtil.isNullOrWhitespace(domain) )
            cookieString += "; domain=" + domain;

        document.cookie = cookieString
    },

    readCookie: function ( name )
    {
        var nameEQ = escape( name ) + "=";
        var ca = document.cookie.split( ';' );

        for ( var i = 0; i < ca.length; i++ )
        {
            var c = ca[i];
            while ( c.charAt( 0 ) === ' ' )
                c = c.substring( 1, c.length );

            if ( c.indexOf( nameEQ ) === 0 )
                return unescape( c.substring( nameEQ.length, c.length ) );
        }

        return null;
    },

    eraseCookie: function ( name, domain )
    {
        var cookieString = name + "=; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        if( domain )
            cookieString += " domain=" + domain + ";";

        document.cookie = cookieString;
    },

    __localStorageAllowed: null,
    isLocalStorageAllowed: function()
    {
        if( HtmlUtil.__localStorageAllowed !== null )
            return HtmlUtil.__localStorageAllowed;

        try
        {
            localStorage.setItem( "testLS", 1 );
            localStorage.removeItem( "testLS" );

            HtmlUtil.__localStorageAllowed = true;
        } catch( exc )
        {
            HtmlUtil.__localStorageAllowed = false;
        }

        return HtmlUtil.__localStorageAllowed;
    },

    getSubdomain: function( host )
    {
        host = host || window.location.host;

        if( HtmlUtil.startsWith( host, "http://" ) )
            host = host.substring( "http://".length );
        if( HtmlUtil.startsWith( host, "https://" ) )
            host = host.substring( "https://".length );

        // Verify a valid domain for splitting
        if( typeof ( host ) !== "string"
            || host.length === 0
            || host.indexOf( '.' ) === -1
            || host.indexOf('.', host.indexOf( '.' ) + 1 ) === -1 ) // Ensure a second dot for the TLD
            return null;

        return host.split('.')[0];
    },

    isNullOrWhitespace: function( str )
    {
        if( !str || typeof ( str ) !== "string" )
            return true;

        return str.replace(/\s/g, '').length < 1
    },

    // Test if an object is a string, if it is not empty, and if it's not "null"
    isValidString: function( str )
    {
        if( !str || typeof ( str ) !== "string" )
            return false;

        if( str === "null" )
            return false;

        return str.length > 0;
    },

    // Get a substring up to the occurance of a character
    getStringUpToFirst: function( str, endChar )
    {
        var endIndex = str.indexOf( endChar );
        if( endIndex === -1 )
            return "";

        return str.substring( 0, endIndex );
    },

    containsString: function( testString, toFindString  )
    {
        if( HtmlUtil.isNullOrWhitespace( testString )
            || HtmlUtil.isNullOrWhitespace( toFindString ) )
            return false;

        return testString.indexOf( toFindString ) !== -1;
    },

    // Test if a string starts with another
    startsWith: function (testString, testPrefix) {
        if (typeof (testString) !== "string" || typeof (testPrefix) !== "string")
            return false;

        return testString.indexOf(testPrefix) === 0;
    },

    endsWith: function( testString, testSuffix )
    {
        if( typeof ( testString ) !== "string" || typeof ( testSuffix ) !== "string" )
            return false;

        return testString.lastIndexOf( testSuffix ) === testString.length - testSuffix.length;
    },

    isNumericString: function( testString )
    {
        if( HtmlUtil.isNullOrWhitespace( testString ) )
            return false;

        // From http://stackoverflow.com/questions/175739/is-there-a-built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
        return +testString === +testString;
    },

    // Need to do this dumbness to enable scroll which ui-grid breaks. To be called inside onRegisterApi.
    uiGridFixScroll: function()
    {
        setTimeout( function()
        {
            var e = jQuery.Event( '$destroy' );
            var element = jQuery( '.ui-grid-render-container' );
            if( element )
                jQuery( '.ui-grid-render-container' ).trigger( e );

        }, 100 );
    },

    // If the Google Maps API is available, geocode an address
    geocodeAddress: function(oneLineAddress, callback)
    {
        if( !google || !google.maps || !google.maps.Geocoder )
            return;

        var geocoder = new google.maps.Geocoder();

        geocoder.geocode( { 'address': oneLineAddress }, callback );
    }
};
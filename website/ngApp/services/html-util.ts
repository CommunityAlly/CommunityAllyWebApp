/// <reference path="../../Scripts/typings/googlemaps/google.maps.d.ts" />


declare class HtmlUtil
{
    //TODO Move all of these to HtmlUtil2 then rename HtmlUtil2 to HtmlUtil
    static isNullOrWhitespace( str: string ): boolean;
    static GetQueryStringParameter( parameterName: string ): string;
    // Get a substring up to the occurance of a character
    static getStringUpToFirst( str: string, endChar: string ): string;
    static geocodeAddress( oneLineAddress: string, callback: ( results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus ) => void ): void;
    static getSubdomain( host?: string ): string;
    static startsWith( testString: string, testPrefix: string ): boolean;
    static endsWith( testString: string, testSuffix: string ): boolean;
    static isLocalStorageAllowed(): boolean;
    static isNumericString( testString: string ): boolean;
    /**
     * Test if an object is a string, if it is not empty, and if it's not "null"
     */
    static isValidString( str: string ): boolean;
    static uiGridFixScroll(): void;
}


namespace Ally
{
    export class HtmlUtil2
    {
        // Matches YYYY-MM-ddThh:mm:ss.sssZ where .sss is optional
        //"2018-03-12T22:00:33"
        static iso8601RegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
        //static dotNetTimeRegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

        // Not sure how the Community Ally server differs from other .Net WebAPI apps, but this
        // regex is needed for the dates that come down
        static dotNetTimeRegEx2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/;

        static convertStringsToDates( obj: any ): void
        {
            if( $.isArray( obj ) )
            {
                HtmlUtil2.convertDatesFromArray( obj );
            }

            if( HtmlUtil2.isObject( obj ) )
            {
                // Recursively evaluate nested objects
                for( const curPropName in obj )
                {
                    const value = obj[curPropName];

                    if( HtmlUtil2.isObject( value ) )
                    {
                        HtmlUtil2.convertStringsToDates( value );
                    }
                    else if( $.isArray( value ) )
                    {
                        HtmlUtil2.convertDatesFromArray( value );
                    }
                    else if( HtmlUtil2.isString( value ) && value.length > 10 && HtmlUtil2.dotNetTimeRegEx2.test( value ) )
                    {
                        //If it is a string of the expected form convert to date
                        let parsedDate;
                        if( HtmlUtil.endsWith( curPropName, "_UTC" )
                            || HtmlUtil.endsWith( curPropName, "Utc" ) )
                        {
                            parsedDate = HtmlUtil2.serverUtcDateToLocal( value );
                        }
                        else
                            parsedDate = new Date( value );

                        obj[curPropName] = parsedDate;
                    }
                }
            }
        }

        static convertDatesFromArray( array: any[] ): void
        {
            for( let i = 0; i < array.length; i++ )
            {
                const value = array[i];

                if( HtmlUtil2.isObject( value ) )
                {
                    HtmlUtil2.convertStringsToDates( value );
                }
                else if( HtmlUtil2.isString( value ) && HtmlUtil2.iso8601RegEx.test( value ) )
                {
                    array[i] = new Date( value );
                }
            }
        }


        static isObject( value: any ): boolean
        {
            return Object.prototype.toString.call( value ) === "[object Object]";
        }


        static isString( value: any ): boolean
        {
            return Object.prototype.toString.call( value ) === "[object String]";
        }


        /// Test if an object is a string, if it is not empty, and if it's not "null"
        static isValidString( str: any ): boolean
        {
            if( !str || typeof ( str ) !== "string" )
                return false;

            if( str === "null" )
                return false;

            return str.length > 0;
        }


        // Convert a UTC date string from the server to a local date object
        static serverUtcDateToLocal( dbString: any ): Date
        {
            if( typeof dbString !== "string" )
                return dbString;

            if( HtmlUtil.isNullOrWhitespace( dbString ) )
                return null;

            return moment.utc( dbString ).toDate();
        }


        static showTooltip( element: any, text: string ): void
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
        }


        static removeNonAlphanumeric( str: string )
        {
            return str.replace( /\W/g, '' );
        }


        /** Download a CSV string as a file */
        static downloadCsv( csvText: string, downloadFileName: string ): void
        {
            HtmlUtil2.downloadFile( csvText, downloadFileName, "text/csv" );
        }


        /** Download a XML string as a file */
        static downloadXml( xmlText: string, downloadFileName: string ): void
        {
            HtmlUtil2.downloadFile( xmlText, downloadFileName, "text/xml" );
        }


        /** Download a string as a file */
        static downloadFile( fileContents: string, downloadFileName: string, contentType: string ): void
        {
            if( typeof ( Blob ) !== "undefined" )
            {
                const a = document.createElement( "a" );
                document.body.appendChild( a );
                a.style.display = "none";

                const blob = new Blob( [fileContents], { type: contentType } );
                const url = window.URL.createObjectURL( blob );

                a.href = url;
                a.download = downloadFileName;
                a.click();
                window.URL.revokeObjectURL( url );
            }
            else
            {

                const wrappedFileDataString = "data:" + contentType + ";charset=utf-8," + fileContents;

                const encodedFileDataUri = encodeURI( wrappedFileDataString );

                const downloadLink = document.createElement( "a" );
                downloadLink.setAttribute( "href", encodedFileDataUri );
                downloadLink.setAttribute( "download", downloadFileName );
                document.body.appendChild( downloadLink );

                downloadLink.click(); // This will download the file

                setTimeout( function() { document.body.removeChild( downloadLink ); }, 500 );
            }
        }


        /** Determine if a string starts with a numeric string */
        static startsWithNumber( testString: string, shouldTrim: boolean = true ): boolean
        {
            if( HtmlUtil.isNullOrWhitespace( testString ) )
                return false;

            if( shouldTrim )
                testString = testString.trim();

            let firstWhitespaceIndex = testString.search( /\s/ );

            // If no whitespace was found then test the whole string
            if( firstWhitespaceIndex === -1 )
                firstWhitespaceIndex = testString.length;

            testString = testString.substring( 0, firstWhitespaceIndex - 1 );

            return HtmlUtil.isNumericString( testString );
        }


        static isAndroid(): boolean
        {
            const ua = navigator.userAgent.toLowerCase();
            return ua.indexOf( "android" ) > -1;
        }

        // From https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
        static copyTextToClipboard( text: string ): boolean
        {
            const textArea = document.createElement( "textarea" );

            //
            // *** This styling is an extra step which is likely not required. ***
            //
            // Why is it here? To ensure:
            // 1. the element is able to have focus and selection.
            // 2. if the element was to flash render it has minimal visual impact.
            // 3. less flakyness with selection and copying which **might** occur if
            //    the textarea element is not visible.
            //
            // The likelihood is the element won't even render, not even a
            // flash, so some of these are just precautions. However in
            // Internet Explorer the element is visible whilst the popup
            // box asking the user for permission for the web page to
            // copy to the clipboard.
            //

            // Place in the top-left corner of screen regardless of scroll position.
            textArea.style.position = "fixed";
            textArea.style.top = "0";
            textArea.style.left = "0";

            // Ensure it has a small width and height. Setting to 1px / 1em
            // doesn't work as this gives a negative w/h on some browsers.
            textArea.style.width = "2em";
            textArea.style.height = "2em";

            // We don"t need padding, reducing the size if it does flash render.
            textArea.style.padding = "0";

            // Clean up any borders.
            textArea.style.border = "none";
            textArea.style.outline = "none";
            textArea.style.boxShadow = "none";

            // Avoid flash of the white box if rendered for any reason.
            textArea.style.background = "transparent";

            textArea.value = text;

            document.body.appendChild( textArea );
            textArea.focus();
            textArea.select();

            let didCopy = false;
            try
            {
                const successful = document.execCommand( "copy" );
                const msg = successful ? "successful" : "unsuccessful";
                console.log( "Copying text command was " + msg );

                didCopy = successful;
            } catch( err )
            {
                console.log( "Oops, unable to copy" );
            }

            document.body.removeChild( textArea );

            return didCopy;
        }


        /* eslint-disable  @typescript-eslint/no-explicit-any */
        static smartSortStreetAddresses( homeList: any[], namePropName: string ): any[]
        {
            if( !homeList || homeList.length === 0 )
                return homeList;

            // If all homes have a numeric name then lets sort numerically
            const shouldUseNumericNames = _.every( homeList, u => HtmlUtil.isNumericString( u[namePropName] ) );
            if( shouldUseNumericNames )
                return _.sortBy( homeList, u => +u[namePropName] );

            // If all homes share the same suffix then sort by only the first part, if numeric
            const firstSuffix = homeList[0][namePropName].substr( homeList[0][namePropName].indexOf( " " ) );
            const allHaveNumericPrefix = _.every( homeList, u => HtmlUtil2.startsWithNumber( u[namePropName] ) );
            const allHaveSameSuffix = _.every( homeList, u => HtmlUtil.endsWith( u[namePropName], firstSuffix ) );

            if( allHaveNumericPrefix && allHaveSameSuffix )
                return _.sortBy( homeList, u => parseInt( u[namePropName].substr( 0, u[namePropName].indexOf( " " ) ) ) );

            // If all units start with a number and end with a string (Like,
            // 123 Elm St) then first sort by the street, then number
            if( allHaveNumericPrefix )
            {
                const sortByStreet = ( s1: string, s2: string ): number =>
                {
                    const suffix1 = getAfterNumber( s1 );
                    const suffix2 = getAfterNumber( s2 );

                    if( suffix1 === suffix2 )
                    {
                        const num1 = parseInt( s1.substr( 0, s1.search( /\s/ ) ) );
                        const num2 = parseInt( s2.substr( 0, s2.search( /\s/ ) ) );

                        return num1 - num2;
                    }

                    return suffix1.localeCompare( suffix2 );
                };

                const getAfterNumber = ( str: string ) => str.substring( str.search( /\s/ ) + 1 );

                return homeList.sort( ( h1, h2 ) => sortByStreet( h1[namePropName], h2[namePropName] ) );
                //return _.sortBy( homeList, u => [getAfterNumber( u[namePropName] ), parseInt( u[namePropName].substr( 0, u[namePropName].search( /\s/ ) ) )] );
            }

            return _.sortBy( homeList, u => u[namePropName] );
        }
    }


    /**
     * Represents an exception returned from an API endpoint
     */
    export class ExceptionResult
    {
        exceptionMessage: string;
    }
}
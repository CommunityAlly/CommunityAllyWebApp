/// <reference path="../../Scripts/typings/googlemaps/google.maps.d.ts" />


declare class HtmlUtil
{
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
        static dotNetTimeRegEx2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

        static convertStringsToDates( obj: any )
        {
            if( $.isArray( obj ) )
            {
                HtmlUtil2.convertDatesFromArray( obj );
            }


            if( HtmlUtil2.isObject( obj ) )
            {
                // Recursively evaluate nested objects
                for( var curPropName in obj )
                {
                    var value = obj[curPropName];

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
                        var parsedDate;
                        if( HtmlUtil.endsWith( curPropName, "_UTC" )
                            || HtmlUtil.endsWith( curPropName, "Utc" ))
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

        static convertDatesFromArray( array: any[] )
        {
            for( var i = 0; i < array.length; i++ )
            {
                var value = array[i];

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


        static isObject( value: any )
        {
            return Object.prototype.toString.call( value ) === "[object Object]";
        }


        static isString( value: any )
        {
            return Object.prototype.toString.call( value ) === "[object String]";
        }


        // Convert a UTC date string from the server to a local date object
        static serverUtcDateToLocal( dbString: any )
        {
            if( typeof dbString !== "string" )
                return dbString;

            if( HtmlUtil.isNullOrWhitespace( dbString ) )
                return null;

            return moment.utc( dbString ).toDate();
        }


        static showTooltip( element: any, text: string )
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


        /** Download a CSV string as a file */
        static downloadCsv( csvText: string, downloadFileName: string )
        {
            HtmlUtil2.downloadFile( csvText, downloadFileName, "text/csv" );
        }


        /** Download a XML string as a file */
        static downloadXml( xmlText: string, downloadFileName: string )
        {
            HtmlUtil2.downloadFile( xmlText, downloadFileName, "text/xml" );
        }


        /** Download a string as a file */
        static downloadFile( fileContents: string, downloadFileName: string, contentType: string )
        {
            if( typeof ( Blob ) !== "undefined" )
            {
                let a = document.createElement( "a" );
                document.body.appendChild( a );
                a.style.display = "none";

                let blob = new Blob( [fileContents], { type: contentType } );
                let url = window.URL.createObjectURL( blob );

                a.href = url;
                a.download = downloadFileName;
                a.click();
                window.URL.revokeObjectURL( url );
            }
            else
            {

                let wrappedFileDataString = "data:" + contentType + ";charset=utf-8," + fileContents;

                let encodedFileDataUri = encodeURI( wrappedFileDataString );

                let downloadLink = document.createElement( "a" );
                downloadLink.setAttribute( "href", encodedFileDataUri );
                downloadLink.setAttribute( "download", downloadFileName );
                document.body.appendChild( downloadLink );

                downloadLink.click(); // This will download the file

                setTimeout( function () { document.body.removeChild( downloadLink ); }, 500 );
            }
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
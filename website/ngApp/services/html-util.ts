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
    }


    /**
     * Represents an exception returned from an API endpoint
     */
    export class ExceptionResult
    {
        exceptionMessage: string;
    }
}
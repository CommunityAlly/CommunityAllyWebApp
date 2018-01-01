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
    /**
     * Represents an exception returned from an API endpoint
     */
    export class ExceptionResult
    {
        exceptionMessage: string;
    }
}
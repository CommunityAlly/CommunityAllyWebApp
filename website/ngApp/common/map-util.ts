// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace Ally
{
    /**
     * Represents a street address
     */
    export class SplitAddress
    {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    }


    /**
     * Represents a GPS position, analogous to TCCommonWeb.GpsPoint
     */
    export class GpsPoint
    {
        lat: number;
        lon: number;
    }


    /**
     * Represents a polygon with GPS coordinates for vertices, analogous to TCCommonWeb.GpsPolygon
     */
    export class GpsPolygon
    {
        vertices: GpsPoint[];
    }


    /**
     * Represents a street address
     */
    export class FullAddress
    {
        addressId: number;
        street1: string;
        street2: string;
        city: string;
        state: string;
        zip: string;
        country: string;
        gpsPos: GpsPoint;
        gpsBounds: GpsPolygon;
        chicagoWard: number;
        neighborhoodName: string;
        oneLiner: string;
        multiLiner: string;
        timeZoneIana: string;
        recipientName: string;
    }


    /**
     * Provides helper methods for dealing with map information
     */
    export class MapUtil
    {
        /**
         * Initialize the Google map on the page
         * @param addressComponents The address data returned from AutoComplete or a geocode
         */
        static parseAddressComponents( addressComponents: google.maps.GeocoderAddressComponent[] ): SplitAddress
        {
            const splitAddress = new SplitAddress();

            let streetNumber = "";
            let streetName = "";
            for( const component of addressComponents )
            {
                if( component.types.indexOf( "street_number" ) !== -1 )
                    streetNumber = component.short_name;
                else if( component.types.indexOf( "route" ) !== -1 )
                    streetName = component.short_name;
                else if( component.types.indexOf( "locality" ) !== -1 )
                    splitAddress.city = component.short_name;
                else if( component.types.indexOf( "administrative_area_level_1" ) !== -1 )
                    splitAddress.state = component.short_name;
                else if( component.types.indexOf( "postal_code" ) !== -1 )
                    splitAddress.zip = component.short_name;
                else if( component.types.indexOf( "country" ) !== -1 )
                    splitAddress.country = component.short_name;
            }

            splitAddress.street = streetNumber + " " + streetName;

            return splitAddress;
        }

        
        /**
         * Convert Community Ally bounds to Google bounds
         * @param gpsBounds The array of 
         */
        static gpsBoundsToGooglePoly( gpsBounds: GpsPolygon ): google.maps.LatLng[]
        {
            const path = _.map( gpsBounds.vertices, function( v )
            {
                return new google.maps.LatLng( v.lat, v.lon );
            });

            return path;
        };
    }
}
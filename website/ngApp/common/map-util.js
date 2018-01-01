/// <reference path="../../Scripts/typings/googlemaps/google.maps.d.ts" />
/// <reference path="../../Scripts/typings/underscore/underscore.d.ts" />
var Ally;
(function (Ally) {
    /**
     * Represents a street address
     */
    var SplitAddress = /** @class */ (function () {
        function SplitAddress() {
        }
        return SplitAddress;
    }());
    Ally.SplitAddress = SplitAddress;
    /**
     * Represents a GPS position, analgolous to TCCommonWeb.GpsPoint
     */
    var GpsPoint = /** @class */ (function () {
        function GpsPoint() {
        }
        return GpsPoint;
    }());
    Ally.GpsPoint = GpsPoint;
    /**
     * Represents a polygon with GPS coordinates for vertices, analgolous to TCCommonWeb.GpsPolygon
     */
    var GpsPolygon = /** @class */ (function () {
        function GpsPolygon() {
        }
        return GpsPolygon;
    }());
    Ally.GpsPolygon = GpsPolygon;
    /**
     * Represents a street address
     */
    var FullAddress = /** @class */ (function () {
        function FullAddress() {
        }
        return FullAddress;
    }());
    Ally.FullAddress = FullAddress;
    /**
     * Provides helper methods for dealing with map information
     */
    var MapUtil = /** @class */ (function () {
        function MapUtil() {
        }
        /**
         * Initialize the Google map on the page
         * @param addressComponents The address data returned from AutoComplete or a geocode
         */
        MapUtil.parseAddressComponents = function (addressComponents) {
            var splitAddress = new SplitAddress();
            var streetNumber = "";
            var streetName = "";
            for (var _i = 0, addressComponents_1 = addressComponents; _i < addressComponents_1.length; _i++) {
                var component = addressComponents_1[_i];
                if (component.types.indexOf("street_number") !== -1)
                    streetNumber = component.short_name;
                else if (component.types.indexOf("route") !== -1)
                    streetName = component.short_name;
                else if (component.types.indexOf("locality") !== -1)
                    splitAddress.city = component.short_name;
                else if (component.types.indexOf("administrative_area_level_1") !== -1)
                    splitAddress.state = component.short_name;
                else if (component.types.indexOf("postal_code") !== -1)
                    splitAddress.zip = component.short_name;
                else if (component.types.indexOf("country") !== -1)
                    splitAddress.country = component.short_name;
            }
            splitAddress.street = streetNumber + " " + streetName;
            return splitAddress;
        };
        /**
         * Convert Community Ally bounds to Google bounds
         * @param gpsBounds The array of
         */
        MapUtil.gpsBoundsToGooglePoly = function (gpsBounds) {
            var path = _.map(gpsBounds.vertices, function (v) {
                return new google.maps.LatLng(v.lat, v.lon);
            });
            return path;
        };
        ;
        return MapUtil;
    }());
    Ally.MapUtil = MapUtil;
})(Ally || (Ally = {}));

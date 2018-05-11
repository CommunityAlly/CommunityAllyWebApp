/// <reference path="../../Scripts/typings/googlemaps/google.maps.d.ts" />
var Ally;
(function (Ally) {
    var HtmlUtil2 = /** @class */ (function () {
        function HtmlUtil2() {
        }
        HtmlUtil2.convertStringsToDates = function (obj) {
            if ($.isArray(obj)) {
                HtmlUtil2.convertDatesFromArray(obj);
            }
            if (HtmlUtil2.isObject(obj)) {
                // Recursively evaluate nested objects
                for (var curPropName in obj) {
                    var value = obj[curPropName];
                    if (HtmlUtil2.isObject(value)) {
                        HtmlUtil2.convertStringsToDates(value);
                    }
                    else if ($.isArray(value)) {
                        HtmlUtil2.convertDatesFromArray(value);
                    }
                    else if (HtmlUtil2.isString(value) && value.length > 10 && HtmlUtil2.dotNetTimeRegEx2.test(value)) {
                        //If it is a string of the expected form convert to date
                        var parsedDate;
                        if (HtmlUtil.endsWith(curPropName, "_UTC")
                            || HtmlUtil.endsWith(curPropName, "Utc")) {
                            parsedDate = HtmlUtil2.serverUtcDateToLocal(value);
                        }
                        else
                            parsedDate = new Date(value);
                        obj[curPropName] = parsedDate;
                    }
                }
            }
        };
        HtmlUtil2.convertDatesFromArray = function (array) {
            for (var i = 0; i < array.length; i++) {
                var value = array[i];
                if (HtmlUtil2.isObject(value)) {
                    HtmlUtil2.convertStringsToDates(value);
                }
                else if (HtmlUtil2.isString(value) && HtmlUtil2.iso8601RegEx.test(value)) {
                    array[i] = new Date(value);
                }
            }
        };
        HtmlUtil2.isObject = function (value) {
            return Object.prototype.toString.call(value) === "[object Object]";
        };
        HtmlUtil2.isString = function (value) {
            return Object.prototype.toString.call(value) === "[object String]";
        };
        // Convert a UTC date string from the server to a local date object
        HtmlUtil2.serverUtcDateToLocal = function (dbString) {
            if (typeof dbString !== "string")
                return dbString;
            if (HtmlUtil.isNullOrWhitespace(dbString))
                return null;
            return moment.utc(dbString).toDate();
        };
        // Matches YYYY-MM-ddThh:mm:ss.sssZ where .sss is optional
        //"2018-03-12T22:00:33"
        HtmlUtil2.iso8601RegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
        //static dotNetTimeRegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
        // Not sure how the Community Ally server differs from other .Net WebAPI apps, but this
        // regex is needed for the dates that come down
        HtmlUtil2.dotNetTimeRegEx2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d*)$/;
        return HtmlUtil2;
    }());
    Ally.HtmlUtil2 = HtmlUtil2;
    /**
     * Represents an exception returned from an API endpoint
     */
    var ExceptionResult = /** @class */ (function () {
        function ExceptionResult() {
        }
        return ExceptionResult;
    }());
    Ally.ExceptionResult = ExceptionResult;
})(Ally || (Ally = {}));

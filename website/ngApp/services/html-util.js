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
        // Test if an object is a string, if it is not empty, and if it's not "null"
        HtmlUtil2.isValidString = function (str) {
            if (!str || typeof (str) !== "string")
                return false;
            if (str === "null")
                return false;
            return str.length > 0;
        };
        // Convert a UTC date string from the server to a local date object
        HtmlUtil2.serverUtcDateToLocal = function (dbString) {
            if (typeof dbString !== "string")
                return dbString;
            if (HtmlUtil.isNullOrWhitespace(dbString))
                return null;
            return moment.utc(dbString).toDate();
        };
        HtmlUtil2.showTooltip = function (element, text) {
            $(element).qtip({
                style: {
                    classes: 'qtip-light qtip-shadow'
                },
                position: {
                    my: "leftMiddle",
                    at: "rightMiddle"
                },
                content: { text: text },
                events: {
                    hide: function (e) {
                        $(e.originalEvent.currentTarget).qtip("destroy");
                    }
                }
            });
            $(element).qtip("show");
        };
        /** Download a CSV string as a file */
        HtmlUtil2.downloadCsv = function (csvText, downloadFileName) {
            HtmlUtil2.downloadFile(csvText, downloadFileName, "text/csv");
        };
        /** Download a XML string as a file */
        HtmlUtil2.downloadXml = function (xmlText, downloadFileName) {
            HtmlUtil2.downloadFile(xmlText, downloadFileName, "text/xml");
        };
        /** Download a string as a file */
        HtmlUtil2.downloadFile = function (fileContents, downloadFileName, contentType) {
            if (typeof (Blob) !== "undefined") {
                var a = document.createElement("a");
                document.body.appendChild(a);
                a.style.display = "none";
                var blob = new Blob([fileContents], { type: contentType });
                var url = window.URL.createObjectURL(blob);
                a.href = url;
                a.download = downloadFileName;
                a.click();
                window.URL.revokeObjectURL(url);
            }
            else {
                var wrappedFileDataString = "data:" + contentType + ";charset=utf-8," + fileContents;
                var encodedFileDataUri = encodeURI(wrappedFileDataString);
                var downloadLink_1 = document.createElement("a");
                downloadLink_1.setAttribute("href", encodedFileDataUri);
                downloadLink_1.setAttribute("download", downloadFileName);
                document.body.appendChild(downloadLink_1);
                downloadLink_1.click(); // This will download the file
                setTimeout(function () { document.body.removeChild(downloadLink_1); }, 500);
            }
        };
        /** Determine if a string starts with a numeric string */
        HtmlUtil2.startsWithNumber = function (testString, shouldTrim) {
            if (shouldTrim === void 0) { shouldTrim = true; }
            if (HtmlUtil.isNullOrWhitespace(testString))
                return false;
            if (shouldTrim)
                testString = testString.trim();
            var firstWhitespaceIndex = testString.search(/\s/);
            // If no whitespace was found then test the whole string
            if (firstWhitespaceIndex === -1)
                firstWhitespaceIndex = testString.length;
            testString = testString.substring(0, firstWhitespaceIndex - 1);
            return HtmlUtil.isNumericString(testString);
        };
        HtmlUtil2.isAndroid = function () {
            var ua = navigator.userAgent.toLowerCase();
            return ua.indexOf("android") > -1;
        };
        // From https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
        HtmlUtil2.copyTextToClipboard = function (text) {
            var textArea = document.createElement("textarea");
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
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            var didCopy = false;
            try {
                var successful = document.execCommand("copy");
                var msg = successful ? "successful" : "unsuccessful";
                console.log("Copying text command was " + msg);
                didCopy = successful;
            }
            catch (err) {
                console.log("Oops, unable to copy");
            }
            document.body.removeChild(textArea);
            return didCopy;
        };
        // Matches YYYY-MM-ddThh:mm:ss.sssZ where .sss is optional
        //"2018-03-12T22:00:33"
        HtmlUtil2.iso8601RegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
        //static dotNetTimeRegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
        // Not sure how the Community Ally server differs from other .Net WebAPI apps, but this
        // regex is needed for the dates that come down
        HtmlUtil2.dotNetTimeRegEx2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
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

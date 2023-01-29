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
                        var parsedDate = void 0;
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
        /// Test if an object is a string, if it is not empty, and if it's not "null"
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
        HtmlUtil2.removeNonAlphanumeric = function (str) {
            return str.replace(/\W/g, '');
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
        /** Determine if a string ends with a numeric string */
        HtmlUtil2.endsWithNumber = function (testString, shouldTrim) {
            if (shouldTrim === void 0) { shouldTrim = true; }
            if (HtmlUtil.isNullOrWhitespace(testString))
                return false;
            if (shouldTrim)
                testString = testString.trim();
            return /[0-9]+$/.test(testString);
        };
        /** Get the number at the end of a string, null if the string doesn't end with a number */
        HtmlUtil2.getNumberAtEnd = function (testString) {
            if (HtmlUtil2.endsWithNumber(testString))
                return parseInt(testString.match(/[0-9]+$/)[0]);
            return null;
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
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        HtmlUtil2.smartSortStreetAddresses = function (homeList, namePropName) {
            if (!homeList || homeList.length === 0)
                return homeList;
            // If all homes have a numeric name then lets sort numerically
            var shouldUseNumericNames = _.every(homeList, function (u) { return HtmlUtil.isNumericString(u[namePropName]); });
            if (shouldUseNumericNames)
                return _.sortBy(homeList, function (u) { return +u[namePropName]; });
            // If all homes share the same suffix then sort by only the first part, if numeric
            var firstSuffix = homeList[0][namePropName].substr(homeList[0][namePropName].indexOf(" "));
            var allHaveNumericPrefix = _.every(homeList, function (u) { return HtmlUtil2.startsWithNumber(u[namePropName]); });
            var allHaveSameSuffix = _.every(homeList, function (u) { return HtmlUtil.endsWith(u[namePropName], firstSuffix); });
            if (allHaveNumericPrefix && allHaveSameSuffix)
                return _.sortBy(homeList, function (u) { return parseInt(u[namePropName].substr(0, u[namePropName].indexOf(" "))); });
            // And the flip, if all names start with the same string "Unit #" and end with a number, sort by that number
            var firstNumberIndex = homeList[0][namePropName].search(/[0-9]/);
            if (firstNumberIndex >= 0) {
                var firstPrefix_1 = homeList[0][namePropName].substr(0, firstNumberIndex);
                var allHaveSamePrefix = _.every(homeList, function (u) { return HtmlUtil.startsWith(u[namePropName], firstPrefix_1); });
                var allEndWithNumber = _.every(homeList, function (u) { return HtmlUtil2.endsWithNumber(u[namePropName]); });
                if (allHaveSamePrefix && allEndWithNumber)
                    return _.sortBy(homeList, function (u) { return HtmlUtil2.getNumberAtEnd(u[namePropName]); });
            }
            // If all units start with a number and end with a string (Like,
            // 123 Elm St) then first sort by the street, then number
            if (allHaveNumericPrefix) {
                var sortByStreet_1 = function (s1, s2) {
                    var suffix1 = getAfterNumber_1(s1);
                    var suffix2 = getAfterNumber_1(s2);
                    if (suffix1 === suffix2) {
                        var num1 = parseInt(s1.substr(0, s1.search(/\s/)));
                        var num2 = parseInt(s2.substr(0, s2.search(/\s/)));
                        return num1 - num2;
                    }
                    return suffix1.localeCompare(suffix2);
                };
                var getAfterNumber_1 = function (str) { return str.substring(str.search(/\s/) + 1); };
                return homeList.sort(function (h1, h2) { return sortByStreet_1(h1[namePropName], h2[namePropName]); });
                //return _.sortBy( homeList, u => [getAfterNumber( u[namePropName] ), parseInt( u[namePropName].substr( 0, u[namePropName].search( /\s/ ) ) )] );
            }
            return _.sortBy(homeList, function (u) { return (u[namePropName] || "").toLowerCase(); });
        };
        /**
         * Resize a base 64 image. From https://stackoverflow.com/a/63348962/10315651
         * @param {String} base64 - The base64 string (must include MIME type)
         * @param {Number} newWidth - The width of the image in pixels
         * @param {Number} newHeight - The height of the image in pixels
         */
        HtmlUtil2.resizeBase64Img = function (base64, newWidth, newHeight) {
            return new Promise(function (resolve, reject) {
                var canvas = document.createElement("canvas");
                canvas.width = newWidth;
                canvas.height = newHeight;
                var context = canvas.getContext("2d");
                var image = document.createElement("img");
                image.onload = function () {
                    context.drawImage(image, 0, 0, image.width, image.height, 0, 0, newWidth, newHeight);
                    resolve(canvas.toDataURL());
                };
                image.src = base64;
            });
        };
        /**
         * Resize an image
         * @param {HTMLImageElement} image - The image to resize
         * @param {Number} newWidth - The width of the image in pixels
         * @param {Number} newHeight - The height of the image in pixels
         */
        HtmlUtil2.resizeFromImg = function (image, newWidth, newHeight) {
            return new Promise(function (resolve, reject) {
                var canvas = document.createElement("canvas");
                canvas.width = newWidth;
                canvas.height = newHeight;
                var context = canvas.getContext("2d");
                context.scale(newWidth / image.width, newHeight / image.height);
                context.drawImage(image, 0, 0);
                resolve(canvas.toDataURL());
            });
        };
        /**
         * Resize an image and output a blob
         * @param {HTMLImageElement} image - The image to resize
         * @param {Number} newWidth - The width of the image in pixels
         * @param {Number} newHeight - The height of the image in pixels
         */
        HtmlUtil2.resizeFromImgToBlob = function (image, newWidth, newHeight, mimeType) {
            if (mimeType === void 0) { mimeType = "image/jpeg"; }
            return new Promise(function (resolve, reject) {
                var canvas = document.createElement("canvas");
                canvas.width = newWidth;
                canvas.height = newHeight;
                var context = canvas.getContext("2d");
                context.drawImage(image, 0, 0, image.width, image.height, 0, 0, newWidth, newHeight);
                canvas.toBlob(function (blob) {
                    resolve(blob);
                }, mimeType, 0.75);
            });
        };
        HtmlUtil2.initTinyMce = function (elemId, heightPixels, overrideOptions) {
            if (elemId === void 0) { elemId = "tiny-mce-editor"; }
            if (heightPixels === void 0) { heightPixels = 400; }
            if (overrideOptions === void 0) { overrideOptions = null; }
            var mcePromise = new Promise(function (resolve, reject) {
                var loadRtes = function () {
                    tinymce.remove();
                    var menubar = (overrideOptions && overrideOptions.menubar !== undefined) ? overrideOptions.menubar : "edit insert format table";
                    tinymce.init({
                        selector: '#' + elemId,
                        menubar: menubar,
                        //plugins: 'a11ychecker advcode casechange export formatpainter image editimage linkchecker autolink lists checklist media mediaembed pageembed permanentpen powerpaste table advtable tableofcontents tinycomments tinymcespellchecker',
                        plugins: 'image link autolink lists media table code',
                        //toolbar: 'a11ycheck addcomment showcomments casechange checklist code export formatpainter image editimage pageembed permanentpen table tableofcontents',
                        toolbar: 'styleselect | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | checklist code formatpainter table',
                        //toolbar_mode: 'floating',
                        //tinycomments_mode: 'embedded',
                        //tinycomments_author: 'Author name',
                        height: heightPixels,
                        file_picker_types: 'image',
                        image_description: false,
                        file_picker_callback: function (cb, value, meta) {
                            var input = document.createElement('input');
                            input.setAttribute('type', 'file');
                            input.setAttribute('accept', 'image/*');
                            /*
                              Note: In modern browsers input[type="file"] is functional without
                              even adding it to the DOM, but that might not be the case in some older
                              or quirky browsers like IE, so you might want to add it to the DOM
                              just in case, and visually hide it. And do not forget do remove it
                              once you do not need it anymore.
                            */
                            input.onchange = function (evt) {
                                // debugger; // This code gets called on uploaded file selection
                                var selectedFile = evt.target.files[0];
                                var reader = new FileReader();
                                reader.onload = function (fileObject) {
                                    /*
                                      Note: Now we need to register the blob in TinyMCEs image blob
                                      registry. In the next release this part hopefully won't be
                                      necessary, as we are looking to handle it internally.
                                    */
                                    var newBlobId = 'blobid' + (new Date()).getTime();
                                    var blobCache = tinymce.activeEditor.editorUpload.blobCache;
                                    var base64 = reader.result.split(',')[1];
                                    //console.log( "Image base64 size: " + base64.length );
                                    // If the image is larger than 1MB, let's downsize
                                    var OneMB = 1024 * 1024;
                                    if (base64.length > OneMB) {
                                        var tempImage_1 = new Image();
                                        tempImage_1.onload = function () {
                                            // access image size here 
                                            //console.log( "image width", tempImage.width );
                                            // Resize so the largest edge is 1k pixels
                                            var xScalar = 1000 / tempImage_1.width;
                                            var yScalar = 1000 / tempImage_1.height;
                                            var imageScalar = xScalar;
                                            if (yScalar < xScalar)
                                                imageScalar = yScalar;
                                            HtmlUtil2.resizeFromImgToBlob(tempImage_1, Math.round(tempImage_1.width * imageScalar), Math.round(tempImage_1.height * imageScalar), selectedFile.type).then(function (resizedBlob) {
                                                //console.log( "Resized image base64 size: " + resizedBlob.size );
                                                //const resizedTempImage = new Image();
                                                //resizedTempImage.onload = function()
                                                //{
                                                //    //console.log( "resized image width", resizedTempImage.width );
                                                //    var resizedReader = new FileReader();
                                                //    resizedReader.readAsDataURL( resizedBlob );
                                                //    resizedReader.onloadend = function()
                                                //    {
                                                //        const resizedFile = new File( [resizedBlob], selectedFile.name, resizedBlob )
                                                //        const resizedBase64 = ( resizedReader.result as string ).split( ',' )[1];
                                                //        const blobInfo = blobCache.create( newBlobId, resizedFile, resizedBase64 );
                                                //        blobCache.add( blobInfo );
                                                //        /* call the callback and populate the Title field with the file name */
                                                //        cb( blobInfo.blobUri(), { title: selectedFile.name } );
                                                //    }
                                                //};
                                                //var resizedImgUrl = URL.createObjectURL( resizedBlob );
                                                //resizedTempImage.src = resizedImgUrl;
                                                var resizedReader = new FileReader();
                                                resizedReader.readAsDataURL(resizedBlob);
                                                resizedReader.onloadend = function () {
                                                    var resizedFileObject = new File([resizedBlob], selectedFile.name, resizedBlob);
                                                    var resizedBase64 = resizedReader.result.split(',')[1];
                                                    var blobInfo = blobCache.create(newBlobId, resizedFileObject, resizedBase64);
                                                    blobCache.add(blobInfo);
                                                    /* call the callback and populate the Title field with the file name */
                                                    cb(blobInfo.blobUri(), { title: selectedFile.name });
                                                };
                                            });
                                        };
                                        tempImage_1.src = fileObject.target.result;
                                    }
                                    else {
                                        var blobInfo = blobCache.create(newBlobId, selectedFile, base64);
                                        blobCache.add(blobInfo);
                                        /* call the callback and populate the Title field with the file name */
                                        cb(blobInfo.blobUri(), { title: selectedFile.name });
                                    }
                                };
                                reader.readAsDataURL(selectedFile);
                            };
                            input.click();
                        },
                    }).then(function (e) {
                        resolve(e[0]);
                    });
                };
                // Need to delay a bit for TinyMCE to load in case the user is started from a fresh
                // page reload
                setTimeout(function () {
                    if (typeof (tinymce) === "undefined")
                        setTimeout(function () { return loadRtes(); }, 400);
                    else
                        loadRtes();
                }, 100);
            });
            return mcePromise;
        };
        // Matches YYYY-MM-ddThh:mm:ss.sssZ where .sss is optional
        //"2018-03-12T22:00:33"
        HtmlUtil2.iso8601RegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
        //static dotNetTimeRegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
        // Not sure how the Community Ally server differs from other .Net WebAPI apps, but this
        // regex is needed for the dates that come down
        HtmlUtil2.dotNetTimeRegEx2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/;
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

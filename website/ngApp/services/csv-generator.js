var Ally;
(function (Ally) {
    /**
     * Represents a column in a CSV spreadsheet
     */
    var CsvColumnDescriptor = /** @class */ (function () {
        function CsvColumnDescriptor() {
        }
        return CsvColumnDescriptor;
    }());
    Ally.CsvColumnDescriptor = CsvColumnDescriptor;
    function ValueToCsvValue(valueObj) {
        if (!valueObj)
            return "";
        var value = valueObj.toString();
        if (HtmlUtil.isNullOrWhitespace(value))
            return "";
        var needsEscaping = value.indexOf('"') !== -1
            || value.indexOf(',') !== -1
            || value.indexOf('\r') !== -1
            || value.indexOf('\n') !== -1;
        if (needsEscaping) {
            // Double the double quotes
            value = value.replace("\"", "\"\"");
            // Wrap the whole thing in quotes
            value = "\"" + value + "\"";
        }
        return value;
    }
    Ally.ValueToCsvValue = ValueToCsvValue;
    /**
     * Generate a CSV for client-side download
     */
    function createCsvString(itemArray, descriptorArray, includeHeader) {
        if (includeHeader === void 0) { includeHeader = true; }
        var csvText = "";
        // Write the header
        if (includeHeader) {
            for (var i = 0; i < descriptorArray.length; ++i) {
                if (i > 0)
                    csvText += ",";
                csvText += ValueToCsvValue(descriptorArray[i].headerText);
            }
        }
        // Write the rows
        for (var rowIndex = 0; rowIndex < itemArray.length; ++rowIndex) {
            csvText += "\n";
            var curRow = itemArray[rowIndex];
            for (var columnIndex = 0; columnIndex < descriptorArray.length; ++columnIndex) {
                if (columnIndex > 0)
                    csvText += ",";
                var curColumn = descriptorArray[columnIndex];
                var columnValue = curRow[curColumn.fieldName];
                if (curColumn.dataMapper)
                    columnValue = curColumn.dataMapper(columnValue);
                csvText += ValueToCsvValue(columnValue);
            }
        }
        return csvText;
    }
    Ally.createCsvString = createCsvString;
})(Ally || (Ally = {}));

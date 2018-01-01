namespace Ally
{
    /**
     * Represents a column in a CSV spreadsheet
     */
    export class CsvColumnDescriptor
    {
        fieldName: string;
        headerText: string;
        dataMapper?: ( data: any ) => void;
    }

    export function ValueToCsvValue( valueObj:any ) : string
    {
        if( !valueObj )
            return "";

        var value = valueObj.toString();
        if( HtmlUtil.isNullOrWhitespace( value ) )
            return "";

        var needsEscaping = value.indexOf( '"' ) !== -1
            || value.indexOf( ',' ) !== -1
            || value.indexOf( '\r' ) !== -1
            || value.indexOf( '\n' ) !== -1;

        if( needsEscaping )
        {
            // Double the double quotes
            value = value.replace( "\"", "\"\"" );

            // Wrap the whole thing in quotes
            value = "\"" + value + "\"";
        }

        return value;
    }


    /**
     * Generate a CSV for client-side download
     */
    export function createCsvString( itemArray: any[], descriptorArray: CsvColumnDescriptor[] )
    {
        var csvText = "";

        // Write the header
        for( let i = 0; i < descriptorArray.length; ++i )
        {
            if( i > 0 )
                csvText += ",";

            csvText += ValueToCsvValue( descriptorArray[i].headerText );
        }

        // Write the rows
        for( let rowIndex = 0; rowIndex < itemArray.length; ++rowIndex )
        {
            csvText += "\n";

            var curRow = itemArray[rowIndex];

            for( let columnIndex = 0; columnIndex < descriptorArray.length; ++columnIndex )
            {
                if( columnIndex > 0 )
                    csvText += ",";

                var curColumn = descriptorArray[columnIndex];

                var columnValue = curRow[curColumn.fieldName];

                if( curColumn.dataMapper )
                    columnValue = curColumn.dataMapper( columnValue );

                csvText += ValueToCsvValue( columnValue );
            }
        }

        return csvText;
    }
}
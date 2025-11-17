// eslint-disable-next-line no-var
declare var Quill: any;


namespace Ally
{
    /**
     * The controller for editing an E-form template
     */
    export class EditEformTemplateController implements ng.IController
    {
        static $inject = ["$http", "fellowResidents", "$location", "$routeParams", "$timeout"];
        isLoading: boolean = false;
        template: EformTemplateDto;
        instructionsQuill: any;
        committeeOptions: Committee[] = [];


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private fellowResidents: Ally.FellowResidentsService,
            private $location: ng.ILocationService,
            private $routeParams: IEditEformTemplateRouteParams,
            private $timeout: ng.ITimeoutService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.loadTemplate();
        }


        addSection()
        {
            const newSection = new EformTemplateSection();

            // The first section always needs whoFillsOut set to reporter
            if( this.template.sections.length === 0 )
                newSection.whoFillsOut = "reporter";
            else
                newSection.whoFillsOut = "anyBoardOrAdmin";

            this.template.sections.push( newSection );
        }


        loadCommitteeOptions()
        {
            this.committeeOptions = [];
        }


        loadTemplate()
        {
            this.isLoading = true;

            this.$http.get( "/api/EformTemplate/ByIdForEdit/" + this.$routeParams.templateId ).then(
                ( response: ng.IHttpPromiseCallbackArg<EformTemplateDto> ) =>
                {
                    this.isLoading = false;
                    this.template = response.data;
                    EformTemplateDto.parseSectionFields( this.template );

                    // Populate multiValueOptionsString
                    for( const curSection of this.template.sections )
                    {
                        for( const curField of curSection.parsedFields )
                        {
                            if( curField.multiValueOptions && Array.isArray( curField.multiValueOptions ) && curField.multiValueOptions.length > 0 )
                                curField.multiValueOptionsString = curField.multiValueOptions.join( "," );
                        }
                    }

                    this.$timeout( () =>
                    {
                        //const quill = new Quill( '#formInstructionsText', {
                        this.instructionsQuill = new Quill( '#formInstructionsText', {
                            theme: 'snow'
                        } );

                        if( this.template.formInstructions )
                        {
                            const instructionsDelta = this.instructionsQuill.clipboard.convert( { html: this.template.formInstructions } );
                            this.instructionsQuill.setContents( instructionsDelta, "silent" );
                        }
                    }, 10 );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to load template: " + response.data.exceptionMessage );
                    this.$location.path( "/Admin/EformTemplateListing" );
                }
            );
        }


        saveTemplate()
        {
            this.template.formInstructions = this.instructionsQuill.getSemanticHTML();
            this.isLoading = true;

            // Serialize fields to JSON for saving
            for( const curSection of this.template.sections )
            {
                curSection.fieldsJson = JSON.stringify( curSection.parsedFields );
                delete curSection.parsedFields;
            }

            this.$http.put( "/api/EformTemplate/UpdateTemplate", this.template ).then(
                () =>
                {
                    this.isLoading = false;
                    this.$location.path( "/Admin/EformTemplateListing" );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    EformTemplateDto.parseSectionFields( this.template );
                    this.isLoading = false;
                    alert( "Failed to save template: " + response.data.exceptionMessage );
                }
            );
        }


        addField( curSection: EformTemplateSection )
        {
            const newField = new EformFieldTemplate();
            newField.type = "shortText"; // Default to the most common field type
            curSection.parsedFields.push( newField );
        }


        /** Replace a character with another string */
        static stringReplaceAt = function( str: string, index: number, replacement: string )
        {
            return str.substring( 0, index ) + replacement + str.substring( index + replacement.length );
        }


        /**
        * Convert a string to a camel case identifer
        */
        static makeSlug( source: string, maxLength: number )
        {
            if( HtmlUtil.isNullOrWhitespace( source ) )
                return "";

            let adjustedLabel = source.trim().toLowerCase();

            // Remove non-alpha characters
            adjustedLabel = adjustedLabel.replace( /[^a-z ]/gi, "" );

            // Remove common words
            const commonWords = ["a", "for", "and", "but", "of", "to", "is", "the", "there", "have", "are", "at", "in", "be"];
            for( let i = 0; i < commonWords.length; ++i )
                adjustedLabel = adjustedLabel.replace( " " + commonWords[i] + " ", " " );

            // Make letters after spaces upper case
            for( let i = 1; i < adjustedLabel.length; ++i )
            {
                if( adjustedLabel[i] === " " && i < adjustedLabel.length - 1 )
                    adjustedLabel = EditEformTemplateController.stringReplaceAt( adjustedLabel, i + 1, adjustedLabel[i + 1].toUpperCase() );
            }

            // Remove spaces
            adjustedLabel = adjustedLabel.replace( /[ ]/gi, "" );

            // Make the first character lower case
            if( !HtmlUtil.isNullOrWhitespace( adjustedLabel ) )
            {
                adjustedLabel = adjustedLabel[0].toLowerCase() + adjustedLabel.substring( 1 );

                if( maxLength > 0 && adjustedLabel.length > maxLength )
                    adjustedLabel = adjustedLabel.substring( 0, maxLength );
            }

            return adjustedLabel;
        }


        getAllFields(): EformFieldTemplate[]
        {
            if( !this.template || !this.template.sections || this.template.sections.length === 0 )
                return [];

            let allFields: EformFieldTemplate[] = [];

            for( const curSection of this.template.sections )
                allFields = allFields.concat( curSection.parsedFields );

            return allFields;
        }


        /*
        * If empty
        */
        autoSetFieldSlug( field: EformFieldTemplate )
        {
            // If the field doesn't have a label or already has a slug, don't overwrite it
            if( HtmlUtil.isNullOrWhitespace( field.label ) || !HtmlUtil.isNullOrWhitespace( field.slug ) )
                return;

            const maxFieldValueNameLength = 128;
            field.slug = EditEformTemplateController.makeSlug( field.label, maxFieldValueNameLength );

            // Try to keep it a manageable length
            if( field.slug && field.slug.length > 32 )
            {
                const isUppercase = ( aCharacter: string ) => ( aCharacter >= 'A' ) && ( aCharacter <= 'Z' );

                // Find the next uppercase letter
                let charIndex = 32;
                for( ; charIndex < field.slug.length; ++charIndex )
                {
                    if( isUppercase( field.slug[charIndex] ) )
                        break;
                }

                if( charIndex < field.slug.length )
                {
                    field.slug = field.slug.substring( 0, charIndex - 1 );

                    const allSlugsExceptThis = this.getAllFields().filter( f => f.slug && f.slug.length > 0 && f !== field ).map( f => f.slug );
                    if( allSlugsExceptThis.indexOf( field.slug ) > -1 )
                    {
                        // This field name is in use so make a unique name with a numeric suffix
                        let numericSuffix = 1;
                        while( allSlugsExceptThis.indexOf( field.slug + numericSuffix ) > -1 )
                            ++numericSuffix;

                        field.slug = field.slug + numericSuffix;
                    }
                }
            }
        }


        checkFieldSlugUnique( curField: EformFieldTemplate )
        {
            curField.duplicateSlugMessage = null;

            if( !curField.slug )
            {
                curField.duplicateSlugMessage = "Slug is required for fields to save";
                return;
            }

            const allFields = this.getAllFields();

            const fieldsWithSlug = allFields.filter( f => f.slug === curField.slug );

            if( fieldsWithSlug.length > 1 )
            {
                curField.duplicateSlugMessage = `This slug (${curField.slug}) is in use by multiple fields: '${fieldsWithSlug.map(f=>f.label).join("', '")}'`;
            }
            else
                curField.duplicateSlugMessage = null;
        }


        removeField( section: EformTemplateSection, field: EformFieldTemplate )
        {
            const fieldIndex = section.parsedFields.indexOf( field );
            if( fieldIndex < 0 )
            {
                alert( "Invalid field" );
                return;
            }

            section.parsedFields.splice( fieldIndex, 1 );
        }


        removeSection( section: EformTemplateSection )
        {
            if( section.parsedFields.length > 0 )
            {
                if( !confirm( "Are you sure you want to remove this section? You can't recover it." ) )
                    return;
            }

            const sectionIndex = this.template.sections.indexOf( section );
            if( sectionIndex < 0 )
            {
                alert( "Invalid section" );
                return;
            }

            this.template.sections.splice( sectionIndex, 1 );
        }


        onMultiValueOptionsChange( curField: EformFieldTemplate )
        {
            if( HtmlUtil.isNullOrWhitespace( curField.multiValueOptionsString ) )
                delete curField.multiValueOptions;
            else
                curField.multiValueOptions = curField.multiValueOptionsString.split( "," );
        }
    }


    interface IEditEformTemplateRouteParams extends ng.route.IRouteParamsService
    {
        templateId: string;
    }
}

CA.angularApp.component( "editEformTemplate", {
    bindings: {
    },
    templateUrl: "/ngApp/common/eforms/edit-eform-template.html",
    controller: Ally.EditEformTemplateController
} );

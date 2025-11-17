namespace Ally
{
    /**
     * The controller for working on an E-form instance
     */
    export class ViewEformInstanceController implements ng.IController
    {
        static $inject = ["$http", "fellowResidents", "$location", "$routeParams", "SiteInfo"];
        isCreate = false;
        isLoading: boolean = false;
        instance: EformInstanceDto;
        sectionEntries: EformSectionEntry[];
        isSiteManager = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private fellowResidents: Ally.FellowResidentsService,
            private $location: ng.ILocationService,
            private $routeParams: IViewEformTemplateRouteParams,
            private siteInfo: Ally.SiteInfoService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isCreate = this.$location.path().includes( "CreateEform" );

            if( this.isCreate )
                this.loadTemplate();
            else
                this.loadInstance();

            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
        }


        prepareSectionsAndFields()
        {
            if( !this.instance && !this.instance.template )
            {
                alert( "Form data is unavailable, please refresh the page and contact support if the error persists" );
                return;
            }

            this.sectionEntries = [];
            for( const curTemplateSection of this.instance.template.sections )
            {
                let curInstanceSection = this.instance.sections.find( s => s.eformTemplateSectionId === curTemplateSection.eformTemplateSectionId );
                if( !curInstanceSection )
                {
                    //if( !this.isCreate )
                    //{
                    //    alert( `Form is in an error state, please contact support (${this.isCreate}, ${this.$routeParams.templateOrInstanceId}` );
                    //    return;
                    //}

                    curInstanceSection = new EformInstanceSection();
                    curInstanceSection.eformTemplateSectionId = curTemplateSection.eformTemplateSectionId;
                    curInstanceSection.canLoggedInUserEdit = this.isCreate && curTemplateSection.sectionOrder === 0;
                    curInstanceSection.fieldValuesJson = "[]";
                    curInstanceSection.parsedFieldValues = [];
                }

                const newSectionEntry: EformSectionEntry = {
                    isActiveSection: ( this.isCreate && curTemplateSection.sectionOrder === 0 ) || ( !this.isCreate && this.instance.activeSectionIndex === curTemplateSection.sectionOrder ),
                    template: curTemplateSection,
                    instance: curInstanceSection,
                    fieldPairs: []
                };

                for( const curTemplateField of curTemplateSection.parsedFields )
                {
                    let curInstanceField = curInstanceSection.parsedFieldValues.find( f => f.slug === curTemplateField.slug );
                    if( !curInstanceField )
                    {
                        curInstanceField = new EformFieldInstance();
                        curInstanceField.slug = curTemplateField.slug;
                        curInstanceField.valuesJson = curTemplateField.defaultValue;
                        curInstanceSection.parsedFieldValues.push( curInstanceField );
                    }

                    const newFieldEntry: EformFieldEntry = {
                        template: curTemplateField,
                        instance: curInstanceField
                    };

                    newSectionEntry.fieldPairs.push( newFieldEntry );
                }

                this.sectionEntries.push( newSectionEntry );
            }
        }


        isValidAssignee( currentAssignedUserOrGroup: string )
        {
            if( !currentAssignedUserOrGroup )
                return false;

            if( currentAssignedUserOrGroup.startsWith( "userId:" ) )
            return false;
        }


        loadInstance()
        {
            this.isLoading = true;

            this.$http.get( "/api/EformInstance/GetInstance/" + this.$routeParams.templateOrInstanceId ).then(
                ( response: ng.IHttpPromiseCallbackArg<EformInstanceDto> ) =>
                {
                    this.isLoading = false;
                    this.instance = response.data;
                    EformInstanceDto.parseSectionFields( this.instance );

                    this.prepareSectionsAndFields();

                    this.fellowResidents.getResidents().then( r => EformInstanceListingController.populateUserNameLabels( r, this.instance ) );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to load template: " + response.data.exceptionMessage );
                    this.$location.path( "/Admin/EformTemplateListing" );
                }
            );
        }


        loadTemplate()
        {
            this.isLoading = true;

            this.$http.get( "/api/EformInstance/TemplateForCreate/" + this.$routeParams.templateOrInstanceId ).then(
                ( response: ng.IHttpPromiseCallbackArg<EformTemplateDto> ) =>
                {
                    this.isLoading = false;
                    
                    this.instance = new EformInstanceDto();
                    this.instance.template = response.data;
                    this.instance.currentAssignedUserOrGroup = EformInstanceListingController.AssignToUserPrefix + this.siteInfo.userInfo.userId;
                    this.instance.activeSectionIndex = 0;
                    this.instance.assignedToLabel = this.siteInfo.userInfo.fullName;
                    this.instance.formStatus = EformInstanceDto.StatusDraft;
                    this.instance.groupId = this.siteInfo.publicSiteInfo.groupId;
                    this.instance.submitterUserId = this.siteInfo.userInfo.userId;
                    this.instance.submitterLabel = this.siteInfo.userInfo.fullName;
                    this.instance.eformTemplateId = this.instance.template.eformTemplateId;
                    this.instance.sections = [];
                    EformInstanceDto.parseSectionFields( this.instance );

                    this.prepareSectionsAndFields();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to load template: " + response.data.exceptionMessage );
                    this.$location.path( "/Admin/EformTemplateListing" );
                }
            );
        }


        getEmptyRequiredFields( curSection: EformSectionEntry ): EformFieldEntry[]
        {
            const emptyFields: EformFieldEntry[] = [];

            for( const curFieldPair of curSection.fieldPairs )
            {
                if( curFieldPair.template.isRequired )
                {
                    if( HtmlUtil.isNullOrWhitespace( curFieldPair.instance.valuesJson ) )
                        emptyFields.push( curFieldPair );
                }
            }

            return emptyFields;
        }


        saveSection( curSection: EformSectionEntry, isComplete: boolean )
        {
            // We should only be able to save the current active section, but we can let the server check on that

            const missingRequiredFields = this.getEmptyRequiredFields( curSection );
            if( missingRequiredFields.length > 0 )
            {
                const errorMessage = `The following required fields are missing values:\n` + missingRequiredFields.map( f => f.template.label ).join( "\n- " );
                alert( errorMessage );
                return;
            }

            curSection.instance.sectionStatus = isComplete ? "complete" : "draft"
            curSection.instance.fieldValuesJson = JSON.stringify( curSection.instance.parsedFieldValues );

            const postUri = "/api/EformInstance/" + (this.isCreate ? ("CreateInstance/" + this.instance.eformTemplateId) : ("UpdateInstance/" + this.instance.eformInstanceId));

            let postData: any;
            if( this.isCreate )
            {
                postData = {
                    eformInstanceSectionId: 0,
                    eformInstanceId: "00000000-0000-0000-0000-000000000000",
                    eformTemplateSectionId: curSection.instance.eformTemplateSectionId,
                    sectionStatus: curSection.instance.sectionStatus,
                    fieldValuesJson: curSection.instance.fieldValuesJson
                };
            }
            else
            {
                postData = {
                    eformInstanceSectionId: curSection.instance.eformInstanceSectionId,
                    eformInstanceId: this.instance.eformInstanceId,
                    eformTemplateSectionId: curSection.instance.eformTemplateSectionId,
                    sectionStatus: curSection.instance.sectionStatus,
                    fieldValuesJson: curSection.instance.fieldValuesJson
                };
            }

            this.isLoading = true;
            this.$http.post( postUri, postData ).then(
                () =>
                {
                    this.isLoading = false;
                    this.$location.path( "/Home" );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to save form: " + response.data.exceptionMessage );
                }
            );
        }


        deleteForm()
        {
            if( !confirm( "Are you sure you want to delete this form? It is permanent and cannot be recovered." ) )
                return;

            this.isLoading = true;
            this.$http.delete( "/api/EformInstance/PermanentlyDelete/" + this.$routeParams.templateOrInstanceId ).then(
                () =>
                {
                    this.isLoading = false;
                    this.$location.path( "/Home" );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to delete form: " + response.data.exceptionMessage );
                }
            );
        }
    }


    export class EformFieldInstance
    {
        slug: string;
        valuesJson: any;
        enteredByUserId: string;
        lastEditDateUtc: Date;
    }


    export class EformInstanceSection
    {
        eformInstanceSectionId: number = 0;
        eformInstanceId: string;
        eformTemplateSectionId: number;
        sectionStatus: "not-started" | "complete" | "draft" = "not-started";
        fieldValuesJson: string;
        lastEditUserId: string | null;
        lastEditDateUtc: string | null;
        canLoggedInUserEdit: boolean;

        // Not from the server
        parsedFieldValues: EformFieldInstance[] = [];
        lastEditUserLabel: string;

        static parseFields( section: EformInstanceSection )
        {
            section.parsedFieldValues = JSON.parse( section.fieldValuesJson );
        }
    }


    export class EformInstanceDto
    {
        static readonly StatusDraft = "draft";
        static readonly StatusActive = "active";
        static readonly StatusComplete = "complete";
        
        eformInstanceId: string;
        eformTemplateId: number;
        groupId: number;
        formStatus: "draft" | "active" | "complete";
        submitterUserId: string;
        submitDateUtc: string;
        associatedUnitId: number | null;
        currentAssignedUserOrGroup: string | null;
        formResult: string;
        activeSectionIndex: number | null;
        lastUpdateDateUtc: string | null;
        template: EformTemplateDto;
        sections: EformInstanceSection[] = [];

        // Populated locally, not from the server
        submitterLabel: string;
        assignedToLabel: string;

        /// Parse the JSON field data for all sections in the instance and its template
        static parseSectionFields( instance: EformInstanceDto )
        {
            for( const curSection of instance.sections )
                EformInstanceSection.parseFields( curSection );

            EformTemplateDto.parseSectionFields( instance.template );
        }
    }


    interface IViewEformTemplateRouteParams extends ng.route.IRouteParamsService
    {
        templateOrInstanceId: string;
    }


    export class EformFieldEntry
    {
        template: EformFieldTemplate;
        instance: EformFieldInstance;
    }


    class EformSectionEntry
    {
        isActiveSection: boolean;
        template: EformTemplateSection;
        instance: EformInstanceSection;
        fieldPairs: EformFieldEntry[]
    }
}

CA.angularApp.component( "viewEformInstance", {
    bindings: {
    },
    templateUrl: "/ngApp/common/eforms/view-eform-instance.html",
    controller: Ally.ViewEformInstanceController
} );

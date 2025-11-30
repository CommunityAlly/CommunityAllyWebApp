namespace Ally
{
    /**
     * The controller for viewing available E-form templates
     */
    export class EformTemplateListingController implements ng.IController
    {
        static $inject = ["$http", "fellowResidents", "$location", "SiteInfo", "$timeout"];
        isLoading: boolean = false;
        allTemplates: EformTemplateDto[] = [];
        shouldShowImportTemplates: boolean = false;
        catalogTemplates: EformTemplateCatalogItem[] = [];
        selectedCatalogTemplate: EformTemplateCatalogItem | null = null;
        isSuperAdmin = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private fellowResidents: Ally.FellowResidentsService,
            private $location: ng.ILocationService,
            private siteInfo: Ally.SiteInfoService,
            private $timeout: ng.ITimeoutService )
        {
        }
        

        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;

            this.loadGroupTemplates();
        }


        loadGroupTemplates()
        {
            this.isLoading = true;

            this.$http.get( "/api/EformTemplate/FullTemplateList" ).then(
                ( response: ng.IHttpPromiseCallbackArg<EformTemplateDto[]> ) =>
                {
                    this.isLoading = false;
                    this.allTemplates = _.sortBy( response.data, t => t.templateName.toUpperCase() );

                    // Delay a bit to let the UI setup
                    this.$timeout( () => this.loadCatalogTemplates(), 50 );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to load template: " + response.data.exceptionMessage );
                }
            );
        }


        loadCatalogTemplates()
        {
            this.$http.get( "/api/EformTemplate/CatalogTemplateList" ).then(
                ( response: ng.IHttpPromiseCallbackArg<EformTemplateCatalogItem[]> ) =>
                {
                    this.catalogTemplates = _.sortBy( response.data, t => t.templateName.toUpperCase() );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    console.log( "Failed to load catalog templates: " + response.data.exceptionMessage );
                }
            );
        }


        createNewTemplate()
        {
            const newTemplateName = prompt( "Enter a name for the new template: (You can change this anytime)" );
            if( !newTemplateName )
                return;

            this.isLoading = true;

            this.$http.post( "/api/EformTemplate/CreateNewTemplate?name=" + encodeURIComponent(newTemplateName), null ).then(
                ( response: ng.IHttpPromiseCallbackArg<EformTemplateDto>) =>
                {
                    this.isLoading = false;
                    this.$location.path( "/EditEformTemplate/" + response.data.eformTemplateId );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to create template: " + response.data.exceptionMessage );
                }
            );
        }


        onTemplateEnabledToggle( template: EformTemplateDto )
        {
            //console.log( "template.isEnabled", template.isEnabled );

            this.isLoading = true;

            this.$http.put( `/api/EformTemplate/SetTemplateEnabled/${template.eformTemplateId}/${template.isEnabled}`, null ).then(
                () =>
                {
                    this.isLoading = false;
                    this.loadGroupTemplates();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to create template: " + response.data.exceptionMessage );
                }
            );
        }


        deleteTemplate( template: EformTemplateDto )
        {
            if( !confirm( `Are you sure you want to remove the '${template.templateName}' template?` ) )
                return;

            const deleteUri = `/api/EformTemplate/DeleteTemplate/${template.eformTemplateId}`;

            this.$http.delete( deleteUri ).then(
                () =>
                {
                    this.isLoading = false;
                    this.loadGroupTemplates();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to delete template: " + response.data.exceptionMessage );
                }
            );
        }


        importSelectedTemplate( eformTemplateId: number, overrideTemplateName: string = null )
        {
            this.isLoading = true;

            const getUri = `/api/EformTemplate/CloneTemplate/${eformTemplateId}` + ( overrideTemplateName ? `?overrideTemplateName=${encodeURIComponent( overrideTemplateName )}` : "" );

            this.$http.get( getUri ).then(
                () =>
                {
                    this.shouldShowImportTemplates = false;
                    this.selectedCatalogTemplate = null;

                    this.isLoading = false;
                    this.loadGroupTemplates();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to clone template: " + response.data.exceptionMessage );
                }
            );
        }


        cloneCatalogTemplate()
        {
            this.importSelectedTemplate( this.selectedCatalogTemplate.eformTemplateId );
        }


        cloneGroupTemplate( curTemplate: EformTemplateDto )
        {
            let overrideTemplateName = "Clone of " + curTemplate.templateName;
            overrideTemplateName = prompt( "Enter a name for the cloned template:", overrideTemplateName );
            if( !overrideTemplateName )
                return;

            this.importSelectedTemplate( curTemplate.eformTemplateId, overrideTemplateName );
        }
    }


    export class EformFieldTemplate
    {
        slug: string;
        label: string;
        noteText: string;
        type: "shortText" | "longText" | "assignee" | "dateOnly" | "timeOnly" | "number" | "radio" | "checkboxList" | "fileAttachment" | "richTextLabel" | "ownerHomePicker" | "allHomePicker" | "memberPicker";
        typeParam: string;
        defaultValue: string;
        multiValueOptions: string[];
        isRequired: boolean;
        visibleConditionJs: string;

        // Used locally while editing
        multiValueOptionsString: string;
        duplicateSlugMessage: string;
    }


    export class EformTemplateSection
    {
        eformTemplateSectionId: number;
        eformTemplateId: number;
        sectionName: string;
        whoFillsOut: "reporter" | "president" | "secretary" | "treasurer" | "anyBoard" | "anyBoardOrAdmin" | "userId:{USERID}" | "memberPicker:{slug}";
        fieldsJson: string;
        sectionOrder: number;

        // Not from the server, used byt the editor
        parsedFields: EformFieldTemplate[] = [];
        whoFillsOutOptions: LabelValuePair[];

        static parseFields( section: EformTemplateSection )
        {
            section.parsedFields = JSON.parse( section.fieldsJson );
        }
    }


    export class LabelValuePair
    {
        displayLabel: string;
        value: string;
    }


    export class EformTemplateDto
    {
        eformTemplateId: number;
        groupId: number;
        templateName: string;
        whoCanCreate: "anyone" | "owners" | "anyBoard" | "anyBoardOrAdmin";
        defaultAssigneee: string; // Looks like president, secretary, treasurer, anyBoard, anyBoardOrAdmin, userId:{USERID}
        formInstructions: string;
        createDateUtc: string;
        creatorUserId: string;
        deletedDateUtc: string | null;
        deletorUserId: string | null;
        isEnabled: boolean;
        isChatEnabled: boolean;
        numInstances: number;
        isAnonymous: boolean;
        isCatalogTemplate: boolean;
        catalogDescriptionHtml: string;
        sections: EformTemplateSection[];


        static parseSectionFields( template: EformTemplateDto )
        {
            for( const curSection of template.sections )
                EformTemplateSection.parseFields( curSection );
        }
    }


    class EformTemplateCatalogItem
    {
        eformTemplateId: number;
        templateName: string;
        catalogDescriptionHtml: string;
    }
}

CA.angularApp.component( "eformTemplateListing", {
    bindings: {
    },
    templateUrl: "/ngApp/common/eforms/eform-template-listing.html",
    controller: Ally.EformTemplateListingController
} );

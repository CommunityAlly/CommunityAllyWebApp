namespace Ally
{
    /**
     * The controller for viewing available E-form templates
     */
    export class EformTemplateListingController implements ng.IController
    {
        static $inject = ["$http", "fellowResidents", "$location"];
        isLoading: boolean = false;
        allTemplates: EformTemplateDto[] = [];


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private fellowResidents: Ally.FellowResidentsService,
            private $location: ng.ILocationService )
        {
        }
        

        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.loadTemplates();
        }


        loadTemplates()
        {
            this.isLoading = true;

            this.$http.get( "/api/EformTemplate/FullTemplateList" ).then(
                ( response: ng.IHttpPromiseCallbackArg<EformTemplateDto[]> ) =>
                {
                    this.isLoading = false;
                    this.allTemplates = response.data;
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to load template: " + response.data.exceptionMessage );
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
                    this.$location.path( "/Admin/EditEformTemplate/" + response.data.eformTemplateId );
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
                    this.loadTemplates();
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
        }
    }


    export class EformFieldTemplate
    {
        slug: string;
        label: string;
        noteText: string;
        type: "shortText" | "longText" | "assignee" | "dateOnly" | "dateTime" | "timeOnly" | "number" | "radio" | "checkboxList" | "fileAttachment" | "richTextLabel" | "ownerHomePicker" | "allHomePicker";
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
        whoFillsOut: "reporter" | "president" | "secretary" | "treasurer" | "anyBoard" | "anyBoardOrAdmin" | "userId:{USERID}";
        fieldsJson: string;
        sectionOrder: number;

        // Not from the server
        parsedFields: EformFieldTemplate[] = [];


        static parseFields( section: EformTemplateSection )
        {
            section.parsedFields = JSON.parse( section.fieldsJson );
        }
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
        sections: EformTemplateSection[];


        static parseSectionFields( template: EformTemplateDto )
        {
            for( const curSection of template.sections )
                EformTemplateSection.parseFields( curSection );
        }
    }
}

CA.angularApp.component( "eformTemplateListing", {
    bindings: {
    },
    templateUrl: "/ngApp/common/eforms/eform-template-listing.html",
    controller: Ally.EformTemplateListingController
} );

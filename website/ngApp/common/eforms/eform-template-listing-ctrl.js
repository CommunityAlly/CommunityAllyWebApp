var Ally;
(function (Ally) {
    /**
     * The controller for viewing available E-form templates
     */
    class EformTemplateListingController {
        /**
         * The constructor for the class
         */
        constructor($http, fellowResidents, $location) {
            this.$http = $http;
            this.fellowResidents = fellowResidents;
            this.$location = $location;
            this.isLoading = false;
            this.allTemplates = [];
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.loadTemplates();
        }
        loadTemplates() {
            this.isLoading = true;
            this.$http.get("/api/EformTemplate/FullTemplateList").then((response) => {
                this.isLoading = false;
                this.allTemplates = response.data;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to load template: " + response.data.exceptionMessage);
            });
        }
        createNewTemplate() {
            const newTemplateName = prompt("Enter a name for the new template: (You can change this anytime)");
            if (!newTemplateName)
                return;
            this.isLoading = true;
            this.$http.post("/api/EformTemplate/CreateNewTemplate?name=" + encodeURIComponent(newTemplateName), null).then((response) => {
                this.isLoading = false;
                this.$location.path("/Admin/EditEformTemplate/" + response.data.eformTemplateId);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to create template: " + response.data.exceptionMessage);
            });
        }
        onTemplateEnabledToggle(template) {
            //console.log( "template.isEnabled", template.isEnabled );
            this.isLoading = true;
            this.$http.put(`/api/EformTemplate/SetTemplateEnabled/${template.eformTemplateId}/${template.isEnabled}`, null).then(() => {
                this.isLoading = false;
                this.loadTemplates();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to create template: " + response.data.exceptionMessage);
            });
        }
        deleteTemplate(template) {
            if (!confirm(`Are you sure you want to remove the '${template.templateName}' template?`))
                return;
        }
    }
    EformTemplateListingController.$inject = ["$http", "fellowResidents", "$location"];
    Ally.EformTemplateListingController = EformTemplateListingController;
    class EformFieldTemplate {
    }
    Ally.EformFieldTemplate = EformFieldTemplate;
    class EformTemplateSection {
        constructor() {
            // Not from the server
            this.parsedFields = [];
        }
        static parseFields(section) {
            section.parsedFields = JSON.parse(section.fieldsJson);
        }
    }
    Ally.EformTemplateSection = EformTemplateSection;
    class EformTemplateDto {
        static parseSectionFields(template) {
            for (const curSection of template.sections)
                EformTemplateSection.parseFields(curSection);
        }
    }
    Ally.EformTemplateDto = EformTemplateDto;
})(Ally || (Ally = {}));
CA.angularApp.component("eformTemplateListing", {
    bindings: {},
    templateUrl: "/ngApp/common/eforms/eform-template-listing.html",
    controller: Ally.EformTemplateListingController
});

var Ally;
(function (Ally) {
    /**
     * The controller for viewing available E-form templates
     */
    class EformTemplateListingController {
        /**
         * The constructor for the class
         */
        constructor($http, fellowResidents, $location, siteInfo, $timeout) {
            this.$http = $http;
            this.fellowResidents = fellowResidents;
            this.$location = $location;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.isLoading = false;
            this.allTemplates = [];
            this.shouldShowImportTemplates = false;
            this.catalogTemplates = [];
            this.selectedCatalogTemplate = null;
            this.isSuperAdmin = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;
            //this.catalogTemplates = [
            //    {
            //        eformTemplateId: 1,
            //        templateName: "Maintenance Request 0",
            //        catalogDescriptionHtml: "A basic incident report form for reporting issues. Test <b>bold</b> nice. Test <b>bold</b> nice. Test <b>bold</b> nice."
            //    },
            //    {
            //        eformTemplateId: 2,
            //        templateName: "Maintenance Request 1",
            //        catalogDescriptionHtml: "A basic incident report form for reporting issues. Test <b>bold</b> nice. Test <b>bold</b> nice. Test <b>bold</b> nice."
            //    },
            //    {
            //        eformTemplateId: 3,
            //        templateName: "Maintenance Request 2",
            //        catalogDescriptionHtml: "A basic incident report form for reporting issues."
            //    },
            //    {
            //        eformTemplateId: 1,
            //        templateName: "Maintenance Request 3",
            //        catalogDescriptionHtml: "A basic incident report form for reporting issues. Test <b>bold</b> nice. Test <b>bold</b> nice. Test <b>bold</b> nice."
            //    },
            //    {
            //        eformTemplateId: 1,
            //        templateName: "Maintenance Request 4",
            //        catalogDescriptionHtml: "A basic incident report form for reporting issues. Test <b>bold</b> nice. Test <b>bold</b> nice. Test <b>bold</b> nice."
            //    }
            //];
            this.loadGroupTemplates();
        }
        loadGroupTemplates() {
            this.isLoading = true;
            this.$http.get("/api/EformTemplate/FullTemplateList").then((response) => {
                this.isLoading = false;
                this.allTemplates = response.data;
                // Delay a bit to let the UI setup
                this.$timeout(() => this.loadCatalogTemplates(), 50);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to load template: " + response.data.exceptionMessage);
            });
        }
        loadCatalogTemplates() {
            this.$http.get("/api/EformTemplate/CatalogTemplateList").then((response) => {
                this.catalogTemplates = response.data;
            }, (response) => {
                this.isLoading = false;
                console.log("Failed to load catalog templates: " + response.data.exceptionMessage);
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
                this.loadGroupTemplates();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to create template: " + response.data.exceptionMessage);
            });
        }
        deleteTemplate(template) {
            if (!confirm(`Are you sure you want to remove the '${template.templateName}' template?`))
                return;
            const deleteUri = `/api/EformTemplate/DeleteTemplate/${template.eformTemplateId}`;
            this.$http.delete(deleteUri).then(() => {
                this.isLoading = false;
                this.loadGroupTemplates();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to delete template: " + response.data.exceptionMessage);
            });
        }
        importSelectedTemplate(eformTemplateId, overrideTemplateName = null) {
            this.isLoading = true;
            const getUri = `/api/EformTemplate/CloneTemplate/${eformTemplateId}` + (overrideTemplateName ? `?overrideTemplateName=${encodeURIComponent(overrideTemplateName)}` : "");
            this.$http.get(getUri).then(() => {
                this.shouldShowImportTemplates = false;
                this.selectedCatalogTemplate = null;
                this.isLoading = false;
                this.loadGroupTemplates();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to clone template: " + response.data.exceptionMessage);
            });
        }
        cloneCatalogTemplate() {
            this.importSelectedTemplate(this.selectedCatalogTemplate.eformTemplateId);
        }
        cloneGroupTemplate(curTemplate) {
            let overrideTemplateName = "Clone of " + curTemplate.templateName;
            overrideTemplateName = prompt("Enter a name for the cloned template:", overrideTemplateName);
            if (!overrideTemplateName)
                return;
            this.importSelectedTemplate(curTemplate.eformTemplateId, overrideTemplateName);
        }
    }
    EformTemplateListingController.$inject = ["$http", "fellowResidents", "$location", "SiteInfo", "$timeout"];
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
    class EformTemplateCatalogItem {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("eformTemplateListing", {
    bindings: {},
    templateUrl: "/ngApp/common/eforms/eform-template-listing.html",
    controller: Ally.EformTemplateListingController
});

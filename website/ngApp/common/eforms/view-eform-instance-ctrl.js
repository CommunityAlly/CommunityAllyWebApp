var Ally;
(function (Ally) {
    /**
     * The controller for working on an E-form instance
     */
    class ViewEformInstanceController {
        /**
         * The constructor for the class
         */
        constructor($http, fellowResidents, $location, $routeParams, siteInfo) {
            this.$http = $http;
            this.fellowResidents = fellowResidents;
            this.$location = $location;
            this.$routeParams = $routeParams;
            this.siteInfo = siteInfo;
            this.isCreate = false;
            this.isLoading = false;
            this.isSiteManager = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isCreate = this.$location.path().includes("CreateEform");
            if (this.isCreate)
                this.loadTemplate();
            else
                this.loadInstance();
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
        }
        prepareSectionsAndFields() {
            if (!this.instance && !this.instance.template) {
                alert("Form data is unavailable, please refresh the page and contact support if the error persists");
                return;
            }
            this.sectionEntries = [];
            for (const curTemplateSection of this.instance.template.sections) {
                let curInstanceSection = this.instance.sections.find(s => s.eformTemplateSectionId === curTemplateSection.eformTemplateSectionId);
                if (!curInstanceSection) {
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
                const newSectionEntry = {
                    isActiveSection: (this.isCreate && curTemplateSection.sectionOrder === 0) || (!this.isCreate && this.instance.activeSectionIndex === curTemplateSection.sectionOrder),
                    template: curTemplateSection,
                    instance: curInstanceSection,
                    fieldPairs: []
                };
                for (const curTemplateField of curTemplateSection.parsedFields) {
                    let curInstanceField = curInstanceSection.parsedFieldValues.find(f => f.slug === curTemplateField.slug);
                    if (!curInstanceField) {
                        curInstanceField = new EformFieldInstance();
                        curInstanceField.slug = curTemplateField.slug;
                        curInstanceField.valuesJson = curTemplateField.defaultValue;
                        curInstanceSection.parsedFieldValues.push(curInstanceField);
                    }
                    const newFieldEntry = {
                        template: curTemplateField,
                        instance: curInstanceField
                    };
                    newSectionEntry.fieldPairs.push(newFieldEntry);
                }
                this.sectionEntries.push(newSectionEntry);
            }
        }
        isValidAssignee(currentAssignedUserOrGroup) {
            if (!currentAssignedUserOrGroup)
                return false;
            if (currentAssignedUserOrGroup.startsWith("userId:"))
                return false;
        }
        loadInstance() {
            this.isLoading = true;
            this.$http.get("/api/EformInstance/GetInstance/" + this.$routeParams.templateOrInstanceId).then((response) => {
                this.isLoading = false;
                this.instance = response.data;
                EformInstanceDto.parseSectionFields(this.instance);
                this.prepareSectionsAndFields();
                this.fellowResidents.getResidents().then(r => Ally.EformInstanceListingController.populateUserNameLabels(r, this.instance));
            }, (response) => {
                this.isLoading = false;
                alert("Failed to load template: " + response.data.exceptionMessage);
                this.$location.path("/Admin/EformTemplateListing");
            });
        }
        loadTemplate() {
            this.isLoading = true;
            this.$http.get("/api/EformInstance/TemplateForCreate/" + this.$routeParams.templateOrInstanceId).then((response) => {
                this.isLoading = false;
                this.instance = new EformInstanceDto();
                this.instance.template = response.data;
                this.instance.currentAssignedUserOrGroup = Ally.EformInstanceListingController.AssignToUserPrefix + this.siteInfo.userInfo.userId;
                this.instance.activeSectionIndex = 0;
                this.instance.assignedToLabel = this.siteInfo.userInfo.fullName;
                this.instance.formStatus = EformInstanceDto.StatusDraft;
                this.instance.groupId = this.siteInfo.publicSiteInfo.groupId;
                this.instance.submitterUserId = this.siteInfo.userInfo.userId;
                this.instance.submitterLabel = this.siteInfo.userInfo.fullName;
                this.instance.eformTemplateId = this.instance.template.eformTemplateId;
                this.instance.sections = [];
                EformInstanceDto.parseSectionFields(this.instance);
                this.prepareSectionsAndFields();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to load template: " + response.data.exceptionMessage);
                this.$location.path("/Admin/EformTemplateListing");
            });
        }
        getEmptyRequiredFields(curSection) {
            const emptyFields = [];
            for (const curFieldPair of curSection.fieldPairs) {
                if (curFieldPair.template.isRequired) {
                    if (HtmlUtil.isNullOrWhitespace(curFieldPair.instance.valuesJson))
                        emptyFields.push(curFieldPair);
                }
            }
            return emptyFields;
        }
        saveSection(curSection, isComplete) {
            // We should only be able to save the current active section, but we can let the server check on that
            const missingRequiredFields = this.getEmptyRequiredFields(curSection);
            if (missingRequiredFields.length > 0) {
                const errorMessage = `The following required fields are missing values:\n` + missingRequiredFields.map(f => f.template.label).join("\n- ");
                alert(errorMessage);
                return;
            }
            curSection.instance.sectionStatus = isComplete ? "complete" : "draft";
            curSection.instance.fieldValuesJson = JSON.stringify(curSection.instance.parsedFieldValues);
            const postUri = "/api/EformInstance/" + (this.isCreate ? ("CreateInstance/" + this.instance.eformTemplateId) : ("UpdateInstance/" + this.instance.eformInstanceId));
            let postData;
            if (this.isCreate) {
                postData = {
                    eformInstanceSectionId: 0,
                    eformInstanceId: "00000000-0000-0000-0000-000000000000",
                    eformTemplateSectionId: curSection.instance.eformTemplateSectionId,
                    sectionStatus: curSection.instance.sectionStatus,
                    fieldValuesJson: curSection.instance.fieldValuesJson
                };
            }
            else {
                postData = {
                    eformInstanceSectionId: curSection.instance.eformInstanceSectionId,
                    eformInstanceId: this.instance.eformInstanceId,
                    eformTemplateSectionId: curSection.instance.eformTemplateSectionId,
                    sectionStatus: curSection.instance.sectionStatus,
                    fieldValuesJson: curSection.instance.fieldValuesJson
                };
            }
            this.isLoading = true;
            this.$http.post(postUri, postData).then(() => {
                this.isLoading = false;
                this.$location.path("/Home");
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save form: " + response.data.exceptionMessage);
            });
        }
        deleteForm() {
            if (!confirm("Are you sure you want to delete this form? It is permanent and cannot be recovered."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/EformInstance/PermanentlyDelete/" + this.$routeParams.templateOrInstanceId).then(() => {
                this.isLoading = false;
                this.$location.path("/Home");
            }, (response) => {
                this.isLoading = false;
                alert("Failed to delete form: " + response.data.exceptionMessage);
            });
        }
    }
    ViewEformInstanceController.$inject = ["$http", "fellowResidents", "$location", "$routeParams", "SiteInfo"];
    Ally.ViewEformInstanceController = ViewEformInstanceController;
    class EformFieldInstance {
    }
    Ally.EformFieldInstance = EformFieldInstance;
    class EformInstanceSection {
        constructor() {
            this.eformInstanceSectionId = 0;
            this.sectionStatus = "not-started";
            // Not from the server
            this.parsedFieldValues = [];
        }
        static parseFields(section) {
            section.parsedFieldValues = JSON.parse(section.fieldValuesJson);
        }
    }
    Ally.EformInstanceSection = EformInstanceSection;
    class EformInstanceDto {
        constructor() {
            this.sections = [];
        }
        /// Parse the JSON field data for all sections in the instance and its template
        static parseSectionFields(instance) {
            for (const curSection of instance.sections)
                EformInstanceSection.parseFields(curSection);
            Ally.EformTemplateDto.parseSectionFields(instance.template);
        }
    }
    EformInstanceDto.StatusDraft = "draft";
    EformInstanceDto.StatusActive = "active";
    EformInstanceDto.StatusComplete = "complete";
    Ally.EformInstanceDto = EformInstanceDto;
    class EformFieldEntry {
    }
    Ally.EformFieldEntry = EformFieldEntry;
    class EformSectionEntry {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("viewEformInstance", {
    bindings: {},
    templateUrl: "/ngApp/common/eforms/view-eform-instance.html",
    controller: Ally.ViewEformInstanceController
});

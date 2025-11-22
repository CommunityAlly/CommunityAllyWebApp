var Ally;
(function (Ally) {
    /**
     * The controller for editing an E-form template
     */
    class EditEformTemplateController {
        /**
         * The constructor for the class
         */
        constructor($http, fellowResidents, $location, $routeParams, $timeout, siteInfo) {
            this.$http = $http;
            this.fellowResidents = fellowResidents;
            this.$location = $location;
            this.$routeParams = $routeParams;
            this.$timeout = $timeout;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.committeeOptions = [];
            this.isSuperAdmin = false;
            this.shouldShowAdvancedProperties = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;
            this.loadTemplate();
        }
        addSection() {
            const newSection = new Ally.EformTemplateSection();
            // The first section always needs whoFillsOut set to reporter
            if (this.template.sections.length === 0)
                newSection.whoFillsOut = "reporter";
            else {
                const previousSection = this.template.sections[this.template.sections.length - 1];
                // Auto-bounce back and forth between reporter and board for new sections
                if (previousSection.whoFillsOut === "anyBoardOrAdmin")
                    newSection.whoFillsOut = "reporter";
                else
                    newSection.whoFillsOut = "anyBoardOrAdmin";
            }
            this.template.sections.push(newSection);
        }
        loadCommitteeOptions() {
            this.committeeOptions = [];
        }
        loadTemplate() {
            this.isLoading = true;
            this.$http.get("/api/EformTemplate/ByIdForEdit/" + this.$routeParams.templateId).then((response) => {
                this.isLoading = false;
                this.template = response.data;
                Ally.EformTemplateDto.parseSectionFields(this.template);
                // Populate multiValueOptionsString
                for (const curSection of this.template.sections) {
                    for (const curField of curSection.parsedFields) {
                        if (curField.multiValueOptions && Array.isArray(curField.multiValueOptions) && curField.multiValueOptions.length > 0)
                            curField.multiValueOptionsString = curField.multiValueOptions.join(",");
                    }
                }
                this.$timeout(() => {
                    this.instructionsQuill = this.hookUpQuillEditor("formInstructionsText", this.template.formInstructions);
                    if (this.isSuperAdmin && this.template.isCatalogTemplate)
                        this.catalogDescriptionQuill = this.hookUpQuillEditor("catalogDescriptionHtml", this.template.catalogDescriptionHtml);
                }, 10);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to load template: " + response.data.exceptionMessage);
                this.$location.path("/Admin/EformTemplateListing");
            });
        }
        hookUpQuillEditor(elementId, prepopulateHtml) {
            const newQuill = new Quill("#" + elementId, {
                theme: 'snow'
            });
            if (prepopulateHtml) {
                const prepopulateDelta = newQuill.clipboard.convert({ html: prepopulateHtml });
                newQuill.setContents(prepopulateDelta, "silent");
            }
            return newQuill;
        }
        onIsCatalogChange() {
            if (!this.template.isCatalogTemplate)
                this.catalogDescriptionQuill = null;
            else {
                this.$timeout(() => {
                    if (this.isSuperAdmin && this.template.isCatalogTemplate)
                        this.catalogDescriptionQuill = this.hookUpQuillEditor("catalogDescriptionHtml", this.template.catalogDescriptionHtml);
                }, 10);
            }
        }
        saveTemplate() {
            this.template.formInstructions = this.instructionsQuill.getSemanticHTML();
            if (this.isSuperAdmin && this.catalogDescriptionQuill)
                this.template.catalogDescriptionHtml = this.catalogDescriptionQuill.getSemanticHTML();
            this.isLoading = true;
            // Serialize fields to JSON for saving
            for (let i = 0; i < this.template.sections.length; ++i) {
                const curSection = this.template.sections[i];
                if (!curSection.whoFillsOut) {
                    alert(`Failed to save: Step ${i + 1} is missing the 'Who fills out this step' value`);
                    return;
                }
                curSection.fieldsJson = JSON.stringify(curSection.parsedFields);
                delete curSection.parsedFields;
            }
            this.$http.put("/api/EformTemplate/UpdateTemplate", this.template).then(() => {
                this.isLoading = false;
                this.$location.path("/Admin/EformTemplateListing");
            }, (response) => {
                Ally.EformTemplateDto.parseSectionFields(this.template);
                this.isLoading = false;
                alert("Failed to save template: " + response.data.exceptionMessage);
            });
        }
        addField(curSection) {
            const newField = new Ally.EformFieldTemplate();
            newField.type = "shortText"; // Default to the most common field type
            curSection.parsedFields.push(newField);
        }
        /**
        * Convert a string to a camel case identifer
        */
        static labelToSlug(source, maxLength) {
            if (HtmlUtil.isNullOrWhitespace(source))
                return "";
            let newSlug = source.trim().toLowerCase();
            // Remove non-alpha characters
            newSlug = newSlug.replace(/[^a-z ]/gi, "");
            // Remove common words
            const commonWords = ["a", "for", "and", "but", "of", "to", "is", "the", "there", "have", "are", "at", "in", "be"];
            for (let i = 0; i < commonWords.length; ++i)
                newSlug = newSlug.replace(" " + commonWords[i] + " ", " ");
            // Make letters after spaces upper case
            for (let i = 1; i < newSlug.length; ++i) {
                if (newSlug[i] === " " && i < newSlug.length - 1)
                    newSlug = EditEformTemplateController.stringReplaceAt(newSlug, i + 1, newSlug[i + 1].toUpperCase());
            }
            // Remove spaces
            newSlug = newSlug.replace(/[ ]/gi, "");
            // Make the first character lower case
            if (!HtmlUtil.isNullOrWhitespace(newSlug)) {
                newSlug = newSlug[0].toLowerCase() + newSlug.substring(1);
                if (maxLength > 0 && newSlug.length > maxLength)
                    newSlug = newSlug.substring(0, maxLength);
            }
            return newSlug;
        }
        getAllFields() {
            if (!this.template || !this.template.sections || this.template.sections.length === 0)
                return [];
            let allFields = [];
            for (const curSection of this.template.sections)
                allFields = allFields.concat(curSection.parsedFields);
            return allFields;
        }
        /*
        * If empty
        */
        autoSetFieldSlug(field) {
            // If the field doesn't have a label or already has a slug, don't overwrite it
            if (HtmlUtil.isNullOrWhitespace(field.label) || !HtmlUtil.isNullOrWhitespace(field.slug))
                return;
            const maxFieldValueNameLength = 128;
            field.slug = EditEformTemplateController.labelToSlug(field.label, maxFieldValueNameLength);
            // Try to keep it a manageable length
            if (field.slug && field.slug.length > 32) {
                const isUppercase = (aCharacter) => (aCharacter >= 'A') && (aCharacter <= 'Z');
                // Find the next uppercase letter
                let charIndex = 32;
                for (; charIndex < field.slug.length; ++charIndex) {
                    if (isUppercase(field.slug[charIndex]))
                        break;
                }
                if (charIndex < field.slug.length) {
                    field.slug = field.slug.substring(0, charIndex - 1);
                }
            }
            const allSlugsExceptThis = this.getAllFields().filter(f => f.slug && f.slug.length > 0 && f !== field).map(f => f.slug);
            if (allSlugsExceptThis.includes(field.slug)) {
                // This field name is in use so make a unique name with a numeric suffix
                let numericSuffix = 1;
                while (allSlugsExceptThis.includes(field.slug + numericSuffix))
                    ++numericSuffix;
                field.slug = field.slug + numericSuffix;
            }
            this.checkFieldSlugUnique(field);
        }
        checkAllFieldSlugs() {
            for (const curSection of this.template.sections) {
                for (const curField of curSection.parsedFields)
                    this.checkFieldSlugUnique(curField);
            }
        }
        checkFieldSlugUnique(curField) {
            curField.duplicateSlugMessage = null;
            if (!curField.slug) {
                curField.duplicateSlugMessage = "Slug is required for fields to save";
                return;
            }
            const allFields = this.getAllFields();
            const fieldsWithSlug = allFields.filter(f => f.slug === curField.slug);
            if (fieldsWithSlug.length > 1) {
                curField.duplicateSlugMessage = `This slug (${curField.slug}) is in use by multiple fields: '${fieldsWithSlug.map(f => f.label).join("', '")}'`;
            }
            else
                curField.duplicateSlugMessage = null;
        }
        removeField(section, field) {
            const fieldIndex = section.parsedFields.indexOf(field);
            if (fieldIndex < 0) {
                alert("Invalid field");
                return;
            }
            section.parsedFields.splice(fieldIndex, 1);
        }
        removeSection(section) {
            if (section.parsedFields.length > 0) {
                if (!confirm("Are you sure you want to remove this section? You can't recover it."))
                    return;
            }
            const sectionIndex = this.template.sections.indexOf(section);
            if (sectionIndex < 0) {
                alert("Invalid section");
                return;
            }
            this.template.sections.splice(sectionIndex, 1);
        }
        onMultiValueOptionsChange(curField) {
            if (HtmlUtil.isNullOrWhitespace(curField.multiValueOptionsString))
                delete curField.multiValueOptions;
            else
                curField.multiValueOptions = curField.multiValueOptionsString.split(",");
        }
        onFieldTypeChange(curSection, curField) {
            const typesAllowingDefault = ["longText", "shortText"];
            // Don't save the default value if the field type doesn't support it
            if (!typesAllowingDefault.includes(curField.type))
                curField.defaultValue = null;
        }
        moveField(curSection, curField, moveDirection) {
            const fieldIndex = curSection.parsedFields.indexOf(curField);
            if (fieldIndex < 0) {
                alert("Invalid field");
                return;
            }
            const newIndex = fieldIndex + moveDirection;
            if (newIndex < 0 || newIndex >= curSection.parsedFields.length) {
                return;
            }
            curSection.parsedFields.splice(fieldIndex, 1);
            curSection.parsedFields.splice(newIndex, 0, curField);
        }
    }
    EditEformTemplateController.$inject = ["$http", "fellowResidents", "$location", "$routeParams", "$timeout", "SiteInfo"];
    /** Replace a character with another string */
    EditEformTemplateController.stringReplaceAt = function (str, index, replacement) {
        return str.substring(0, index) + replacement + str.substring(index + replacement.length);
    };
    Ally.EditEformTemplateController = EditEformTemplateController;
})(Ally || (Ally = {}));
CA.angularApp.component("editEformTemplate", {
    bindings: {},
    templateUrl: "/ngApp/common/eforms/edit-eform-template.html",
    controller: Ally.EditEformTemplateController
});

var Ally;
(function (Ally) {
    /**
     * The controller for viewing available E-form templates
     */
    class EformFieldController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $timeout) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.fileAttachmentInfo = null;
            this.newlySelectedFile = null;
            this.hasNewFileAttachment = false;
            this.oldAttachmentWillBeRemoved = false;
            this.checkboxListItems = [];
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            if (this.fieldEntry.template.type === "timeOnly")
                this.$timeout(() => $(`#field-input-${this.fieldEntry.template.slug}`).timepicker({ 'scrollDefault': '10:00am' }));
            if (this.fieldEntry.instance.valuesJson) {
                if (this.fieldEntry.template.type === "dateOnly")
                    this.dateValue = moment(this.fieldEntry.instance.valuesJson, "dddd MMMM D, YYYY").toDate();
                if (this.fieldEntry.template.type === "fileAttachment")
                    this.fileAttachmentInfo = JSON.parse(this.fieldEntry.instance.valuesJson);
            }
            if (this.fieldEntry.template.type === "checkboxList" && this.fieldEntry.template.multiValueOptions) {
                const selectedOptions = this.fieldEntry.instance.valuesJson ? this.fieldEntry.instance.valuesJson.split(',') : [];
                this.checkboxListItems = this.fieldEntry.template.multiValueOptions.map((o) => { return { label: o, isChecked: selectedOptions.includes(o) }; });
            }
        }
        onFieldChange() {
            this.fieldEntry.instance.lastEditDateUtc = moment.utc().toDate();
            console.log("New value", this.fieldEntry.template.slug, this.fieldEntry.instance.valuesJson);
        }
        openAttachmentPicker() {
            const attacherId = `field-input-${this.fieldEntry.template.slug}`;
            document.getElementById(attacherId).click();
        }
        onFileSelected(event) {
            console.log("In onFileSelected", event);
            if (!event || !event.target || !event.target.files || event.target.files === 0) {
                if (this.parentEform.newAttachments) {
                    const removeIndex = this.parentEform.newAttachments.findIndex(e => e.localSelectedFile === this.newlySelectedFile);
                    if (removeIndex >= 0)
                        this.parentEform.newAttachments.splice(removeIndex, 1);
                }
                this.newlySelectedFile = null;
                this.hasNewFileAttachment = false;
                this.fileAttachmentInfo = null;
                document.getElementById(`field-input-${this.fieldEntry.template.slug}`).value = null;
            }
            else {
                this.newlySelectedFile = event.target.files[0];
                this.hasNewFileAttachment = true;
                if (!this.parentEform.newAttachments)
                    this.parentEform.newAttachments = [];
                this.fileAttachmentInfo = {
                    originalFileName: this.newlySelectedFile.name,
                    fieldSlug: this.fieldEntry.template.slug,
                    fileSize: this.newlySelectedFile.size,
                    mimeType: this.newlySelectedFile.type,
                    uploadedDateUtc: moment.utc().toDate(),
                    uploadedByUserId: this.siteInfo.userInfo.userId
                };
                this.fieldEntry.instance.valuesJson = JSON.stringify(this.fileAttachmentInfo);
                const newEntry = {
                    fieldSlug: this.fieldEntry.template.slug,
                    localSelectedFile: this.newlySelectedFile
                };
                this.parentEform.newAttachments.push(newEntry);
            }
        }
        /**
         * Occurs when the user clicks the button to view the attached file
         */
        viewAttachment() {
            const getUri = `/api/EformInstance/AttachmentViewUrl/${this.parentEform.eformInstanceId}/${this.fieldEntry.template.slug}`;
            this.$http.get(getUri).then((response) => {
                window.open(response.data, "_blank");
            });
            //this.$http.get( "/api/DocumentLink/0" ).then( ( response: ng.IHttpPromiseCallbackArg<DocLinkInfo> ) =>
            //{
            //    const getUri = `PublicEformInstance/ViewAttachment/${this.parentEform.eformInstanceId}/${1}/${this.fieldEntry.template.slug}?vid=${response.data.vid}`;
            //    window.open( this.siteInfo.publicSiteInfo.baseApiUrl + getUri, "_blank" );
            //} );
        }
        removeExistingAttachment() {
            if (!this.parentEform.attachmentSlugsToDelete)
                this.parentEform.attachmentSlugsToDelete = [];
            this.parentEform.attachmentSlugsToDelete.push(this.fieldEntry.template.slug);
            this.fieldEntry.instance.valuesJson = "";
            this.fileAttachmentInfo = null;
            this.oldAttachmentWillBeRemoved = true;
        }
        onDateValueChange() {
            // Store the date as a string to avoid time zone logic with user-entered data
            if (this.dateValue)
                this.fieldEntry.instance.valuesJson = moment(this.dateValue).format("dddd MMMM D, YYYY");
            else
                this.fieldEntry.instance.valuesJson = null;
            this.onFieldChange();
        }
        onCheckboxListChange() {
            this.fieldEntry.instance.valuesJson = this.checkboxListItems.filter(o => o.isChecked).map(o => o.label).join(',');
            this.onFieldChange();
        }
    }
    EformFieldController.$inject = ["$http", "SiteInfo", "$timeout"];
    Ally.EformFieldController = EformFieldController;
    class CheckboxListItem {
    }
    class EformFieldFileInfo {
    }
    Ally.EformFieldFileInfo = EformFieldFileInfo;
    class EformFieldFileForUpload {
    }
    Ally.EformFieldFileForUpload = EformFieldFileForUpload;
})(Ally || (Ally = {}));
CA.angularApp.component("eformField", {
    bindings: {
        fieldEntry: "<",
        parentEform: "<"
    },
    templateUrl: "/ngApp/common/eforms/eform-field.html",
    controller: Ally.EformFieldController
});

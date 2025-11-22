namespace Ally
{
    /**
     * The controller for viewing available E-form templates
     */
    export class EformFieldController implements ng.IController
    {
        static $inject: string[] = ["$http", "SiteInfo", "$timeout"];
        fieldEntry: EformFieldEntry;
        parentEform: EformInstanceDto;
        fileAttachmentInfo: EformFieldFileInfo | null = null;
        newlySelectedFile: File | null = null;
        hasNewFileAttachment: boolean = false;
        oldAttachmentWillBeRemoved = false;
        checkboxListItems: CheckboxListItem[] = [];
        dateValue: Date;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $timeout: ng.ITimeoutService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            if( this.fieldEntry.template.type === "timeOnly" )
                this.$timeout( () => $( `#field-input-${this.fieldEntry.template.slug}` ).timepicker( { 'scrollDefault': '10:00am' } ) );

            if( this.fieldEntry.instance.valuesJson )
            {
                if( this.fieldEntry.template.type === "dateOnly" )
                    this.dateValue = moment( this.fieldEntry.instance.valuesJson, "dddd MMMM D, YYYY" ).toDate();

                if( this.fieldEntry.template.type === "fileAttachment" )
                    this.fileAttachmentInfo = JSON.parse( this.fieldEntry.instance.valuesJson );
            }

            if( this.fieldEntry.template.type === "checkboxList" && this.fieldEntry.template.multiValueOptions )
            {
                const selectedOptions: string[] = this.fieldEntry.instance.valuesJson ? ( this.fieldEntry.instance.valuesJson as string ).split( ',' ) : [];

                this.checkboxListItems = this.fieldEntry.template.multiValueOptions.map( ( o ) => { return { label: o, isChecked: selectedOptions.includes( o ) }; } );
            }
        }


        onFieldChange()
        {
            this.fieldEntry.instance.lastEditDateUtc = moment.utc().toDate();

            console.log( "New value", this.fieldEntry.template.slug, this.fieldEntry.instance.valuesJson );
        }


        openAttachmentPicker()
        {
            const attacherId = `field-input-${this.fieldEntry.template.slug}`;
            document.getElementById( attacherId ).click();
        }


        onFileSelected( event: any )
        {
            console.log( "In onFileSelected", event );

            if( !event || !event.target || !event.target.files || event.target.files === 0 )
            {
                if( this.parentEform.newAttachments )
                {
                    const removeIndex = this.parentEform.newAttachments.findIndex( e => e.localSelectedFile === this.newlySelectedFile );
                    if( removeIndex >= 0 )
                        this.parentEform.newAttachments.splice( removeIndex, 1 );
                }

                this.newlySelectedFile = null;
                this.hasNewFileAttachment = false;
                this.fileAttachmentInfo = null;
                ( document.getElementById( `field-input-${this.fieldEntry.template.slug}` ) as HTMLInputElement ).value = null;
            }
            else
            {
                this.newlySelectedFile = event.target.files[0];
                this.hasNewFileAttachment = true;

                if( !this.parentEform.newAttachments )
                    this.parentEform.newAttachments = [];

                this.fileAttachmentInfo = {
                    originalFileName: this.newlySelectedFile.name,
                    fieldSlug: this.fieldEntry.template.slug,
                    fileSize: this.newlySelectedFile.size,
                    mimeType: this.newlySelectedFile.type,
                    uploadedDateUtc: moment.utc().toDate(),
                    uploadedByUserId: this.siteInfo.userInfo.userId
                };

                this.fieldEntry.instance.valuesJson = JSON.stringify( this.fileAttachmentInfo );

                const newEntry: EformFieldFileForUpload = {
                    fieldSlug: this.fieldEntry.template.slug,
                    localSelectedFile: this.newlySelectedFile
                };

                this.parentEform.newAttachments.push( newEntry );
            }
        }


        /**
         * Occurs when the user clicks the button to view the attached file
         */
        viewAttachment()
        {
            const getUri = `/api/EformInstance/AttachmentViewUrl/${this.parentEform.eformInstanceId}/${this.fieldEntry.template.slug}`;
            this.$http.get( getUri ).then( ( response: ng.IHttpPromiseCallbackArg<string> ) =>
            {
                window.open( response.data, "_blank" );
            } );

            //this.$http.get( "/api/DocumentLink/0" ).then( ( response: ng.IHttpPromiseCallbackArg<DocLinkInfo> ) =>
            //{
            //    const getUri = `PublicEformInstance/ViewAttachment/${this.parentEform.eformInstanceId}/${1}/${this.fieldEntry.template.slug}?vid=${response.data.vid}`;
            //    window.open( this.siteInfo.publicSiteInfo.baseApiUrl + getUri, "_blank" );
            //} );
        }


        removeExistingAttachment()
        {
            if( !this.parentEform.attachmentSlugsToDelete )
                this.parentEform.attachmentSlugsToDelete = [];

            this.parentEform.attachmentSlugsToDelete.push( this.fieldEntry.template.slug );

            this.fieldEntry.instance.valuesJson = "";
            this.fileAttachmentInfo = null;
            this.oldAttachmentWillBeRemoved = true;
        }


        onDateValueChange()
        {
            // Store the date as a string to avoid time zone logic with user-entered data
            if( this.dateValue )
                this.fieldEntry.instance.valuesJson = moment( this.dateValue ).format( "dddd MMMM D, YYYY" );
            else
                this.fieldEntry.instance.valuesJson = null;

            this.onFieldChange();
        }


        onCheckboxListChange()
        {
            this.fieldEntry.instance.valuesJson = this.checkboxListItems.filter( o => o.isChecked ).map( o => o.label ).join( ',' );

            this.onFieldChange();
        }
    }


    class CheckboxListItem
    {
        label: string;
        isChecked: boolean;
    }


    export class EformFieldFileInfo
    {
        originalFileName: string;
        fieldSlug: string;
        fileSize: number;
        mimeType: string;
        uploadedDateUtc: Date;
        uploadedByUserId: string;
    }


    export class EformFieldFileForUpload
    {
        fieldSlug: string;
        localSelectedFile: File;
    }
}

CA.angularApp.component( "eformField", {
    bindings: {
        fieldEntry: "<",
        parentEform: "<"
    },
    templateUrl: "/ngApp/common/eforms/eform-field.html",
    controller: Ally.EformFieldController
} );

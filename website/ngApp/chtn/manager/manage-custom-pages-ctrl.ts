/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="../../Services/html-util.ts" />


namespace Ally
{
    /**
     * The controller for the page to add, edit, and delete custom pages
     */
    export class ManageCustomPagesController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo"];

        includeInactive = false;
        allPageListings: CustomPage[] = [];
        selectedPageEntry: CustomPage = null;
        editPage: CustomPage = null;
        isLoading = false;
        bodyRichEditorElem: JQuery;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.retrievePages();

            RichTextHelper.initToolbarBootstrapBindings();

            this.bodyRichEditorElem = $( '#body-rich-editor' );
            ( <any>this.bodyRichEditorElem ).wysiwyg( { fileUploadError: RichTextHelper.showFileUploadAlert } );
        }


        /**
        * Retrieve the list of custom pages
        */
        retrievePages()
        {
            this.isLoading = true;

            this.$http.get( "/api/CustomPage/AllPages" ).then(
                ( response: ng.IHttpPromiseCallbackArg<CustomPage[]> ) =>
                {
                    this.isLoading = false;
                    this.allPageListings = response.data;

                    const addPage = new CustomPage();
                    addPage.customPageId = -5;
                    addPage.title = "Add New Page...";
                    this.allPageListings.push( addPage );
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve the custom pages: " + response.data.exceptionMessage );
                }
            );
        }


        /**
        * Save the current page
        */
        savePage()
        {
            if( HtmlUtil.isNullOrWhitespace( this.editPage.title ) )
            {
                alert( "Please enter a title for the page" );
                return;
            }

            if( HtmlUtil.isNullOrWhitespace( this.editPage.pageSlug ) )
            {
                alert( "Please enter a slug for the page" );
                return;
            }

            this.editPage.markupHtml = this.bodyRichEditorElem.html();
            this.isLoading = true;

            let httpFunc = this.editPage.customPageId ? this.$http.put : this.$http.post;
            httpFunc( `/api/CustomPage`, this.editPage ).then(
                () =>
                {
                    this.isLoading = false;
                    this.selectedPageEntry = null;
                    this.editPage = null;
                    this.bodyRichEditorElem.html("");
                    this.retrievePages();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to save the page: " + response.data.exceptionMessage );
                }
            );
        }


        /**
        * Permanently elete the current page
        */
        deletePage()
        {
            if( !confirm( "Are you sure you want to permanently delete this page? This action CANNOT BE UNDONE." ) )
                return;

            this.isLoading = true;

            this.$http.delete( "/api/CustomPage/" + this.editPage.customPageId ).then(
                () =>
                {
                    this.isLoading = false;
                    this.selectedPageEntry = null;
                    this.editPage = null;
                    this.bodyRichEditorElem.html( "" );
                    this.retrievePages();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to delete the page: " + response.data.exceptionMessage );
                }
            );
        }


        /**
        * Occurs when focus leaves the title input field
        */
        onTitleBlur()
        {
            if( !this.editPage || this.editPage.pageSlug || !this.editPage.title )
                return;

            this.editPage.pageSlug = ( this.editPage.title || "" ).trim();
            this.editPage.pageSlug = this.editPage.pageSlug.replace( /[^0-9a-z- ]/gi, '' ); // Remove non-alphanumeric+dash
            this.editPage.pageSlug = this.editPage.pageSlug.replace( / /g, '-' ); // Replace spaces with dashes
        }


        /**
        * Occurs when focus leaves the slug field, sanitizes the slug to be URL-friendly
        */
        onSlugBlur()
        {
            if( !this.editPage )
                return;

            this.editPage.pageSlug = ( this.editPage.pageSlug || "" ).trim();
            this.editPage.pageSlug = this.editPage.pageSlug.replace( / /g, '-' ); // Replace spaces with dashes
        }


        onPageSelected()
        {
            if( this.selectedPageEntry.customPageId > 0 )
            {
                this.isLoading = true;

                this.$http.get( "/api/CustomPage/" + this.selectedPageEntry.customPageId ).then(
                    ( response: ng.IHttpPromiseCallbackArg<CustomPage> ) =>
                    {
                        this.isLoading = false;
                        this.editPage = response.data;
                        this.bodyRichEditorElem.html( this.editPage.markupHtml );
                    },
                    ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                    {
                        this.isLoading = false;
                        alert( "Failed to retrieve custom page: " + response.data.exceptionMessage );
                    }
                );
            }
            else
            {
                this.editPage = new CustomPage();
                this.bodyRichEditorElem.html( "" );
            }
        }
    }


    class CustomPage
    {
        customPageId: number;
        groupId: number;
        creatorUserId: string;
        createDateUtc: Date;
        isPublic: boolean;
        pageSlug: string;
        title: string;
        markupHtml: string;
    }


    export class PublicCustomPageEntry
    {
        customPageId: number;
        pageSlug: string;
        title: string;

        // Populated locally
        path: string;
    }
}


CA.angularApp.component( "manageCustomPages", {
    templateUrl: "/ngApp/chtn/manager/manage-custom-pages.html",
    controller: Ally.ManageCustomPagesController
} );
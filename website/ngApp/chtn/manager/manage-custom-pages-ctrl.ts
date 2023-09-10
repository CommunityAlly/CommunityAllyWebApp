declare var tinymce: any;

namespace Ally
{
    /**
     * The controller for the page to add, edit, and delete custom pages
     */
    export class ManageCustomPagesController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$scope"];

        isLoading = false;
        includeInactive = false;
        allPageListings: CustomPage[] = [];
        menuPageListings: CustomPage[] = [];
        selectedPageEntry: CustomPage = null;
        editPage: CustomPage = null;
        groupBaseUrl: string;
        selectedLandingPageId: number | null = null;
        pageContentTinyMce: ITinyMce;
        pageSizeString: string = "0 bytes";
        pageSizeBytes: number = 0;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $scope: ng.IScope )
        {
            this.groupBaseUrl = this.siteInfo.publicSiteInfo.baseUrl;
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.retrievePages();

            HtmlUtil2.initTinyMce( "tiny-mce-editor", 900 ).then( e =>
            {
                this.pageContentTinyMce = e;                

                this.pageContentTinyMce.on( "change", ( e: any ) =>
                {
                    // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                    this.$scope.$apply( () =>
                    {
                        this.updatePageSizeLabel();
                    } );
                } );
            } );
            
            this.$http.get( "/api/CustomPage/GroupLandingPage" ).then(
                ( response: ng.IHttpPromiseCallbackArg<number | null> ) =>
                {
                    this.selectedLandingPageId = response.data ? response.data : null;
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    console.log( "Failed to retrieve current landing page: " + response.data.exceptionMessage );
                }
            );
        }


        /**
         * Update the label under the editor showing the size of the page to download
         */
        updatePageSizeLabel()
        {
            if( !this.pageContentTinyMce )
                return;

            const bodyText = this.pageContentTinyMce.getContent() || "";
            this.pageSizeBytes = bodyText.length;

            this.pageSizeString = ( this.pageSizeBytes / 1048576 ).toFixed( 2 ) + " MB";

            //if( this.pageSizeBytes < 5 * 1024 )
            //    this.pageSizeString = this.pageSizeBytes.toString() + " bytes";
            //else if( this.pageSizeBytes < 1 * 1024 * 1024 )
            //    this.pageSizeString = Math.round( this.pageSizeBytes / 1024 ).toString() + " KB";
            //else
            //    this.pageSizeString = Math.round( this.pageSizeBytes / 1048576 ).toString() + " MB";
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
                    this.menuPageListings = _.clone( response.data );

                    const addPage = new CustomPage();
                    addPage.customPageId = -5;
                    addPage.title = "Add New Page...";
                    this.menuPageListings.push( addPage );
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

            this.editPage.markupHtml = this.pageContentTinyMce.getContent();
            this.isLoading = true;

            const httpFunc = this.editPage.customPageId ? this.$http.put : this.$http.post;
            httpFunc( `/api/CustomPage`, this.editPage ).then(
                () =>
                {
                    this.isLoading = false;
                    this.selectedPageEntry = null;
                    this.editPage = null;
                    this.pageContentTinyMce.setContent( "" );
                    this.updatePageSizeLabel();
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
                    this.pageContentTinyMce.setContent( "" );
                    this.updatePageSizeLabel();
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


        /**
         * Occurs when the user selects a page to edit
         */
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
                        this.pageContentTinyMce.setContent( this.editPage.markupHtml );
                        this.updatePageSizeLabel();
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
                this.pageContentTinyMce.setContent( "" );
                this.updatePageSizeLabel();
            }
        }


        /**
         * Occurs when the user selects a new landing page for the group
         */
        onLandingPageSelected()
        {
            let putUri = "/api/CustomPage/SetGroupLandingPage";
            if( this.selectedLandingPageId )
                putUri += "?customPageId=" + this.selectedLandingPageId;

            this.isLoading = true;

            this.$http.put( putUri, null ).then(
                ( response: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;

                    if( this.selectedLandingPageId )
                        this.siteInfo.publicSiteInfo.customLandingPagePath = null;
                    else
                    {
                        const selectedPage = this.allPageListings.find( p => p.customPageId === this.selectedLandingPageId );
                        if( selectedPage )
                            this.siteInfo.publicSiteInfo.customLandingPagePath = "#!/Page/" + selectedPage.pageSlug;
                    }
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to update landing page: " + response.data.exceptionMessage );
                }
            )
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
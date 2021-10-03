namespace Ally
{
    interface ICustomPageViewRouteParams extends ng.route.IRouteParamsService
    {
        slug: string;
    }


    /**
     * The controller for the page to track group spending
     */
    export class CustomPageViewController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$sce", "$routeParams"];

        isLoading: boolean = false;
        customPage: CustomPage;
        markupHtml: string;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private $sce: ng.ISCEService,
            private $routeParams: ICustomPageViewRouteParams )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isLoading = true;

            this.$http.get( "/api/PublicCustomPage/View/" + this.$routeParams.slug ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<CustomPage> ) =>
                {
                    this.isLoading = false;
                    this.customPage = httpResponse.data;
                    this.markupHtml = this.$sce.trustAsHtml( this.customPage.markupHtml );

                    // Make <a> links open in new tabs
                    setTimeout( () => RichTextHelper.makeLinksOpenNewTab( "custom-page-content" ) , 500 );
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to load page, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage );
                }
            );
        }
    }


    class CustomPage
    {
        customPageId: number;
        creatorUserId: string;
        createDateUtc: Date;
        isPublic: boolean;
        pageSlug: string;
        title: string;
        markupHtml: string;
    }
}


CA.angularApp.component( "customPageView", {
    templateUrl: "/ngApp/common/custom-page-view.html",
    controller: Ally.CustomPageViewController
} );

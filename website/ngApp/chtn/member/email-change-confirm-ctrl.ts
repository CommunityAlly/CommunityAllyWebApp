namespace Ally
{
    interface IEmailChangeConfirmRouteParams extends ng.route.IRouteParamsService
    {
        emailChangeId: string;
    }


    /**
     * The controller for the page that shows useful info on a map
     */
    export class EmailChangeConfirmController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "appCacheService", "$routeParams"];
        isLoading = false;
        confirmationResultMessage = "Loading...";
        isError: boolean = undefined;


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private appCacheService: AppCacheService,
            private $routeParams: IEmailChangeConfirmRouteParams )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.confirmChangeId();
        }


        /**
        * Confirm the email change
        */
        confirmChangeId()
        {
            this.isLoading = true;

            this.$http.put( "/api/MyProfile/ConfirmEmailChange?emailChangeId=" + this.$routeParams.emailChangeId, null ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.confirmationResultMessage = "Email successfully updated.";
                    this.isError = false;
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    this.isError = true;
                    if( !response.data )
                        this.confirmationResultMessage = "Invalid URL, please check your email link again.";
                    else
                        this.confirmationResultMessage = response.data.exceptionMessage;
                },
            );
        }
    }
}


CA.angularApp.component( "emailChangeConfirm", {
    templateUrl: "/ngApp/chtn/member/email-change-confirm.html",
    controller: Ally.EmailChangeConfirmController
} );
namespace Ally
{
    /**
     * The controller for the page that allows users to reset their password
     */
    export class ForgotPasswordController implements ng.IController
    {
        static $inject = ["$http", "appCacheService"];

        isLoading: boolean = false;
        loginInfo: LoginInfo = new LoginInfo();
        shouldHideControls: boolean = false;
        resultText: string;
        resultTextColor: string;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private appCacheService: AppCacheService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.loginInfo.emailAddress = this.appCacheService.getAndClear( "forgotEmail" );
        }


        /**
         * Occurs when the user clicks the log-in button
         */
        onSubmitEmail()
        {
            this.isLoading = true;

            // Retrieve information for the current association
            this.$http.post( "/api/Login/Forgot", this.loginInfo ).then(
                () =>
                {
                    this.shouldHideControls = true;

                    this.isLoading = false;

                    this.resultText = "Please check your email for updated login information.";
                    this.resultTextColor = "#00F";
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;

                    this.resultText = "Failed to process your request: " + httpResponse.data.exceptionMessage;
                    this.resultTextColor = "#F00";
                }
            );
        }
    }
}


CA.angularApp.component( "forgotPassword", {
    templateUrl: "/ngApp/chtn/member/forgot-password.html",
    controller: Ally.ForgotPasswordController
} );
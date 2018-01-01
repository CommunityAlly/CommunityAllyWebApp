namespace Ally
{
    /**
     * The controller for the page that allows users to reset their password
     */
    export class ForgotPasswordController implements ng.IController
    {
        static $inject = ["$http", "appCacheService"];

        isLoading: boolean = false;
        loginInfo: any = {};
        shouldHideControls: boolean = false;
        resultText: string;
        resultTextColor: string;


        /**
         * The constructor for the class
         */
        constructor( private $http:ng.IHttpService, private appCacheService:AppCacheService)
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.loginInfo = {

            };

            this.loginInfo.emailAddress = this.appCacheService.getAndClear( "forgotEmail" );
        }


        /**
         * Occurs when the user clicks the log-in button
         */
        onSubmitEmail()
        {
            this.isLoading = true;

            // Retrieve information for the current association
            var innerThis = this;
            this.$http.post( "/api/Login/Forgot", this.loginInfo ).then( function()
            {
                innerThis.shouldHideControls = true;

                innerThis.isLoading = false;

                innerThis.resultText = "Please check your e-mail for updated login information.";
                innerThis.resultTextColor = "#00F";

            }, function( httpResponse )
            {
                innerThis.isLoading = false;

                innerThis.resultText = "Failed to process your request: " + httpResponse.data;
                innerThis.resultTextColor = "#F00";
            } );
        }

    }
}


CA.angularApp.component( "forgotPassword", {
    templateUrl: "/ngApp/chtn/member/forgot-password.html",
    controller: Ally.ForgotPasswordController
} );
namespace Ally
{
    class NewUserSignUpInfo
    {
        emailAddress: string;
        firstName: string;
        lastName: string;
        streetAddress: string;
    }


    /**
     * The controller for the Neighborhood Ally sign-up page
     */
    export class NeighborSignUpController implements ng.IController
    {
        static $inject = ["$http"];

        isLoading: boolean = false;
        signUpInfo: NewUserSignUpInfo = new NewUserSignUpInfo();
        resultMessage: string;
        resultIsError: boolean = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            // Hook up address auto-complete, after the page has loaded
            setTimeout(() =>
            {
                var addressInput = <HTMLInputElement>document.getElementById( "address-text-box" );
                new google.maps.places.Autocomplete( addressInput );
            }, 750 );
        }


        /**
         * Occurs when the user clicks the button to submit their e-mail address
         */
        onSubmitInfo()
        {
            if( HtmlUtil.isNullOrWhitespace( this.signUpInfo.emailAddress ) )
            {
                alert( "Please enter an e-mail address" );
                return;
            }

            this.isLoading = true;

            var innerThis = this;
            this.$http.post( "/api/NeighborSignUp/SignUpNewUser", this.signUpInfo ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<any> )
            {
                innerThis.isLoading = false;
                innerThis.resultIsError = false;
                innerThis.resultMessage = "Your information has been successfully submitted. Look for a welcome email soon.";

            }, function()
            {
                innerThis.isLoading = false;
                innerThis.resultIsError = true;
                innerThis.resultMessage = "There was an error submitting your information. Please try again.";
            } );
        }


        /**
         * Occurs when the user wants to retry submission of their info
         */
        goBack()
        {
            this.resultMessage = null;
        }
    }
}


CA.angularApp.component( "neighborSignUp", {
    templateUrl: "/ngApp/chtn/public/neighbor-sign-up.html",
    controller: Ally.NeighborSignUpController
} );
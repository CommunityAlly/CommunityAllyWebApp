namespace Ally
{
    class HelpSendInfo
    {
        emailAddress: string;
        message: string;
    }


    /**
     * The controller for the page that allows users to submit feedback
     */
    export class HelpFormController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo"];

        sendInfo: HelpSendInfo = new HelpSendInfo();
        resultStyle: any;
        isLoading: boolean = false;
        wasMessageSent: boolean = false;
        sendResult: string;
        isPageEnabled: boolean = null;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService )
        {
            this.resultStyle = {
                "text-align": "center",
                "font-size": "large",
                "font-weight": "bold"
            };
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.$http.get( "/api/PublicAllyAppSettings/IsHelpPageEnabled" ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<boolean> ) => this.isPageEnabled = httpResponse.data,
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isPageEnabled = true; // Default to true if we can't get the setting
                    console.log( "Failed to get sign-up enabled status: " + httpResponse.data.exceptionMessage );
                }
            );

            if( this.siteInfo.isLoggedIn )
                this.sendInfo.emailAddress = this.siteInfo.userInfo.emailAddress;
        }


        /**
         * Occurs when the user clicks the log-in button
         */
        onSendHelp = function()
        {
            $( "#help-form" ).validate();
            if( !$( "#help-form" ).valid() )
                return;

            this.isLoading = true;

            // Retrieve information for the current association
            var innerThis = this;
            this.$http.post( "/api/Help", this.sendInfo ).then( function()
            {
                innerThis.isLoading = false;

                innerThis.sendInfo = {};

                innerThis.wasMessageSent = true;

                innerThis.resultStyle.color = "#00F";

                innerThis.sendResult = "Your message has been sent. We'll do our best to get back to you within 24 hours.";

            }, function()
            {
                innerThis.isLoading = false;

                innerThis.resultStyle.color = "#F00";
                innerThis.sendResult = "Failed to send message.";
            } );
        };
    }
}


CA.angularApp.component( "helpForm", {
    templateUrl: "/ngApp/chtn/member/help.html",
    controller: Ally.HelpFormController
} );
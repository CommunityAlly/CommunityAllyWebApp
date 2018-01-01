CA.angularApp.directive( "sendMessage", ["$rootScope", "fellowResidents", function ($rootScope, fellowResidents )
{
    function SendMessageController()
    {
        var vm = this;
        vm.shouldShowSendModal = false;
        vm.shouldShowButtons = true;

        // Display the send modal
        vm.showSendModal = function ()
        {
            vm.shouldShowSendModal = true;
            vm.sendResultMessage = "";
            vm.shouldShowButtons = true;

            setTimeout( function ()
            {
                document.getElementById( "message-text-box" ).focus();
            }, 50 );
        }

        // Hide the send modal
        vm.hideModal = function ()
        {
            vm.shouldShowSendModal = false;
            vm.messageBody = "";
        }

        // Send the user's message
        vm.sendMessage = function ()
        {
            vm.shouldShowButtons = false;
            vm.isSending = true;
            vm.sendResultMessage = "";

            fellowResidents.sendMessage( vm.recipientInfo.userId, vm.messageBody ).then( function ( httpResponse )
            {
                vm.isSending = false;
                vm.sendResultIsError = false;
                vm.messageBody = "";
                vm.sendResultMessage = "Message sent successfully!";

            }, function( httpResponse )
            {
                vm.shouldShowButtons = true;
                vm.isSending = false;
                vm.sendResultIsError = true;

                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                vm.sendResultMessage = "Failed to send: " + errorMessage;
            } );
        };
    }

    return {
        scope: {
            recipientInfo: "="
        },
        restrict: 'E',
        replace: 'true',
        controllerAs: 'vm',
        templateUrl: '/ngApp/Services/SendMessageTemplate.html',
        controller: SendMessageController,
        bindToController: true // Needed to hook up the isolate scope to our controller
    };
}] );
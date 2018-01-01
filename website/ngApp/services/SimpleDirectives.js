// Allow enter key event
// From http://stackoverflow.com/questions/15417125/submit-form-on-pressing-enter-with-angularjs
angular.module( "CondoAlly" ).directive( "ngEnter", function()
{
    return function( scope, element, attrs )
    {
        element.bind( "keydown keypress", function( event )
        {
            var EnterKeyCode = 13;
            if( event.which === EnterKeyCode )
            {
                scope.$apply( function()
                {
                    scope.$eval( attrs.ngEnter, { 'event': event } );
                } );

                event.preventDefault();
            }
        } );
    };
} );

angular.module( "CondoAlly" ).directive( "ngEscape", function()
{
    return function( scope, element, attrs )
    {
        element.bind( "keydown keypress", function( event )
        {
            var EscapeKeyCode = 27;
            if( event.which === EscapeKeyCode )
            {
                scope.$apply( function()
                {
                    scope.$eval( attrs.ngEscape, { 'event': event } );
                } );

                event.preventDefault();
            }
        } );
    };
} );
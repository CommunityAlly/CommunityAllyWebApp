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
                    scope.$eval( attrs.ngEnter, { '$event': event } );
                } );

                event.preventDefault();
            }
        } );
    };
} );

angular.module( "CondoAlly" ).directive( "ngEscape", function()
{
    return function( scope: ng.IScope, element: any, attrs: any )
    {
        element.bind( "keydown keypress", function( event: any )
        {
            var EscapeKeyCode = 27;
            if( event.which === EscapeKeyCode )
            {
                scope.$apply( function()
                {
                    scope.$eval( attrs.ngEscape, { '$event': event } );
                } );

                event.preventDefault();
            }
        } );
    };
} );

angular.module( "CondoAlly" ).directive( "imageonload", function()
{
    return {
        restrict: "A",
        link: function( scope: ng.IScope, element: any, attrs: any )
        {
            element.bind( "load", function( evt: any )
            {
                if( attrs.imageonload )
                    scope.$apply( attrs.imageonload );
            } );
        }
    };
} );

angular.module( "CondoAlly" ).directive( "imageonerror", function()
{
    return {
        restrict: "A",
        link: function( scope: ng.IScope, element: any, attrs: any )
        {
            element.bind( "error", function( evt: any )
            {
                if( attrs.imageonerror )
                    scope.$apply( attrs.imageonerror );
            } );
        }
    };
} );

angular.module( "CondoAlly" ).directive( 'onFileChange', function()
{
    return {
        restrict: 'A',
        link: function( scope: ng.IScope, element: any, attrs: any )
        {
            element.bind( "change", function( event: any )
            {
                scope.$apply( function()
                {
                    scope.$eval( attrs.onFileChange, { '$event': event } );
                } );

                event.preventDefault();
            } );
        }
    };
} );
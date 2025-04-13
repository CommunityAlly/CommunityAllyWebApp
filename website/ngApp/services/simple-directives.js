// Allow enter key event
// From http://stackoverflow.com/questions/15417125/submit-form-on-pressing-enter-with-angularjs
angular.module("CondoAlly").directive("ngEnter", function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            const EnterKeyCode = 13;
            if (event.which === EnterKeyCode) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEnter, { '$event': event });
                });
                event.preventDefault();
            }
        });
    };
});
// Allow ctrl+enter key event
angular.module("CondoAlly").directive("ngCtrlEnter", function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            //console.log( "In ngCtrlEnter", event.which, event.ctrlKey );
            const EnterKeyCode = 13;
            if (event.which === EnterKeyCode && event.ctrlKey) {
                console.log("Detected ngCtrlEnter", attrs.ngCtrlEnter);
                scope.$apply(function () {
                    scope.$eval(attrs.ngCtrlEnter, { '$event': event });
                });
                event.preventDefault();
            }
        });
    };
});
angular.module("CondoAlly").directive("ngEscape", function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            const EscapeKeyCode = 27;
            if (event.which === EscapeKeyCode) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEscape, { '$event': event });
                });
                event.preventDefault();
            }
        });
    };
});
angular.module("CondoAlly").directive("imageonload", function () {
    return {
        restrict: "A",
        link: function (scope, element, attrs) {
            element.bind("load", function () {
                if (attrs.imageonload)
                    scope.$apply(attrs.imageonload);
            });
        }
    };
});
angular.module("CondoAlly").directive("imageonerror", function () {
    return {
        restrict: "A",
        link: function (scope, element, attrs) {
            element.bind("error", function () {
                if (attrs.imageonerror)
                    scope.$apply(attrs.imageonerror);
            });
        }
    };
});
angular.module("CondoAlly").directive('onFileChange', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.bind("change", function (event) {
                scope.$apply(function () {
                    scope.$eval(attrs.onFileChange, { '$event': event });
                });
                event.preventDefault();
            });
        }
    };
});

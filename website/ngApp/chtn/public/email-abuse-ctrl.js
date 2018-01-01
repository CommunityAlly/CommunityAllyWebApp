/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/angularjs/angular-route.d.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for a page that lets a user complain about group e-mail utilization
     */
    var EmailAbuseController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function EmailAbuseController($http, $routeParams) {
            this.$http = $http;
            this.$routeParams = $routeParams;
            this.isLoading = false;
            this.showButtons = true;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        EmailAbuseController.prototype.$onInit = function () {
        };
        /**
         * Ask that
         */
        EmailAbuseController.prototype.reportAbuse = function (abuseReason) {
            // It's double encoded to prevent angular trouble, so double decode
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            var postData = {
                abuseReason: abuseReason,
                idVal: idVal,
                otherReasonText: this.otherReasonText
            };
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/EmailAbuse/v3", postData).then(function () {
                innerThis.isLoading = false;
                innerThis.showButtons = false;
            });
        };
        EmailAbuseController.$inject = ["$http", "$routeParams"];
        return EmailAbuseController;
    }());
    Ally.EmailAbuseController = EmailAbuseController;
})(Ally || (Ally = {}));
CA.angularApp.component("emailAbuse", {
    templateUrl: "/ngApp/chtn/public/email-abuse.html",
    controller: Ally.EmailAbuseController
});

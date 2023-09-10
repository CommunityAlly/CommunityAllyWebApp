/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/angularjs/angular-route.d.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for a page that lets a user complain about group email utilization
     */
    class EmailAbuseController {
        /**
         * The constructor for the class
         */
        constructor($http, $routeParams) {
            this.$http = $http;
            this.$routeParams = $routeParams;
            this.isLoading = false;
            this.showButtons = true;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.boardEmail = `board.${HtmlUtil.getSubdomain()}@inmail.${AppConfig.baseTld}`;
        }
        /**
         * Ask that
         */
        reportAbuse(abuseReason) {
            if (abuseReason === "not-member") {
                if (!confirm("You should reach out to the board rather than contact technical support. Click 'OK' to still proceed with contacting technical support anyway."))
                    return;
            }
            // It's double encoded to prevent angular trouble, so double decode
            const idVal = decodeURIComponent(this.$routeParams.idValue);
            const postData = {
                abuseReason: abuseReason,
                idVal: idVal,
                otherReasonText: this.otherReasonText
            };
            this.isLoading = true;
            this.$http.post("/api/EmailAbuse/v3", postData).then(() => {
                this.isLoading = false;
                this.showButtons = false;
            });
        }
    }
    EmailAbuseController.$inject = ["$http", "$routeParams"];
    Ally.EmailAbuseController = EmailAbuseController;
})(Ally || (Ally = {}));
CA.angularApp.component("emailAbuse", {
    templateUrl: "/ngApp/chtn/public/email-abuse.html",
    controller: Ally.EmailAbuseController
});

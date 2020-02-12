var Ally;
(function (Ally) {
    /**
     * The controller for the vendors page
     */
    var StreetAddressFormController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function StreetAddressFormController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        StreetAddressFormController.prototype.$onInit = function () {
            // Normalize the values that could come from the binding
            this.shouldHideName = !this.shouldHideName ? false : true;
        };
        /**
         * Occurs when one of the input fields is changed
         */
        StreetAddressFormController.prototype.onComponentChange = function () {
            if (this.onChange)
                this.onChange();
        };
        StreetAddressFormController.$inject = ["$http", "SiteInfo"];
        return StreetAddressFormController;
    }());
    Ally.StreetAddressFormController = StreetAddressFormController;
})(Ally || (Ally = {}));
CA.angularApp.component("streetAddressForm", {
    bindings: {
        streetAddress: "=",
        onChange: "&",
        shouldHideName: "<"
    },
    templateUrl: "/ngApp/common/street-address-form.html",
    controller: Ally.StreetAddressFormController
});

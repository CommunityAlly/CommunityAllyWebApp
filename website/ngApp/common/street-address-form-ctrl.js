var Ally;
(function (Ally) {
    /**
     * The controller for the vendors page
     */
    class StreetAddressFormController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            // Normalize the values that could come from the binding
            this.shouldHideName = !this.shouldHideName ? false : true;
        }
        /**
         * Occurs when one of the input fields is changed
         */
        onComponentChange() {
            if (this.onChange)
                this.onChange();
        }
    }
    StreetAddressFormController.$inject = ["$http", "SiteInfo"];
    Ally.StreetAddressFormController = StreetAddressFormController;
})(Ally || (Ally = {}));
CA.angularApp.component("streetAddressForm", {
    bindings: {
        streetAddress: "=",
        onChange: "&",
        shouldHideName: "<",
        useCareOf: "<"
    },
    templateUrl: "/ngApp/common/street-address-form.html",
    controller: Ally.StreetAddressFormController
});

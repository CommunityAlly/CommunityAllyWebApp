namespace Ally
{
    /**
     * The controller for the vendors page
     */
    export class StreetAddressFormController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo"];
        streetAddress: FullAddress;
        onChange: () => void;
        shouldHideName: boolean;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: SiteInfoService )
        {
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            // Normalize the values that could come from the binding
            this.shouldHideName = !this.shouldHideName ? false : true;
        }


        /**
         * Occurs when one of the input fields is changed
         */
        onComponentChange()
        {
            if( this.onChange )
                this.onChange();
        }
    }
}

CA.angularApp.component( "streetAddressForm", {
    bindings: {
        streetAddress: "=",
        onChange: "&",
        shouldHideName: "<"
    },
    templateUrl: "/ngApp/common/street-address-form.html",
    controller: Ally.StreetAddressFormController
} );
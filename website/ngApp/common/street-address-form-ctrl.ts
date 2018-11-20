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
        onChange: "&"
    },
    templateUrl: "/ngApp/common/street-address-form.html",
    controller: Ally.StreetAddressFormController
} );
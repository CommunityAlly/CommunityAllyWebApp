namespace Ally
{
    /**
     * The controller for an individual vendor entry
     */
    export class PreferredVendorItemController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo"];

        vendorItem: PreferredVendor;
        editVendorItem: PreferredVendor;
        isLoading = false;
        isSiteManager = false;
        onDelete: any;
        onAddNewVendor: () => void;
        onParentDataNeedsRefresh: () => void;
        isInEditMode = false;

        /** Indicates if this vendor item control is the fixed "add" form for the bottom of the page */
        isAddForm: boolean;

        addressAutocomplete: google.maps.places.Autocomplete;
        static AutocompleteServiceOptions = [{ text: "Additions & Remodels" },
                                            { text: "Appliances" },
                                            { text: "Cabinets & Countertops" },
                                            { text: "Cleaning" },
                                            { text: "Concrete & Masonry" },
                                            { text: "Deck, Porch, & Gazebo" },
                                            { text: "Drywall & Insulation" },
                                            { text: "Electrical" },
                                            { text: "Fencing" },
                                            { text: "Flooring" },
                                            { text: "Garages" },
                                            { text: "Gutters" },
                                            { text: "Handy Man" },
                                            { text: "HVAC" },
                                            { text: "Landscaping, Lawn Care & Sprinklers" },
                                            { text: "Painting & Staining" },
                                            { text: "Pest Control" },
                                            { text: "Plumbing" },
                                            { text: "Remodeling" },
                                            { text: "Roofing" },
                                            { text: "Siding" },
                                            { text: "Snow Removal" },
                                            { text: "Solar Electric, Heating & Cooling" },
                                            { text: "Swimming Pools" },
                                            { text: "Windows & Doors" }];


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
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.isAddForm = this.vendorItem == null;

            if( this.isAddForm )
            {
                this.isInEditMode = true;
                this.vendorItem = new PreferredVendor();
                this.editVendorItem = new PreferredVendor();

                // Wait until the page renders then hook up the autocomplete
                window.setTimeout( () => this.hookupAddressAutocomplete(), 500 );
            }
        }


        /**
         * Attach the Google Places auto-complete logic to the address text box
         */
        hookupAddressAutocomplete()
        {
            // Also mask phone numbers
            if( this.siteInfo.privateSiteInfo.country === "US" || this.siteInfo.privateSiteInfo.country === "CA" )
            {
                const phoneFields: any = $( ".mask-phone" );
                phoneFields.mask( "(999) 999-9999? x999", { autoclear: false } );
            }

            // If we know our group's position, let's tighten the auto-complete suggestion radius
            let autocompleteOptions: google.maps.places.AutocompleteOptions = undefined;
            if( this.siteInfo.privateSiteInfo.googleGpsPosition )
            {
                const TwentyFiveMilesInMeters = 40234;

                const circle = new google.maps.Circle( {
                    center: this.siteInfo.privateSiteInfo.googleGpsPosition,
                    radius: TwentyFiveMilesInMeters
                } );

                autocompleteOptions = {
                    bounds: circle.getBounds()
                };
            }

            const addressInput = document.getElementById( "vendor-" + ( this.vendorItem.preferredVendorId || "" ) + "-address-text-box" ) as HTMLInputElement;
            this.addressAutocomplete = new google.maps.places.Autocomplete( addressInput, autocompleteOptions );

            google.maps.event.addListener( this.addressAutocomplete,
                "place_changed",
                () =>
                {
                    const place = this.addressAutocomplete.getPlace();

                    if( !this.editVendorItem.fullAddress )
                        this.editVendorItem.fullAddress = new FullAddress();

                    this.editVendorItem.fullAddress.oneLiner = place.formatted_address;
                }
            );
        }


        /**
         * Called when the user clicks the button to save the new/edit vendor data
         */
        onSaveVendor()
        {
            if( HtmlUtil.isNullOrWhitespace( this.editVendorItem.companyName ) )
            {
                alert( "Please enter a company name" );
                return;
            }

            if( !this.editVendorItem.servicesTagArray || this.editVendorItem.servicesTagArray.length === 0 )
            {
                alert( "Please enter at least one service provided" );
                return;
            }

            // Ensure the website starts properly
            if( !HtmlUtil.isNullOrWhitespace( this.editVendorItem.companyWeb ) )
            {
                if( this.editVendorItem.companyWeb.indexOf( "http" ) !== 0 )
                    this.editVendorItem.companyWeb = "http://" + this.editVendorItem.companyWeb;
            }

            const saveMethod = this.editVendorItem.preferredVendorId == null ? this.$http.post : this.$http.put;

            this.isLoading = true;

            // Process ng-tag-input model into a pipe-separated string for the server
            let servicesProvidedString = "";
            _.each( this.editVendorItem.servicesTagArray, ( tag: any ) =>
            {
                servicesProvidedString += "|" + tag.text;
            } );
            servicesProvidedString += "|";
            this.editVendorItem.servicesProvided = servicesProvidedString;

            saveMethod( "/api/PreferredVendors", this.editVendorItem ).then(
                () =>
                {
                    this.isLoading = false;

                    if( this.isAddForm )
                    {
                        this.editVendorItem = new PreferredVendor();

                        if( this.onAddNewVendor )
                            this.onAddNewVendor();
                    }
                    else
                        this.isInEditMode = false;

                    if( this.onParentDataNeedsRefresh )
                        this.onParentDataNeedsRefresh();

                },
                ( exception: ExceptionResult ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to save the vendor information: " + exception.exceptionMessage );
                }
            );
        }


        onCancelEdit()
        {
            this.isInEditMode = false;
        }


        onEditItem()
        {
            // Deep clone the vendor item
            this.editVendorItem = JSON.parse( JSON.stringify( this.vendorItem ) );
            this.isInEditMode = true;

            window.setTimeout(() => this.hookupAddressAutocomplete(), 500 );
        }


        deleteItem()
        {
            if( !confirm( "Are you sure you want to remove this vendor?" ) )
                return;

            this.isLoading = true;

            this.$http.delete( "/api/PreferredVendors/" + this.vendorItem.preferredVendorId ).then(
                () =>
                {
                    this.isLoading = false;

                    if( this.onParentDataNeedsRefresh )
                        this.onParentDataNeedsRefresh();

                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to delete the vendor: " + response.data.exceptionMessage );
                }
            );
        }


        getServiceAutocomplete( enteredText: string )
        {
            return _.where( PreferredVendorItemController.AutocompleteServiceOptions, ( option: any ) => option.text.toLowerCase().indexOf( enteredText.toLowerCase() ) !== -1 );
        }
    }
}


CA.angularApp.component( "preferredVendorItem", {
    bindings: {
        vendorItem: "=?",
        onParentDataNeedsRefresh: "&?",
        onAddNewVendor: "&?"
    },
    templateUrl: "/ngApp/common/preferred-vendor-item.html",
    controller: Ally.PreferredVendorItemController
} );
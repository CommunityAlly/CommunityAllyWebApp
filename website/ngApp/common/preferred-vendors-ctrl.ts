/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Scripts/typings/moment/moment.d.ts" />
/// <reference path="../Services/html-util.ts" />
/// <reference path="../Common/map-util.ts" />


namespace Ally
{
    export class PreferredVendor
    {
        constructor()
        {
            this.fullAddress = new FullAddress();
        }

        preferredVendorId: number;
        groupId: number;
        companyName: string;
        companyPhone: string;
        companyWeb: string;
        companyFullAddressId: number;
        fullAddress: FullAddress;
        contactName: string;
        contactPhone: string;
        contactEmail: string;
        servicesProvided: string;
        notes: string;
        addedByUserId: string;
        addedDateUtc: Date;
        servicesProvidedSplit: string[];
        servicesTagArray: any[];
        servicesProvidedFriendly: string;
        addedByFullName: string;
    }


    /**
     * The controller for the vendors page
     */
    export class PreferredVendorsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo"];

        allVendors: PreferredVendor[] = [];
        filteredVendors: PreferredVendor[] = [];
        editVendor = new PreferredVendor();
        isLoading = false;
        isSiteManager = false;
        usedServiceTags: string[] = [];
        filterTags: string[] = [];


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
            this.retrieveVendors();
        }


        /**
         * Populate the vendors
         */
        retrieveVendors()
        {
            this.isLoading = true;

            var innerThis = this;
            this.$http.get( "/api/PreferredVendors" ).success(( vendors: PreferredVendor[] ) =>
            {
                innerThis.isLoading = false;
                innerThis.allVendors = vendors;
                innerThis.filteredVendors = vendors;

                // Process the tags into an array for the ng-tag-input control, build the list of
                // all used tags, and convert the add dates to local time
                innerThis.usedServiceTags = [];
                _.each( innerThis.allVendors, ( v: PreferredVendor ) =>
                {
                    v.servicesTagArray = [];
                    _.each( v.servicesProvidedSplit, ( ss ) => v.servicesTagArray.push( { text: ss } ) );

                    innerThis.usedServiceTags = innerThis.usedServiceTags.concat( v.servicesProvidedSplit );

                    // Convert the added timestamps to local time
                    v.addedDateUtc = moment.utc( v.addedDateUtc ).toDate();
                } );

                // Remove any duplicate tags
                innerThis.usedServiceTags = _.uniq( innerThis.usedServiceTags );
                innerThis.usedServiceTags.sort();
            } );
        }


        onTagFilterToggle( tagName: string )
        {
            // Add if the tag to our filter list if it's not there, remove it if it is
            var tagCurrentIndex = this.filterTags.indexOf( tagName );
            if( tagCurrentIndex === -1 )
                this.filterTags.push( tagName );
            else
                this.filterTags.splice( tagCurrentIndex, 1 );

            if( this.filterTags.length === 0 )
                this.filteredVendors = this.allVendors;
            else
            {
                this.filteredVendors = [];

                // Grab any vendors that have one of the tags by which we're filtering
                var innerThis = this;
                _.each( this.allVendors, ( v ) =>
                {
                    if( _.intersection( v.servicesProvidedSplit, innerThis.filterTags ).length > 0 )
                        innerThis.filteredVendors.push( v );
                } );
            }
        }


        onAddedNewVendor()
        {
            this.retrieveVendors();
        }
    }
}

CA.angularApp.component( "preferredVendors", {
    templateUrl: "/ngApp/common/preferred-vendors.html",
    controller: Ally.PreferredVendorsController
} );
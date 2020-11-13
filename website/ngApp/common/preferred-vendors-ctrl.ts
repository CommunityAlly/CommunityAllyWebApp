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
        entriesSortField: string;
        entriesSortAscending: boolean = true;
        static StorageKey_SortField = "vendors_entriesSortField";
        static StorageKey_SortDir = "vendors_entriesSortAscending";


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

            this.entriesSortField = window.localStorage[PreferredVendorsController.StorageKey_SortField];
            if( !this.entriesSortField )
            {
                this.entriesSortField = "name";
                this.entriesSortAscending = true;
            }
            else
                this.entriesSortAscending = window.localStorage[PreferredVendorsController.StorageKey_SortDir] === "true";

            this.retrieveVendors();
        }


        /**
         * Populate the vendors
         */
        retrieveVendors()
        {
            this.isLoading = true;

            this.$http.get( "/api/PreferredVendors" ).success(( vendors: PreferredVendor[] ) =>
            {
                this.isLoading = false;
                this.allVendors = vendors;
                this.filteredVendors = vendors;
                this.sortEntries();

                // Process the tags into an array for the ng-tag-input control, build the list of
                // all used tags, and convert the add dates to local time
                this.usedServiceTags = [];
                _.each( this.allVendors, ( v: PreferredVendor ) =>
                {
                    v.servicesTagArray = [];
                    _.each( v.servicesProvidedSplit, ( ss ) => v.servicesTagArray.push( { text: ss } ) );

                    this.usedServiceTags = this.usedServiceTags.concat( v.servicesProvidedSplit );

                    // Convert the added timestamps to local time
                    v.addedDateUtc = moment.utc( v.addedDateUtc ).toDate();
                } );

                // Remove any duplicate tags
                this.usedServiceTags = _.uniq( this.usedServiceTags );
                this.usedServiceTags.sort();
            } );
        }


        /**
         * Export the vendor list as a CSV
         */
        exportVendorCsv()
        {
            if( typeof ( analytics ) !== "undefined" )
                analytics.track( 'exportResidentCsv' );

            var innerThis = this;

            var csvColumns = [
                {
                    headerText: "Company Name",
                    fieldName: "companyName"
                },
                {
                    headerText: "Company Phone",
                    fieldName: "companyPhone"
                },
                {
                    headerText: "Company Website",
                    fieldName: "companyWeb"
                },
                {
                    headerText: "Address",
                    fieldName: "fullAddress",
                    dataMapper: function ( value: FullAddress )
                    {
                        return !value ? "" : value.oneLiner;
                    }
                },
                {
                    headerText: "Contact Name",
                    fieldName: "contactName"
                },
                {
                    headerText: "Contact Phone",
                    fieldName: "contactPhone"
                },
                {
                    headerText: "Contact Email",
                    fieldName: "contactEmail"
                },
                {
                    headerText: "Services",
                    fieldName: "servicesProvided",
                    dataMapper: function( servicesProvided: string )
                    {
                        if( HtmlUtil.isNullOrWhitespace( servicesProvided ) )
                            return servicesProvided;

                        // Trim leading and trailing pipes
                        if( HtmlUtil.startsWith( servicesProvided, "|" ) )
                            servicesProvided = servicesProvided.substr( 1 );

                        if( HtmlUtil.endsWith( servicesProvided, "|" ) )
                            servicesProvided = servicesProvided.substr( 0, servicesProvided.length - 1 );

                        return servicesProvided;
                    }
                },
                {
                    headerText: "Notes",
                    fieldName: "notes"
                }
            ];

            var csvDataString = Ally.createCsvString( this.allVendors, csvColumns );

            HtmlUtil2.downloadCsv( csvDataString, "Vendors.csv" );
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


        /**
         * Sort the entries by a certain field
         */
        sortEntries()
        {
            const sortEntry = ( pv: PreferredVendor ) =>
            {
                if( this.entriesSortField === "name" )
                    return pv.companyName;
                else
                    return pv.addedDateUtc;
            };

            this.filteredVendors = _.sortBy( this.filteredVendors, sortEntry );

            if( this.entriesSortAscending )
                this.filteredVendors.reverse();
        }


        /**
         * Sort the entries by a certain field
         */
        updateEntriesSort( fieldName: string )
        {
            if( !fieldName )
                fieldName = "entryDate";

            if( this.entriesSortField === fieldName )
                this.entriesSortAscending = !this.entriesSortAscending;
            else
            {
                this.entriesSortField = fieldName;
                this.entriesSortAscending = false;
            }

            window.localStorage[PreferredVendorsController.StorageKey_SortField] = this.entriesSortField;
            window.localStorage[PreferredVendorsController.StorageKey_SortDir] = this.entriesSortAscending;

            this.sortEntries();
        }
    }
}

CA.angularApp.component( "preferredVendors", {
    templateUrl: "/ngApp/common/preferred-vendors.html",
    controller: Ally.PreferredVendorsController
} );
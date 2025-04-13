﻿namespace Ally
{
    /**
     * The controller for the admin-only page to manage group homes/units
     */
    export class ManageHomesController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo"];
        isLoading: boolean = false;
        unitToEdit: Unit = new Unit();
        isEdit: boolean = false;
        units: Unit[];
        unitNamePerLine: string;
        unitAddressPerLine: string;
        lastFastAddName: string;
        isAdmin: boolean;
        homeName: string;
        isHoaAlly: boolean = false;
        isCondoAlly: boolean = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isAdmin = this.siteInfo.userInfo.isAdmin;
            this.homeName = AppConfig.homeName || "Unit";
            this.isCondoAlly = AppConfig.appShortName === "condo";
            this.isHoaAlly = AppConfig.appShortName === "hoa";

            this.refresh();
        }


        /**
         * Populate the page
         */
        refresh()
        {
            this.isLoading = true;

            this.$http.get( "/api/Unit?includeAddressData=true" ).then( ( response: ng.IHttpPromiseCallbackArg<Unit[]> ) =>
            {
                this.isLoading = false;
                this.units = response.data;

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult>) =>
            {
                this.isLoading = false;
                alert( "Failed to load homes: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Occurs when the user presses the button to create a new unit
         */
        onCreateUnitClick()
        {
            $( "#AddUnitForm" ).validate();
            if( !$( "#AddUnitForm" ).valid() )
                return;

            this.isLoading = true;

            const onSave = () =>
            {
                this.isLoading = false;
                this.isEdit = false;

                this.unitToEdit = new Unit();

                this.refresh();
            };

            const onError = ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to save: " + response.data.exceptionMessage );
            };

            if( this.isEdit )
                this.$http.put( "/api/Unit", this.unitToEdit ).then( onSave, onError );
            else
                this.$http.post( "/api/Unit/AddSingle", this.unitToEdit ).then( onSave, onError );
        }


        /**
         * Occurs when the user presses the button to edit a unit
         */
        onEditUnitClick( unit: Unit )
        {
            this.isEdit = true;
            this.unitToEdit = _.clone( unit );

            if( unit.fullAddress )
                this.unitToEdit.streetAddress = unit.fullAddress.oneLiner;

            document.getElementById( "unit-edit-panel" ).scrollIntoView();
        }


        /**
         * Occurs when the user presses the button to refresh a unit's geocoded info from Google
         */
        onRefreshUnitFromGoogle( unit: Unit )
        {
            this.isLoading = true;

            this.$http.put( "/api/Unit/ForceRefreshAddressFromGoogle?unitId=" + unit.unitId, null ).then( () =>
            {
                this.isLoading = false;
                this.refresh();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to refresh: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Occurs when the user presses the button to delete a unit
         */
        onDeleteUnitClick( unit: Unit )
        {
            this.isLoading = true;

            this.$http.delete( "/api/Unit/" + unit.unitId ).then( () =>
            {
                this.isLoading = false;
                this.refresh();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to delete: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Occurs when the user presses the button to fast add units
         */
        onFastAddUnits()
        {
            this.isLoading = true;

            this.$http.post( "/api/Unit/FastAdd?fastAdd=" + this.lastFastAddName, null ).then(() =>
            {
                this.isLoading = false;
                this.refresh();

            }, ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed fast add: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Occurs when the user presses the button to add units from the multi-line text box
         */
        onAddUnitsPerLine()
        {
            const postData =
                {
                    action: "onePerLine",
                    lines: this.unitNamePerLine
                };

            this.isLoading = true;

            this.$http.post( "/api/Unit/Multiline", postData ).then( () =>
            {
                this.isLoading = false;
                this.refresh();
            }, () =>
            {
                this.isLoading = false;
                alert( "Failed" );
            } );
        }


        /**
         * Occurs when the user presses the button to add homes from the address multi-line text box
         */
        onAddUnitsByAddressPerLine()
        {
            const postData =
                {
                    action: "onePerLine",
                    lines: this.unitAddressPerLine
                };

            this.isLoading = true;

            this.$http.post( "/api/Unit/FromAddresses", postData ).then(() =>
            {
                this.isLoading = false;
                this.unitAddressPerLine = "";
                this.refresh();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to add: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Occurs when the user presses the button to delete all units
         */
        onDeleteAllClick()
        {
            if( !confirm( "This will delete every unit! This should only be used for new sites!" ) )
                return;

            this.isLoading = true;

            this.$http.delete( "/api/Unit/DeleteAll?deleteAction=all" ).then( () =>
            {
                this.isLoading = false;
                this.refresh();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to delete units: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Export the home list as a CSV
         */
        exportHomesCsv()
        {
            if( typeof ( analytics ) !== "undefined" )
                analytics.track( 'exportHomesCsv' );

            const csvColumns = [
                {
                    headerText: "Name/Label",
                    fieldName: "name"
                },
                {
                    headerText: "Address",
                    fieldName: "fullAddress",
                    dataMapper: ( value: FullAddress ) => value ? value.oneLiner : ""
                },
                {
                    headerText: "Notes",
                    fieldName: "notes"
                }
            ];

            const csvDataString = Ally.createCsvString( <any[]>this.units, csvColumns );

            HtmlUtil2.downloadCsv( csvDataString, this.siteInfo.publicSiteInfo.shortName + "-homes.csv" );
        }
    }
}


CA.angularApp.component( "manageHomes", {
    templateUrl: "/ngApp/admin/manage-homes.html",
    controller: Ally.ManageHomesController
} );
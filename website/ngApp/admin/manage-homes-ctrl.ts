namespace Ally
{
    /**
     * The controller for the admin-only page to manage group homes/units
     */
    export class ManageHomesController implements ng.IController
    {
        static $inject = ["$http", "$rootScope"];
        isLoading: boolean = false;
        unitToEdit: Unit = new Unit();
        isEdit: boolean = false;
        units: Unit[];
        unitNamePerLine: string;
        unitAddressPerLine: string;
        lastFastAddName: string;


        /**
            * The constructor for the class
            */
        constructor( private $http: ng.IHttpService, private $q: ng.IQService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.refresh();
        }


        /**
         * Populate the page
         */
        refresh()
        {
            this.isLoading = true;

            var innerThis = this;
            this.$http.get( "/api/Unit?includeAddressData=true" ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<Unit[]> )
            {
                innerThis.isLoading = false;
                innerThis.units = httpResponse.data;
            },
                function()
                {
                    innerThis.isLoading = false;
                    alert( "Failed to load homes" );
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

            var innerThis = this;
            var onSave = () =>
            {
                innerThis.isLoading = false;
                innerThis.isEdit = false;

                innerThis.unitToEdit = new Unit();

                innerThis.refresh();
            };

            if( this.isEdit )
                this.$http.put( "/api/Unit", this.unitToEdit ).then( onSave );
            else
                this.$http.post( "/api/Unit", this.unitToEdit ).then( onSave );
        }


        /**
         * Occurs when the user presses the button to edit a unit
         */
        onEditUnitClick( unit: Unit )
        {
            this.isEdit = true;
            this.unitToEdit = unit;

            if( unit.fullAddress )
                this.unitToEdit.streetAddress = unit.fullAddress.oneLiner;
        }


        /**
         * Occurs when the user presses the button to delete a unit
         */
        onDeleteUnitClick( unit: Unit )
        {
            var innerThis = this;
            this.$http.delete( "/api/Unit/" + unit.unitId ).then( () =>
            {
                innerThis.refresh();
            } );
        }


        /**
         * Occurs when the user presses the button to fast add units
         */
        onFastAddUnits()
        {
            this.isLoading = true;

            var innerThis = this;
            this.$http.post( "/api/Unit?fastAdd=" + this.lastFastAddName, null ).then(() =>
            {
                this.isLoading = false;
                innerThis.refresh();
            }, ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed fast add:" + response.data.exceptionMessage );
                } );
        }


        /**
         * Occurs when the user presses the button to add units from the multi-line text box
         */
        onAddUnitsPerLine()
        {
            var postData =
                {
                    action: "onePerLine",
                    lines: this.unitNamePerLine
                };

            this.isLoading = true;

            var innerThis = this;
            this.$http.post( "/api/Unit?onePerLine=1", postData ).then( function()
            {
                innerThis.isLoading = false;
                innerThis.refresh();
            }, function()
                {
                    innerThis.isLoading = false;
                    alert( "Failed" );
                } );
        }


        /**
         * Occurs when the user presses the button to add homes from the address multi-line text box
         */
        onAddUnitsByAddressPerLine()
        {
            var postData =
                {
                    action: "onePerLine",
                    lines: this.unitAddressPerLine
                };

            this.isLoading = true;

            var innerThis = this;
            this.$http.post( "/api/Unit/FromAddresses", postData ).then(() =>
            {
                innerThis.isLoading = false;
                innerThis.refresh();

            }, () =>
                {
                    innerThis.isLoading = false;
                    alert( "Failed" );
                } );
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user presses the button to delete all units
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onDeleteAllClick()
        {
            if( !confirm( "This will delete every unit! This should only be used for new sites!" ) )
                return;

            var innerThis = this;
            this.$http.get( "/api/Unit?deleteAction=all" ).then( function()
            {
                innerThis.refresh();

            }, function()
                {
                } );
        }
    }
}


CA.angularApp.component( "manageHomes", {
    templateUrl: "/ngApp/admin/manage-homes.html",
    controller: Ally.ManageHomesController
} );
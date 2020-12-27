namespace Ally
{
    /**
     * The controller for the page to track group spending
     */
    export class DateRangePickerController implements ng.IController
    {
        static $inject = ["appCacheService"];

        filterPresetDateRange: string = "thisMonth";
        startDate: Date;
        endDate: Date;
        onChange: () => void;


        /**
        * The constructor for the class
        */
        constructor( private appCacheService: AppCacheService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.selectPresetDateRange( true );
        }


        selectPresetDateRange( suppressRefresh: boolean = false )
        {
            if( this.filterPresetDateRange === "thisMonth" )
            {
                this.startDate = moment().startOf( 'month' ).toDate();
                this.endDate = moment().endOf( 'month' ).toDate();
            }
            else if( this.filterPresetDateRange === "lastMonth" )
            {
                var lastMonth = moment().subtract( 1, 'months' );
                this.startDate = lastMonth.startOf( 'month' ).toDate();
                this.endDate = lastMonth.endOf( 'month' ).toDate();
            }
            else if( this.filterPresetDateRange === "thisYear" )
            {
                this.startDate = moment().startOf( 'year' ).toDate();
                this.endDate = moment().endOf( 'year' ).toDate();
            }
            else if( this.filterPresetDateRange === "lastYear" )
            {
                var lastYear = moment().subtract( 1, 'years' );
                this.startDate = lastYear.startOf( 'year' ).toDate();
                this.endDate = lastYear.endOf( 'year' ).toDate();
            }
            else if( this.filterPresetDateRange === "oneYear" )
            {
                this.startDate = moment().subtract( 1, 'years' ).toDate();
                this.endDate = moment().toDate();
            }

            if( !suppressRefresh && this.onChange )
                window.setTimeout( () => this.onChange(), 50 ); // Delay a bit to let Angular's digests run on the bound dates
        }
    }
}


CA.angularApp.component( "dateRangePicker", {
    bindings: {
        startDate: "=",
        endDate: "=",
        onChange: "&"
    },
    templateUrl: "/ngApp/common/date-range-picker.html",
    controller: Ally.DateRangePickerController
} );
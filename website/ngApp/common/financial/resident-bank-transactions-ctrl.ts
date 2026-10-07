namespace Ally
{
    /**
     * The controller for a read-only modal that shows residents the association's bank transactions
     */
    export class ResidentBankTransactionsController implements ng.IController
    {
        static $inject = ["$http"];

        /** How many days back of bank transactions to display */
        readonly NumDaysToShow: number = 90;

        shouldShowModal: boolean = false;
        isLoading: boolean = false;
        entries: LedgerEntry[] = [];
        loadErrorMessage: string = null;
        hasLoaded: boolean = false;
        startDate: Date;
        endDate: Date;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService )
        {
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            this.endDate = moment().toDate();
            this.startDate = moment().subtract( this.NumDaysToShow, "days" ).toDate();
        }


        showModal()
        {
            this.shouldShowModal = true;

            // Only hit the server the first time the modal is opened, the data is read-only so there's
            // no reason to reload it on every open
            if( !this.hasLoaded )
                this.refreshEntries();
        }


        closeModal()
        {
            this.shouldShowModal = false;
        }


        refreshEntries()
        {
            this.isLoading = true;
            this.loadErrorMessage = null;

            const getUri = `/api/OwnerLedger/BankTransactions?startDate=${encodeURIComponent( this.startDate.toISOString() )}&endDate=${encodeURIComponent( this.endDate.toISOString() )}`;

            this.$http.get( getUri ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<LedgerPageInfo> ) =>
                {
                    this.isLoading = false;
                    this.hasLoaded = true;

                    // Show the newest transactions first
                    this.entries = ( httpResponse.data.entries || [] ).sort( ( a, b ) => b.transactionDate.valueOf() - a.transactionDate.valueOf() );
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    this.entries = [];
                    this.loadErrorMessage = "Failed to load bank transactions"
                        + ( httpResponse.data && httpResponse.data.exceptionMessage ? `: ${httpResponse.data.exceptionMessage}` : "." )
                        + " Please try again and contact technical support if the problem persists.";
                }
            );
        }
    }


    /** The subset of the server's LedgerPageInfo response that this read-only view needs */
    class LedgerPageInfo
    {
        entries: LedgerEntry[];
    }
}


CA.angularApp.component( "residentBankTransactions", {
    templateUrl: "/ngApp/common/financial/resident-bank-transactions.html",
    controller: Ally.ResidentBankTransactionsController
} );

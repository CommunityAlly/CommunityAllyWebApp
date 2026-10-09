var Ally;
(function (Ally) {
    /**
     * The controller for a read-only modal that shows residents the association's bank transactions
     */
    class GroupBankTransactionsController {
        /**
         * The constructor for the class
         */
        constructor($http) {
            this.$http = $http;
            /** How many days back of bank transactions to display */
            this.NumDaysToShow = 90;
            this.shouldShowModal = false;
            this.isLoading = false;
            this.entries = [];
            this.loadErrorMessage = null;
            this.hasLoaded = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.endDate = moment().toDate();
            this.startDate = moment().subtract(this.NumDaysToShow, "days").toDate();
        }
        showModal() {
            this.shouldShowModal = true;
            // Only hit the server the first time the modal is opened, the data is read-only so there's
            // no reason to reload it on every open
            if (!this.hasLoaded)
                this.refreshEntries();
        }
        closeModal() {
            this.shouldShowModal = false;
        }
        refreshEntries() {
            this.isLoading = true;
            this.loadErrorMessage = null;
            const getUri = `/api/OwnerLedger/BankTransactions?startDate=${encodeURIComponent(this.startDate.toISOString())}&endDate=${encodeURIComponent(this.endDate.toISOString())}`;
            this.$http.get(getUri).then((httpResponse) => {
                this.isLoading = false;
                this.hasLoaded = true;
                // Show the newest transactions first
                this.entries = (httpResponse.data.entries || []).sort((a, b) => b.transactionDate.valueOf() - a.transactionDate.valueOf());
            }, (httpResponse) => {
                this.isLoading = false;
                this.entries = [];
                this.loadErrorMessage = "Failed to load bank transactions"
                    + (httpResponse.data && httpResponse.data.exceptionMessage ? `: ${httpResponse.data.exceptionMessage}` : ".")
                    + " Please try again and contact technical support if the problem persists.";
            });
        }
    }
    GroupBankTransactionsController.$inject = ["$http"];
    Ally.GroupBankTransactionsController = GroupBankTransactionsController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupBankTransactions", {
    templateUrl: "/ngApp/common/financial/group-bank-transactions.html",
    controller: Ally.GroupBankTransactionsController
});

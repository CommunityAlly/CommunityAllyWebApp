var Ally;
(function (Ally) {
    /**
     * The controller for display a resident's financial transaction history
     */
    class ResidentTransactionsController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $timeout, uiGridConstants, $scope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.uiGridConstants = uiGridConstants;
            this.$scope = $scope;
            this.shouldShowModal = false;
            this.isLoading = false;
            this.HistoryPageSize = 50;
            this.isUnitColVisible = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.homeName = AppConfig.homeName || "Unit";
            // A callback to calculate the sum for a column across all ui-grid pages, not just the visible page
            const addAmountOverAllRows = () => {
                const allGridRows = this.transactionGridApi.grid.rows;
                const visibleGridRows = allGridRows.filter(r => r.visible && r.entity && !isNaN(r.entity.amount));
                let sum = 0;
                visibleGridRows.forEach(item => sum += (item.entity.amount || 0));
                return sum;
            };
            this.transactionGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false },
                        //{
                        //    field: 'accountName', filter: {
                        //        type: this.uiGridConstants.filter.SELECT,
                        //        selectOptions: []
                        //    }, displayName: 'Account', enableCellEdit: false, width: 140, enableFiltering: true
                        //},
                        { field: 'description', displayName: 'Description', enableFiltering: true, filter: { placeholder: "search" } },
                        { field: 'categoryDisplayName', editModelField: "financialCategoryId", displayName: 'Category', width: 170, editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'unitGridLabel', editModelField: "associatedUnitId", displayName: this.homeName, width: 120, enableFiltering: true },
                        { field: 'amount', displayName: 'Amount', width: 140, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: addAmountOverAllRows, footerCellTemplate: '<div class="ui-grid-cell-contents">Total: {{col.getAggregationValue() | currency }}</div>' }
                    ],
                    enableFiltering: true,
                    enableSorting: true,
                    showColumnFooter: true,
                    enableHorizontalScrollbar: window.innerWidth < 640 ? this.uiGridConstants.scrollbars.ALWAYS : this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: true,
                    minRowsToShow: this.HistoryPageSize,
                    paginationPageSize: this.HistoryPageSize,
                    paginationPageSizes: [this.HistoryPageSize],
                    enableRowHeaderSelection: false,
                    onRegisterApi: (gridApi) => {
                        this.transactionGridApi = gridApi;
                    }
                };
        }
        /**
         * Populate the text that is shown for the unit column in the resident grid
         */
        populateGridUnitLabels() {
            return this.$http.get("/api/MemberUnit/NamesOnly").then((httpResponse) => {
                const allUnits = httpResponse.data;
                _.each(this.allFinancialTxns, (tx) => {
                    if (!tx.associatedUnitId)
                        return;
                    const unit = allUnits.find(u => u.unitId === tx.associatedUnitId);
                    if (!unit)
                        return;
                    tx.unitGridLabel = unit.name;
                });
            }, (httpResponse) => {
                //this.isLoading = false;
                console.log("Failed to load units");
                //alert( `Failed to load units, please contact technical support. (${httpResponse.data.exceptionMessage})` );
            });
        }
        showModal() {
            this.shouldShowModal = true;
            this.refreshEntries();
        }
        refreshEntries() {
            this.isLoading = true;
            this.$http.get(`/api/OwnerLedger/MyTransactions`).then((httpResponse) => {
                this.isLoading = false;
                this.allFinancialTxns = httpResponse.data.entries;
                this.ownerFinanceTxNote = httpResponse.data.ownerFinanceTxNote;
                this.ownerBalance = httpResponse.data.ownerBalance;
                // Hide the unit column if the owner only has one unit
                const allUnitIds = this.allFinancialTxns.map(u => u.associatedUnitId);
                const uniqueUnitIds = allUnitIds.filter((v, i, a) => a.indexOf(v) === i);
                const unitColumn = this.transactionGridOptions.columnDefs.find(c => c.field === "unitGridLabel");
                if (unitColumn) {
                    unitColumn.visible = uniqueUnitIds.length > 1 || this.siteInfo.userInfo.usersUnits.length > 1;
                    this.isUnitColVisible = unitColumn.visible;
                }
                //this.transactionGridOptions.data = httpResponse.data;
                //if( this.transactionGridOptions.data.length <= this.HistoryPageSize )
                //{
                //    this.transactionGridOptions.enablePagination = false;
                //    this.transactionGridOptions.enablePaginationControls = false;
                //}
                const initialLoad = () => {
                    if (this.allFinancialTxns.length > 1) {
                        // Transactions come down newest first
                        this.filterEndDate = this.allFinancialTxns[0].transactionDate;
                        this.filterStartDate = this.allFinancialTxns[this.allFinancialTxns.length - 1].transactionDate;
                    }
                    this.onFilterDateRangeChange();
                };
                // Put this in a slight delay so the date range picker can exist
                this.$timeout(() => {
                    if (this.isUnitColVisible)
                        this.populateGridUnitLabels().then(initialLoad, initialLoad);
                    else
                        initialLoad();
                }, 100);
            }, () => {
                this.isLoading = false;
            });
        }
        exportTransactionsCsv() {
            var csvColumns = [
                {
                    headerText: "Date",
                    fieldName: "transactionDate",
                    dataMapper: function (value) {
                        if (!value)
                            return "";
                        return moment(value).format("YYYY-MM-DD");
                    }
                },
                {
                    headerText: "Description",
                    fieldName: "description"
                },
                {
                    headerText: "Category",
                    fieldName: "categoryDisplayName"
                },
                {
                    headerText: AppConfig.homeName,
                    fieldName: "unitGridLabel"
                },
                {
                    headerText: "Amount",
                    fieldName: "amount"
                }
            ];
            var csvDataString = Ally.createCsvString(this.transactionGridOptions.data, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Owner-Transactions.csv");
        }
        onFilterDateRangeChange() {
            if (!this.filterStartDate || !this.filterEndDate)
                return;
            // Wrap this in $timeout so it refreshes properly, from here: https://stackoverflow.com/a/17958847/10315651
            this.$timeout(() => {
                const txRows = this.allFinancialTxns.filter(t => t.transactionDate >= this.filterStartDate && t.transactionDate <= this.filterEndDate);
                this.transactionGridOptions.data = txRows;
                this.transactionGridOptions.virtualizationThreshold = txRows.length + 1;
                if (this.transactionGridOptions.data.length <= this.HistoryPageSize) {
                    this.transactionGridOptions.enablePagination = false;
                    this.transactionGridOptions.enablePaginationControls = false;
                }
            }, 10);
        }
    }
    ResidentTransactionsController.$inject = ["$http", "SiteInfo", "$timeout", "uiGridConstants", "$scope"];
    Ally.ResidentTransactionsController = ResidentTransactionsController;
    class OwnerTxInfo {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("residentTransactions", {
    templateUrl: "/ngApp/common/financial/resident-transactions.html",
    controller: Ally.ResidentTransactionsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    class LedgerController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, appCacheService, uiGridConstants, $rootScope, $timeout) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.uiGridConstants = uiGridConstants;
            this.$rootScope = $rootScope;
            this.$timeout = $timeout;
            this.isLoading = false;
            this.isLoadingEntries = false;
            this.shouldExpandPending = false;
            this.ledgerAccounts = [];
            this.accountsNeedingLogin = [];
            this.shouldShowAddTransaction = false;
            this.editAccount = null;
            this.editingTransaction = null;
            this.createAccountInfo = null;
            this.HistoryPageSize = 50;
            this.plaidHandler = null;
            this.newPlaidAccounts = [];
            this.hasPlaidAccounts = false;
            this.filter = new FilterCriteria();
            this.isPremiumPlanActive = false;
            this.ManageCategoriesDropId = -15;
            this.shouldShowCategoryEditModal = false;
            this.spendingChartData = null;
            this.spendingChartLabels = null;
            this.showDonut = true;
            this.isSuperAdmin = false;
            this.shouldShowImportModal = false;
            this.shouldShowOwnerFinanceTxn = false;
            this.hasActiveTxGridColFilter = false;
            this.uiGridCategoryDropDown = [];
            this.shouldShowFullCatPathInGrid = false;
            if (window.localStorage && window.localStorage[LedgerController.StoreKeyShouldShowFullCatPathInGrid])
                this.shouldShowFullCatPathInGrid = window.localStorage[LedgerController.StoreKeyShouldShowFullCatPathInGrid] === "true";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;
            this.homeName = AppConfig.homeName || "Unit";
            this.shouldShowOwnerFinanceTxn = this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn;
            // A callback to calculate the sum for a column across all ui-grid pages, not just the visible page
            const addAmountOverAllRows = () => {
                const allGridRows = this.ledgerGridApi.grid.rows;
                const visibleGridRows = allGridRows.filter(r => r.visible && r.entity && !isNaN(r.entity.amount));
                let sum = 0;
                visibleGridRows.forEach(item => sum += (item.entity.amount || 0));
                return sum;
            };
            this.ledgerGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false, enableColumnMenu: false },
                        {
                            field: 'accountName', filter: {
                                type: this.uiGridConstants.filter.SELECT,
                                selectOptions: []
                            },
                            displayName: 'Account',
                            enableCellEdit: false,
                            width: 140,
                            enableFiltering: true,
                            enableColumnMenu: false
                        },
                        { field: 'description', displayName: 'Description', enableCellEditOnFocus: true, enableFiltering: true, filter: { placeholder: "search" }, enableColumnMenu: false },
                        {
                            field: 'categoryDisplayName',
                            editModelField: "financialCategoryId",
                            displayName: 'Category',
                            width: 220,
                            editableCellTemplate: "ui-grid/dropdownEditor",
                            editDropdownOptionsArray: [],
                            enableFiltering: true,
                            enableColumnMenu: true,
                            menuItems: [
                                {
                                    title: 'Full Category Path',
                                    active: () => this.shouldShowFullCatPathInGrid,
                                    action: () => {
                                        this.shouldShowFullCatPathInGrid = !this.shouldShowFullCatPathInGrid;
                                        if (window.localStorage)
                                            window.localStorage[LedgerController.StoreKeyShouldShowFullCatPathInGrid] = this.shouldShowFullCatPathInGrid;
                                        this.refreshCategoryLabels();
                                    }
                                }
                            ]
                        },
                        { field: 'unitGridLabel', editModelField: "associatedUnitId", displayName: this.homeName, width: 120, editableCellTemplate: "ui-grid/dropdownEditor", editDropdownOptionsArray: [], enableFiltering: true, enableColumnMenu: false },
                        { field: 'amount', displayName: 'Amount', width: 140, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: addAmountOverAllRows, footerCellTemplate: '<div class="ui-grid-cell-contents">Total: {{col.getAggregationValue() | currency }}</div>', enableColumnMenu: false },
                        { field: 'id', displayName: 'Actions', enableSorting: false, enableCellEdit: false, enableFiltering: false, width: 90, cellTemplate: '<div class="ui-grid-cell-contents text-center"><img style="cursor: pointer;" data-ng-click="grid.appScope.$ctrl.editEntry( row.entity )" src="/assets/images/pencil-active.png" /><span class="close-x mt-0 mb-0 ml-3" data-ng-click="grid.appScope.$ctrl.deleteEntry( row.entity )" style="color: red; margin-left: 18px;">&times;</span></div>', enableColumnMenu: false }
                    ],
                    enableFiltering: true,
                    enableSorting: true,
                    showColumnFooter: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: true,
                    enablePaginationControls: true,
                    paginationPageSize: this.HistoryPageSize,
                    paginationPageSizes: [this.HistoryPageSize],
                    enableRowSelection: true,
                    enableSelectAll: true,
                    enableFullRowSelection: false,
                    enableRowHeaderSelection: true,
                    onRegisterApi: (gridApi) => {
                        this.ledgerGridApi = gridApi;
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                        gridApi.edit.on.afterCellEdit(this.$rootScope, (rowEntity, colDef, newValue, oldValue) => {
                            console.log('edited row amount:' + rowEntity.amount + ' Column', colDef, ' newValue:' + newValue + ' oldValue:' + oldValue);
                            // Ignore no changes
                            if (oldValue === newValue)
                                return;
                            // If the user selected the "Manage Categories" option
                            if (colDef.field === "categoryDisplayName" && rowEntity.financialCategoryId === this.ManageCategoriesDropId) {
                                rowEntity.financialCategoryId = oldValue;
                                this.shouldShowCategoryEditModal = true;
                                return;
                            }
                            rowEntity.categoryDisplayName = this.getCategoryDisplayLabel(rowEntity.financialCategoryId);
                            const unitEntry = this.unitListEntries.find(c => c.unitId === rowEntity.associatedUnitId);
                            rowEntity.unitGridLabel = unitEntry ? unitEntry.unitWithOwnerLast : null;
                            this.$http.put("/api/Ledger/UpdateEntry", rowEntity).then(() => this.regenerateDateDonutChart());
                            //vm.msg.lastCellEdited = 'edited row id:' + rowEntity.id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue;
                            //$scope.$apply();
                        });
                        gridApi.core.on.filterChanged(this.$rootScope, () => {
                            let hasFilter = false;
                            //let s = "";
                            for (let i = 0; i < gridApi.grid.columns.length; ++i) {
                                if (gridApi.grid.columns[i].filters && gridApi.grid.columns[i].filters.length > 0 && gridApi.grid.columns[i].filters[0].term) {
                                    hasFilter = true;
                                    break;
                                }
                                //    s += `|${gridApi.grid.columns[i].displayName}=${gridApi.grid.columns[i].filters[0].condition}`;
                            }
                            console.log("filterChanged", "hasFilter", hasFilter);
                            const needsFilterUpdate = this.hasActiveTxGridColFilter !== hasFilter;
                            this.hasActiveTxGridColFilter = hasFilter;
                            if (needsFilterUpdate)
                                this.updateLocalData();
                        });
                        const onSelectionChange = () => {
                            this.selectedEntries = _.clone(gridApi.selection.getSelectedRows());
                            let hasSplitTx = false;
                            for (const curRow of this.selectedEntries) {
                                if (curRow.isSplit) {
                                    gridApi.selection.unSelectRow(curRow);
                                    hasSplitTx = true;
                                }
                            }
                            this.selectedEntries = _.clone(gridApi.selection.getSelectedRows());
                            if (hasSplitTx)
                                alert("You cannot bulk recategorize split transactions. Split rows have been deslected.");
                        };
                        gridApi.selection.on.rowSelectionChanged(this.$rootScope, () => onSelectionChange());
                        gridApi.selection.on.rowSelectionChangedBatch(this.$rootScope, () => onSelectionChange());
                    }
                };
            this.pendingGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false },
                        {
                            field: 'accountName', filter: {
                                type: this.uiGridConstants.filter.SELECT,
                                selectOptions: []
                            }, displayName: 'Account', enableCellEdit: false, width: 140, enableFiltering: true
                        },
                        { field: 'description', displayName: 'Description', enableCellEditOnFocus: true, enableFiltering: true, filter: { placeholder: "search" } },
                        { field: 'amount', displayName: 'Amount', width: 140, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: this.uiGridConstants.aggregationTypes.sum, footerCellTemplate: '<div class="ui-grid-cell-contents" >Total: {{col.getAggregationValue() | currency }}</div>' }
                    ],
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: false,
                    enableRowHeaderSelection: false
                };
            this.previewImportGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false },
                        { field: 'description', displayName: 'Description', enableCellEditOnFocus: true, enableFiltering: true, filter: { placeholder: "search" } },
                        { field: 'categoryDisplayName', editModelField: "financialCategoryId", displayName: 'Category', width: 170, editableCellTemplate: "ui-grid/dropdownEditor", editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'unitGridLabel', editModelField: "associatedUnitId", displayName: this.homeName, width: 120, editableCellTemplate: "ui-grid/dropdownEditor", editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'amount', displayName: 'Amount', width: 140, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: this.uiGridConstants.aggregationTypes.sum, footerCellTemplate: '<div class="ui-grid-cell-contents" >Total: {{col.getAggregationValue() | currency }}</div>' },
                        { field: 'id', displayName: '', enableSorting: false, enableCellEdit: false, enableFiltering: false, width: 40, cellTemplate: '<div class="ui-grid-cell-contents text-center"><span class="close-x mt-0 mb-0 ml-3" data-ng-click="grid.appScope.$ctrl.removeImportRow( row.entity )" style="color: red;">&times;</span></div>' }
                    ],
                    enableSorting: true,
                    showColumnFooter: false,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false
                };
            const preselectStartMillis = parseInt(this.appCacheService.getAndClear("ledger_preselect_start"));
            if (!isNaN(preselectStartMillis)) {
                // Let the page finish loading then update the filter or else the date filter will overwrite our date
                window.setTimeout(() => {
                    this.filter.startDate = new Date(preselectStartMillis);
                    const preselectEndMillis = parseInt(this.appCacheService.getAndClear("ledger_preselect_end"));
                    this.filter.endDate = new Date(preselectEndMillis);
                    this.preselectCategoryId = parseInt(this.appCacheService.getAndClear("ledger_preselect_categoryId"));
                    if (isNaN(this.preselectCategoryId))
                        this.preselectCategoryId = undefined;
                    this.fullRefresh();
                }, 100);
            }
            else {
                this.filter.startDate = moment().subtract(30, 'days').toDate();
                this.filter.endDate = moment().toDate();
                this.fullRefresh();
            }
            this.$timeout(() => this.loadImportHistory(), 1500);
            this.$http.get("/api/Ledger/OwnerTxNote").then((httpResponse) => this.ownerFinanceTxNote = httpResponse.data.ownerFinanceTxNote, (httpResponse) => console.log("Failed to load owner tx note: " + httpResponse.data.exceptionMessage));
        }
        getCategoryDisplayLabel(financialCategoryId) {
            if (!financialCategoryId)
                return "";
            const catEntry = this.flatCategoryList.find(c => c.financialCategoryId === financialCategoryId);
            if (!catEntry)
                return "[N/A]";
            if (!this.shouldShowFullCatPathInGrid)
                return catEntry.displayName;
            let getFullPath;
            getFullPath = (curEntry, curPath) => {
                if (!curEntry.parentFinancialCategoryId)
                    return curPath;
                const parentEntry = this.flatCategoryList.find(c => c.financialCategoryId === curEntry.parentFinancialCategoryId);
                if (!parentEntry)
                    return curPath;
                return getFullPath(parentEntry, parentEntry.displayName + "/" + curPath);
            };
            return getFullPath(catEntry, catEntry.displayName);
        }
        /**
         * Load all of the data on the page
         */
        fullRefresh() {
            this.isLoading = true;
            let getUri = `/api/Ledger/PageInfo?startDate=${encodeURIComponent(this.filter.startDate.toISOString())}&endDate=${encodeURIComponent(this.filter.endDate.toISOString())}`;
            if (this.filter.description.length > 3)
                getUri += "&descriptionSearch=" + encodeURIComponent(this.filter.description);
            this.$http.get(getUri).then((httpResponse) => {
                this.isLoading = false;
                this.selectedEntries = [];
                const pageInfo = httpResponse.data;
                this.ledgerAccounts = pageInfo.accounts;
                _.forEach(this.ledgerAccounts, a => a.shouldShowInGrid = true);
                // Hide the account column if there's only one account
                const accountColumn = this.ledgerGridOptions.columnDefs.find(c => c.field === "accountName");
                if (accountColumn)
                    accountColumn.visible = this.ledgerAccounts.length > 1;
                // Add only the first account needing login for a Plaid item
                const accountsNeedingLogin = this.ledgerAccounts.filter(a => a.plaidNeedsRelogin);
                this.accountsNeedingLogin = [];
                for (let i = 0; i < accountsNeedingLogin.length; ++i) {
                    if (!this.accountsNeedingLogin.find(a => a.plaidItemId === accountsNeedingLogin[i].plaidItemId))
                        this.accountsNeedingLogin.push(accountsNeedingLogin[i]);
                }
                accountColumn.filter.selectOptions = this.ledgerAccounts.map(a => { return { value: a.accountName, label: a.accountName }; });
                this.hasPlaidAccounts = _.any(this.ledgerAccounts, a => a.syncType === 'plaid');
                this.allEntries = pageInfo.entries;
                this.pendingGridOptions.data = pageInfo.pendingEntries;
                this.flatCategoryList = [];
                const visitNode = (curNode, depth) => {
                    if (curNode.displayName) {
                        let labelPrefix = "";
                        if (depth > 1)
                            labelPrefix = Array((depth - 2) * 4).join(String.fromCharCode(160)) + "|--";
                        curNode.dropDownLabel = labelPrefix + curNode.displayName;
                        this.flatCategoryList.push(curNode);
                    }
                    if (curNode.childCategories == null || curNode.childCategories.length == 0)
                        return;
                    for (let i = 0; i < curNode.childCategories.length; ++i) {
                        visitNode(curNode.childCategories[i], depth + 1);
                    }
                };
                visitNode(pageInfo.rootFinancialCategory, 0);
                this.updateLocalData();
                this.uiGridCategoryDropDown = [];
                this.uiGridCategoryDropDown.push({ id: null, value: "" });
                for (let i = 0; i < this.flatCategoryList.length; ++i) {
                    this.uiGridCategoryDropDown.push({ id: this.flatCategoryList[i].financialCategoryId, value: this.flatCategoryList[i].dropDownLabel });
                }
                this.uiGridCategoryDropDown.push({ id: this.ManageCategoriesDropId, value: "Manage Categories..." });
                const categoryColumn = this.ledgerGridOptions.columnDefs.find(c => c.field === "categoryDisplayName");
                categoryColumn.editDropdownOptionsArray = this.uiGridCategoryDropDown;
                if (this.preselectCategoryId) {
                    window.setTimeout(() => {
                        const selectedCatEntry = this.flatCategoryList.filter(c => c.financialCategoryId === this.preselectCategoryId)[0];
                        this.preselectCategoryId = undefined;
                        const categoryColumn = this.ledgerGridApi.grid.columns.filter(c => c.displayName === "Category")[0];
                        categoryColumn.filters[0] = {
                            term: selectedCatEntry.displayName
                        };
                    }, 100);
                }
                this.unitListEntries = pageInfo.unitListEntries;
                // Populate the object used for quick editing the home
                const uiGridUnitDropDown = [];
                uiGridUnitDropDown.push({ id: null, value: "" });
                for (let i = 0; i < this.unitListEntries.length; ++i)
                    uiGridUnitDropDown.push({ id: this.unitListEntries[i].unitId, value: this.unitListEntries[i].unitWithOwnerLast });
                const unitColumn = this.ledgerGridOptions.columnDefs.find(c => c.field === "unitGridLabel");
                unitColumn.editDropdownOptionsArray = uiGridUnitDropDown;
                this.populateGridUnitLabels(this.allEntries);
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        }
        refreshCategoryLabels() {
            if (!this.allEntries || this.allEntries.length === 0)
                return;
            // Populate the unit names for the grid
            _.each(this.allEntries, (entry) => {
                if (entry.isSplit)
                    entry.categoryDisplayName = "(split)";
                else
                    entry.categoryDisplayName = this.getCategoryDisplayLabel(entry.financialCategoryId);
            });
        }
        /**
         * Populate the text that is shown for the unit column and split for category
         */
        populateGridUnitLabels(entries) {
            if (!entries || entries.length === 0)
                return;
            // Populate the unit names for the grid
            _.each(entries, (entry) => {
                if (entry.isSplit)
                    entry.categoryDisplayName = "(split)";
                else
                    entry.categoryDisplayName = this.getCategoryDisplayLabel(entry.financialCategoryId);
                if (entry.associatedUnitId) {
                    const unitListEntry = this.unitListEntries.find(u => u.unitId === entry.associatedUnitId);
                    if (unitListEntry)
                        entry.unitGridLabel = unitListEntry.unitWithOwnerLast;
                    else
                        entry.unitGridLabel = "UNK";
                }
                // Populate split entries
                if (entry.splitEntries && entry.splitEntries.length > 0)
                    this.populateGridUnitLabels(entry.splitEntries);
            });
        }
        refreshEntries() {
            this.isLoadingEntries = true;
            let getUri = `/api/Ledger/PageInfo?startDate=${encodeURIComponent(this.filter.startDate.toISOString())}&endDate=${encodeURIComponent(this.filter.endDate.toISOString())}`;
            if (this.filter.description.length > 3)
                getUri += "&descriptionSearch=" + encodeURIComponent(this.filter.description);
            this.$http.get(getUri).then((httpResponse) => {
                this.isLoadingEntries = false;
                this.allEntries = httpResponse.data.entries;
                this.updateLocalData();
                this.populateGridUnitLabels(this.allEntries);
            });
        }
        /**
         * Get the filtered rows by account and split entries into multiple rows
         */
        getLocalFilteredRows(shouldSplitRows) {
            const enabledAccountIds = this.ledgerAccounts.filter(a => a.shouldShowInGrid).map(a => a.ledgerAccountId);
            let filteredList = this.allEntries.filter(e => enabledAccountIds.indexOf(e.ledgerAccountId) > -1);
            // If the user is filtering on a column, we need to break out split transactions
            if (shouldSplitRows) {
                // Go through all transactions and for splits, remove the parent, and add the child splits to the main list
                const newFilteredList = [];
                for (let i = 0; i < filteredList.length; ++i) {
                    const isSplit = filteredList[i].isSplit && filteredList[i].splitEntries && filteredList[i].splitEntries.length > 0;
                    if (!isSplit) {
                        newFilteredList.push(filteredList[i]);
                        continue;
                    }
                    // Remove the parent entry
                    const parentEntry = filteredList[i];
                    for (let splitIndex = 0; splitIndex < parentEntry.splitEntries.length; ++splitIndex) {
                        // Clone the split so we can prefix the label with split
                        const curSplitCopy = _.clone(parentEntry.splitEntries[splitIndex]);
                        curSplitCopy.description = "[SPLIT] " + curSplitCopy.description;
                        curSplitCopy.accountName = parentEntry.accountName; // Account name doesn't get populated for split entries so copy it
                        newFilteredList.push(curSplitCopy);
                    }
                }
                filteredList = newFilteredList;
            }
            return filteredList;
        }
        updateLocalData() {
            const filteredList = this.getLocalFilteredRows(this.hasActiveTxGridColFilter);
            this.ledgerGridOptions.data = filteredList;
            this.ledgerGridOptions.enablePaginationControls = filteredList.length > this.HistoryPageSize;
            this.ledgerGridOptions.minRowsToShow = Math.min(filteredList.length, this.HistoryPageSize);
            this.ledgerGridOptions.virtualizationThreshold = this.ledgerGridOptions.minRowsToShow;
            this.regenerateDateDonutChart();
        }
        /**
         * Rebuild the data needed to populate the donut chart
         */
        regenerateDateDonutChart() {
            this.spendingChartData = null;
            if (this.allEntries.length === 0)
                return;
            const getParentCategoryId = (financialCategoryId) => {
                const cat = this.flatCategoryList.filter(c => c.financialCategoryId === financialCategoryId);
                if (cat && cat.length > 0) {
                    if (!cat[0].parentFinancialCategoryId)
                        return cat[0].financialCategoryId;
                    return getParentCategoryId(cat[0].parentFinancialCategoryId);
                }
                return 0;
            };
            const flattenedTransactions = [];
            for (let i = 0; i < this.allEntries.length; ++i) {
                if (this.allEntries[i].isSplit) {
                    for (const e of this.allEntries[i].splitEntries)
                        flattenedTransactions.push(e);
                }
                else
                    flattenedTransactions.push(this.allEntries[i]);
            }
            const entriesByParentCat = _.groupBy(flattenedTransactions, e => getParentCategoryId(e.financialCategoryId));
            let spendingChartEntries = [];
            // Go through all the parent categories and sum the transactions under them
            const parentCatIds = _.keys(entriesByParentCat);
            for (let i = 0; i < parentCatIds.length; ++i) {
                const parentCategoryId = +parentCatIds[i];
                const entries = entriesByParentCat[parentCategoryId];
                const cats = this.flatCategoryList.filter(c => c.financialCategoryId === +parentCategoryId);
                let parentCategory = null;
                if (cats && cats.length > 0)
                    parentCategory = cats[0];
                let sumTotal = 0;
                for (let entryIndex = 0; entryIndex < entries.length; ++entryIndex)
                    sumTotal += entries[entryIndex].amount;
                const newEntry = {
                    parentCategoryId,
                    parentCategoryDisplayName: parentCategory ? parentCategory.displayName : "Uncategorized",
                    sumTotal: Math.abs(sumTotal),
                    numLedgerEntries: entries.length
                };
                spendingChartEntries.push(newEntry);
            }
            spendingChartEntries = _.sortBy(spendingChartEntries, e => e.sumTotal).reverse();
            this.spendingChartData = [];
            this.spendingChartLabels = [];
            for (let i = 0; i < spendingChartEntries.length; ++i) {
                this.spendingChartData.push(spendingChartEntries[i].sumTotal);
                this.spendingChartLabels.push(spendingChartEntries[i].parentCategoryDisplayName);
            }
            // Force redraw
            this.showDonut = false;
            this.$timeout(() => this.showDonut = true, 100);
        }
        /**
         * Occurs when the user clicks the button to add a new transaction
         */
        onAddTransaction() {
            if (this.ledgerAccounts.length === 0) {
                alert("Please add at least one account first");
                return;
            }
            this.editingTransaction = new LedgerEntry();
            this.editingTransaction.ledgerAccountId = this.ledgerAccounts[0].ledgerAccountId;
            this.editingTransaction.transactionDate = new Date();
            window.setTimeout(() => document.getElementById("transaction-amount-input").focus(), 50);
        }
        completePlaidSync(accessToken, updatePlaidItemId, selectedAccountIds) {
            this.isLoading = true;
            this.plaidSuccessProgressMsg = "Contacting Plaid server for selected account information";
            const postData = {
                accessToken,
                updatePlaidItemId,
                selectedAccountIds
            };
            const postUri = updatePlaidItemId ? "/api/Plaid/UpdateAccessToken" : "/api/Plaid/ProcessNewAccessToken";
            this.$http.post(postUri, postData).then((httpResponse) => {
                this.isLoading = false;
                this.plaidSuccessProgressMsg = "Account information successfully retrieved";
                this.newPlaidAccounts = httpResponse.data;
                if (updatePlaidItemId)
                    window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                this.plaidSuccessProgressMsg = "Failed to retrieve account information from Plaid: " + httpResponse.data.exceptionMessage;
                alert("Failed to link: " + httpResponse.data.exceptionMessage);
            });
        }
        showAddAccount() {
            this.createAccountInfo = new CreateAccountInfo();
            this.createAccountInfo.type = null; // Explicitly set to simplify UI logic
        }
        updateAccountLink(ledgerAccount) {
            //this.createAccountInfo = new CreateAccountInfo();
            //this.createAccountInfo.type = null; // Explicitly set to simplify UI logic
            if (!this.isPremiumPlanActive) {
                alert("We cannot refresh your bank account connection while on our free plan. Sorry for the inconvenience.");
                return;
            }
            this.isLoading = true;
            this.$http.get("/api/Plaid/UpdateLinkToken/" + ledgerAccount.plaidItemId).then((httpResponse) => {
                this.isLoading = false;
                const newLinkToken = httpResponse.data;
                if (!newLinkToken) {
                    alert("Something went wrong on the server. Please contact support.");
                    return;
                }
                const plaidConfig = {
                    token: newLinkToken,
                    onSuccess: (public_token) => {
                        console.log("Plaid update onSuccess");
                        this.completePlaidSync(public_token, ledgerAccount.plaidItemId, null);
                    },
                    onLoad: () => { },
                    onExit: (err, metadata) => { console.log("onExit.err", err, metadata); },
                    onEvent: (eventName, metadata) => { console.log("onEvent.eventName", eventName, metadata); },
                    receivedRedirectUri: null,
                };
                this.plaidHandler = Plaid.create(plaidConfig);
                this.plaidHandler.open();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to update account link: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user wants to edit a transaction
         */
        editEntry(entry) {
            if (entry.parentLedgerEntryId) {
                const parentEntry = this.allEntries.find(e => e.ledgerEntryId === entry.parentLedgerEntryId);
                this.editingTransaction = _.clone(parentEntry);
            }
            else
                this.editingTransaction = _.clone(entry);
            if (this.editingTransaction.isSplit)
                this.onSplitAmountChange();
        }
        /**
         * Occurs when the user wants to delete a transaction
         */
        deleteEntry(entry) {
            if (!confirm("Are you sure you want to delete this entry? Deletion is permanent."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Ledger/DeleteEntry/" + entry.ledgerEntryId).then(() => {
                this.isLoading = false;
                this.editAccount = null;
                this.editingTransaction = null;
                this.fullRefresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user clicks the button to save transaction details
         */
        onSaveEntry() {
            if (!this.editingTransaction.isSplit) {
                if (!this.editingTransaction.description) {
                    alert("Description is required");
                    return;
                }
                if (!this.editingTransaction.amount) {
                    alert("Non-zero amount is required");
                    return;
                }
            }
            else {
                for (let i = 0; i < this.editingTransaction.splitEntries.length; ++i) {
                    if (!this.editingTransaction.splitEntries[i].amount) {
                        alert("A non-zero amount is required for all split transaction entries");
                        return;
                    }
                }
            }
            this.isLoading = true;
            const onSave = () => {
                this.isLoading = false;
                this.editingTransaction = null;
                this.refreshEntries();
            };
            const onError = (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            };
            if (this.editingTransaction.ledgerEntryId)
                this.$http.put("/api/Ledger/UpdateEntry", this.editingTransaction).then(onSave, onError);
            else
                this.$http.post("/api/Ledger/NewManualEntry", this.editingTransaction).then(onSave, onError);
        }
        /**
         * Occurs when the user clicks the button to add a new account
         */
        onSaveNewAccount() {
            this.isLoading = true;
            const onSave = () => {
                this.isLoading = false;
                this.createAccountInfo = null;
                this.fullRefresh();
            };
            const onError = (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            };
            this.$http.post("/api/Ledger/NewBankAccount", this.createAccountInfo).then(onSave, onError);
        }
        startPlaidFlow() {
            if (this.createAccountInfo)
                this.createAccountInfo.type = 'plaid';
            if (!this.isPremiumPlanActive)
                return;
            this.isLoading = true;
            this.$http.get("/api/Plaid/NewLinkToken").then((httpResponse) => {
                this.isLoading = false;
                if (!httpResponse.data)
                    return;
                const plaidConfig = {
                    token: httpResponse.data,
                    onSuccess: (public_token, metadata) => {
                        console.log("Plaid onSuccess", metadata);
                        let selectedAccountIds = null;
                        if (metadata && metadata.accounts && metadata.accounts.length > 0)
                            selectedAccountIds = metadata.accounts.map((a) => a.id);
                        this.completePlaidSync(public_token, null, selectedAccountIds);
                    },
                    onLoad: () => { },
                    onExit: (err, metadata) => { console.log("update onExit.err", err, metadata); },
                    onEvent: (eventName, metadata) => { console.log("update onEvent.eventName", eventName, metadata); },
                    receivedRedirectUri: null,
                };
                this.plaidHandler = Plaid.create(plaidConfig);
                this.plaidHandler.open();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to start Plaid sign-up: " + httpResponse.data.exceptionMessage);
                this.closeAccountAndReload();
            });
        }
        openEditAccountModal(account) {
            this.editAccount = _.clone(account);
        }
        closeAccountAndReload() {
            this.createAccountInfo = null;
            this.fullRefresh();
        }
        onEditAccount() {
            const putUri = `/api/Ledger/UpdateAccount/${this.editAccount.ledgerAccountId}?newName=${encodeURIComponent(this.editAccount.accountName)}&newType=${encodeURIComponent(this.editAccount.accountType)}`;
            this.isLoading = true;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
                this.editAccount = null;
                this.fullRefresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to update: " + httpResponse.data.exceptionMessage);
            });
        }
        syncPlaidAccounts(shouldSyncRecent) {
            this.isLoading = true;
            const getUri = shouldSyncRecent ? "/api/Plaid/SyncRecentTransactions" : "/api/Plaid/SyncTwoYearTransactions";
            this.$http.get(getUri).then(() => {
                this.isLoading = false;
                this.refreshEntries();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to sync: " + httpResponse.data.exceptionMessage);
                if (httpResponse.data.exceptionMessage && httpResponse.data.exceptionMessage.indexOf("login credentials") > -1)
                    window.location.reload();
            });
        }
        onFilterDescriptionChange() {
            if (this.filter.description.length > 2 || this.filter.description.length == 0)
                this.refreshEntries();
        }
        onEditTransactionCategoryChange() {
            // Not used
        }
        onCategoryManagerClosed(didMakeChanges) {
            this.shouldShowCategoryEditModal = false;
            if (didMakeChanges)
                this.fullRefresh();
        }
        deleteAccount() {
            if (!confirm("Are you sure you want to remove this account?"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Ledger/DeleteAccount/" + this.editAccount.ledgerAccountId).then(() => {
                this.isLoading = false;
                this.editAccount = null;
                this.fullRefresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        }
        splitTransaction() {
            if (!this.editingTransaction.splitEntries)
                this.editingTransaction.splitEntries = [];
            this.editingTransaction.splitEntries.push(new LedgerEntry());
            this.editingTransaction.isSplit = true;
        }
        onSplitAmountChange() {
            this.splitAmountTotal = this.editingTransaction.splitEntries.reduce((sum, e) => sum + e.amount, 0);
            const roundedSplit = Math.round(this.splitAmountTotal * 100);
            const roundedTotal = Math.round(this.editingTransaction.amount * 100);
            this.isSplitAmountEqual = roundedSplit === roundedTotal;
        }
        removeSplit(splitEntry) {
            this.editingTransaction.splitEntries.splice(this.editingTransaction.splitEntries.indexOf(splitEntry), 1);
            this.onSplitAmountChange();
        }
        openImportFilePicker() {
            document.getElementById('importTransactionFileInput').click();
        }
        openImportModal() {
            this.shouldShowImportModal = true;
            this.previewImportGridOptions.data = null;
        }
        onImportFileSelected(event) {
            const importTransactionsFile = event.target.files[0];
            if (!importTransactionsFile)
                return;
            this.isLoading = true;
            this.importTxNotes = "";
            const formData = new FormData();
            formData.append("importFile", importTransactionsFile);
            const postHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            const fileElem = document.getElementById("importTransactionFileInput");
            this.$http.post("/api/Ledger/PreviewImport", formData, postHeaders).then((httpResponse) => {
                this.isLoading = false;
                // Clear the value so the user can re-select the same file and trigger this handler
                fileElem.value = "";
                this.previewImportGridOptions.data = httpResponse.data;
                for (let i = 0; i < this.previewImportGridOptions.data.length; ++i) {
                    const curEntry = this.previewImportGridOptions.data[i];
                    curEntry.ledgerEntryId = i;
                    const unit = this.unitListEntries.find(u => u.unitId === curEntry.associatedUnitId);
                    if (unit)
                        curEntry.unitGridLabel = unit.unitWithOwnerLast;
                    const catEntry = this.flatCategoryList.find(c => c.financialCategoryId === curEntry.financialCategoryId);
                    curEntry.categoryDisplayName = catEntry ? catEntry.displayName : null;
                }
                this.previewImportGridOptions.minRowsToShow = httpResponse.data.length;
                this.previewImportGridOptions.virtualizationThreshold = this.previewImportGridOptions.minRowsToShow;
            }, (httpResponse) => {
                this.isLoading = false;
                // Clear the value so the user can re-select the same file and trigger this handler
                fileElem.value = "";
                alert("Failed to upload document: " + httpResponse.data.exceptionMessage);
            });
        }
        selectManualAccount() {
            this.createAccountInfo.type = "manual";
            setTimeout(() => document.getElementById("new-account-name-field").focus(), 100);
        }
        /** Bulk import transactions */
        importPreviewTransactions() {
            if (!this.bulkImportAccountId) {
                alert("Please select the account into which these transactions will be imported using the drop-down above the grid.");
                return;
            }
            this.isLoading = true;
            const entries = this.previewImportGridOptions.data;
            for (let i = 0; i < entries.length; ++i)
                entries[i].ledgerAccountId = this.bulkImportAccountId;
            const postTx = {
                notes: this.importTxNotes,
                entries: this.previewImportGridOptions.data
            };
            this.$http.post("/api/Ledger/BulkImport", postTx).then(() => {
                this.previewImportGridOptions.data = null;
                this.shouldShowImportModal = false;
                this.isLoading = false;
                this.refreshEntries();
                this.$timeout(() => this.loadImportHistory(), 1000);
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to import: " + httpResponse.data.exceptionMessage);
            });
        }
        removeImportRow(entry) {
            // For import rows, the row index is stored in ledgerEntryId
            const importEntries = this.previewImportGridOptions.data;
            importEntries.splice(entry.ledgerEntryId, 1);
            for (let i = 0; i < importEntries.length; ++i)
                importEntries[i].ledgerEntryId = i;
        }
        /** Export the transactions list as a CSV */
        exportTransactionsCsv() {
            const csvColumns = [
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
                },
                {
                    headerText: "Account",
                    fieldName: "accountName"
                }
            ];
            const splitRows = this.getLocalFilteredRows(true);
            const csvDataString = Ally.createCsvString(splitRows, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Transactions.csv");
        }
        /** Occurs when the user changes the setting to share transactions with owners */
        onShowOwnerTxnsChange() {
            this.isLoading = true;
            const putUri = "/api/Ledger/SetOwnerTxnViewing?shouldAllow=" + this.shouldShowOwnerFinanceTxn;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
                this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn = this.shouldShowOwnerFinanceTxn;
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to change setting: " + httpResponse.data.exceptionMessage);
            });
        }
        /** Retrieve the financial transaction import history */
        loadImportHistory() {
            this.$http.get("/api/Ledger/TxImportHistory").then((httpResponse) => {
                this.importHistoryEntries = httpResponse.data;
            }, (httpResponse) => {
                console.log("Failed to retrieve tx history: " + httpResponse.data.exceptionMessage);
            });
        }
        saveOwnerTxNote() {
            const putData = {
                ownerFinanceTxNote: this.ownerFinanceTxNote
            };
            this.isLoading = true;
            this.$http.put("/api/Ledger/OwnerTxNote", putData).then(() => {
                this.isLoading = false;
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save note: " + httpResponse.data.exceptionMessage);
            });
        }
        bulkRecategorize() {
            if (this.selectedEntries.length === 0)
                return;
            const putInfo = {
                entryIds: this.selectedEntries.map(e => e.ledgerEntryId),
                financialCategoryId: this.bulkRecategorizeCategoryId
            };
            //console.log( `Setting ${putInfo.entryIds.join( ',' )} to category ${this.bulkRecategorizeCategoryId}` );
            this.isLoading = true;
            this.$http.put("/api/Ledger/BulkRecategorize", putInfo).then(() => {
                this.isLoading = false;
                this.fullRefresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to update: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Disconnect the group's ledger accounts from Plaid. This would usually be done to free
         * groups that lose the premium perk of bank account syncing, which costs us money.
         */
        disconnectFromPlaid() {
            const hasPlaidAccts = this.ledgerAccounts.some(a => !!a.plaidItemId);
            if (!hasPlaidAccts) {
                alert("This group has no Plaid-synced accounts");
                return;
            }
            if (!confirm("Are you sure? The group could be pissed!"))
                return;
            if (this.siteInfo.privateSiteInfo.isPremiumPlanActive) {
                if (!confirm("HOLD UP! This group is on the premium plan, you should leave their Plaid accounts alone! Are you sure you want to continue."))
                    return;
            }
            this.isLoading = true;
            this.$http.put("/api/Ledger/DisconnectPlaidForGroup", null).then(() => {
                this.isLoading = false;
                alert("Accounts successfully disconnected");
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to disconnect: " + httpResponse.data.exceptionMessage);
            });
        }
    }
    LedgerController.$inject = ["$http", "SiteInfo", "appCacheService", "uiGridConstants", "$rootScope", "$timeout"];
    LedgerController.StoreKeyShouldShowFullCatPathInGrid = "LedgerShouldShowFullCatPathInGrid";
    Ally.LedgerController = LedgerController;
    class BulkRecategorizeInfo {
    }
    class CategoryDropDownOption {
    }
    class UiGridRow {
    }
    Ally.UiGridRow = UiGridRow;
    class CreateAccountInfo {
    }
    class SpendingChartEntry {
    }
    class LedgerAccount {
    }
    class LedgerEntry {
    }
    Ally.LedgerEntry = LedgerEntry;
    class LedgerPageInfo {
    }
    class BasicUnitListEntry {
    }
    class FilterCriteria {
        constructor() {
            this.description = "";
            this.startDate = new Date();
            this.endDate = new Date();
            this.category = "";
        }
    }
    class FinancialCategory {
    }
    Ally.FinancialCategory = FinancialCategory;
    class FinancialTxImportHistoryEntry {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("ledger", {
    templateUrl: "/ngApp/chtn/manager/financial/ledger.html",
    controller: Ally.LedgerController
});

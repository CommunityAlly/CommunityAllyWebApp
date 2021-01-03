var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    var BudgetToolController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function BudgetToolController($http, appCacheService, uiGridConstants, $rootScope) {
            this.$http = $http;
            this.appCacheService = appCacheService;
            this.uiGridConstants = uiGridConstants;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.financialCategoryMap = new Map();
            this.totalExpense = 0;
            this.totalIncome = 0;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        BudgetToolController.prototype.$onInit = function () {
            var _this = this;
            var amtTemplate = "<div class='ui-grid-cell-contents'><span data-ng-if='row.entity.hasChildren'>{{row.entity.amount | currency}}</span><span data-ng-if='!row.entity.hasChildren'>$<input type='number' style='width: 85%;' data-ng-model='row.entity.amount' data-ng-change='grid.appScope.$ctrl.onAmountChange(row.entity)' /></span></div>";
            this.expenseGridOptions =
                {
                    columnDefs: [
                        { field: 'categoryTreeLabel', displayName: "Category", width: "*" },
                        { field: 'amount', displayName: 'Amount', width: 120, type: 'number', cellFilter: "currency", cellTemplate: amtTemplate }
                    ],
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enableRowHeaderSelection: false,
                    showTreeExpandNoChildren: false,
                    treeIndent: 20,
                    enableSorting: false,
                    enableTreeView: true,
                    showTreeRowHeader: true,
                    onRegisterApi: function (gridApi) {
                        _this.expenseGridApi = gridApi;
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                        _this.expenseGridApi.treeBase.on.rowExpanded(_this.$rootScope, function (row) {
                            // console.log( "here", row );
                        });
                    }
                };
            this.incomeGridOptions = _.clone(this.expenseGridOptions);
            this.incomeGridOptions.onRegisterApi = function (gridApi) {
                _this.incomeGridApi = gridApi;
                // Fix dumb scrolling
                HtmlUtil.uiGridFixScroll();
            };
            this.refreshData();
        };
        /**
        * Retrieve the group budgets from the server
        */
        BudgetToolController.prototype.refreshData = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Budget/PageData").then(function (httpResponse) {
                _this.isLoading = false;
                _this.budgets = httpResponse.data.budgets;
                _this.rootFinancialCategory = httpResponse.data.rootFinancialCategory;
                _this.financialCategoryMap.clear();
                var visitNode = function (node) {
                    _this.financialCategoryMap.set(node.financialCategoryId, node);
                    if (node.childCategories) {
                        for (var i = 0; i < node.childCategories.length; ++i)
                            visitNode(node.childCategories[i]);
                    }
                };
                visitNode(_this.rootFinancialCategory);
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        BudgetToolController.prototype.onAmountChange = function (row) {
            if (row) {
                var curParent = row.parentRow;
                while (curParent) {
                    curParent.amount = _.reduce(curParent.childRows, function (memo, row) { return memo + row.amount; }, 0);
                    curParent = curParent.parentRow;
                }
            }
            var incomeParentRow = _.find(this.curBudget.budgetRows, function (r) { return !r.parentRow && r.category.displayName === "Income"; });
            this.totalIncome = incomeParentRow.amount;
            var expenseParentRows = this.curBudget.budgetRows.filter(function (r) { return !r.parentRow && r.category.displayName !== "Income"; });
            this.totalExpense = _.reduce(expenseParentRows, function (memo, r) { return memo + r.amount; }, 0);
        };
        BudgetToolController.prototype.createBudget = function () {
            var _this = this;
            this.curBudget = new BudgetLocalEdit();
            this.curBudget.budgetName = "Unnamed";
            this.curBudget.budgetRows = [];
            var visitNode = function (curNode, depth, isIncomeRow) {
                var hasChildren = curNode.childCategories != null && curNode.childCategories.length > 0;
                isIncomeRow = (depth === 0 && curNode.displayName === "Income") || isIncomeRow;
                if (curNode.displayName) {
                    var offsetDepth = isIncomeRow ? depth - 1 : depth;
                    var labelPrefix = BudgetToolController.catToTreePrefix(offsetDepth);
                    var parentRow = _.find(_this.curBudget.budgetRows, function (r) { return r.category.financialCategoryId === curNode.parentFinancialCategoryId; });
                    var newRow = {
                        financialCategoryId: curNode.financialCategoryId,
                        categoryDisplayName: curNode.displayName,
                        categoryTreeLabel: labelPrefix + curNode.displayName,
                        amount: 0,
                        $$treeLevel: offsetDepth,
                        hasChildren: hasChildren,
                        category: curNode,
                        parentRow: parentRow,
                        childRows: [],
                        isIncomeRow: isIncomeRow
                    };
                    if (parentRow)
                        newRow.parentRow.childRows.push(newRow);
                    _this.curBudget.budgetRows.push(newRow);
                }
                if (!hasChildren)
                    return;
                for (var i = 0; i < curNode.childCategories.length; ++i) {
                    visitNode(curNode.childCategories[i], depth + 1, isIncomeRow);
                }
            };
            visitNode(this.rootFinancialCategory, -1, false); // Start at negative so the root's children have a level of 0
            this.refreshGridsFromCurBudget();
        };
        BudgetToolController.catToTreePrefix = function (treeDepth) {
            if (treeDepth < 1)
                return "";
            var labelPrefix = Array((treeDepth - 1) * 4).join(String.fromCharCode(160)) + "|--";
            return labelPrefix;
        };
        BudgetToolController.prototype.loadBudget = function (budget) {
            var _this = this;
            var getCatDepth = function (category, depth) {
                if (depth === void 0) { depth = 0; }
                if (!category)
                    return depth;
                if (category.parentFinancialCategoryId && _this.financialCategoryMap.has(category.parentFinancialCategoryId))
                    return getCatDepth(_this.financialCategoryMap.get(category.parentFinancialCategoryId), depth + 1);
                return depth;
            };
            var editRows;
            editRows = budget.rows.map(function (r) {
                var cat = _this.financialCategoryMap.has(r.financialCategoryId) ? _this.financialCategoryMap.get(r.financialCategoryId) : undefined;
                var treeDepth = getCatDepth(cat);
                var offsetDepth = treeDepth; //isIncomeRow ? depth - 1 : depth;
                var labelPrefix = BudgetToolController.catToTreePrefix(offsetDepth);
                var editRow = {
                    amount: r.amount,
                    categoryDisplayName: r.categoryDisplayName,
                    financialCategoryId: r.financialCategoryId,
                    budgetId: r.budgetId,
                    budgetRowId: r.budgetRowId,
                    $$treeLevel: treeDepth,
                    category: cat,
                    childRows: [],
                    categoryTreeLabel: labelPrefix + (cat ? cat.displayName : r.categoryDisplayName),
                    hasChildren: false,
                    isIncomeRow: false,
                    parentRow: null
                };
                return editRow;
            });
            var _loop_1 = function (i) {
                var curCat = editRows[i].category;
                if (curCat) {
                    editRows[i].hasChildren = curCat.childCategories && curCat.childCategories.length > 0;
                    if (editRows[i].hasChildren) {
                        var childCatIds_1 = _.map(curCat.childCategories, function (c) { return c.financialCategoryId; });
                        editRows[i].childRows = editRows.filter(function (r) { return childCatIds_1.indexOf(r.financialCategoryId) >= 0; });
                    }
                    if (curCat.parentFinancialCategoryId)
                        editRows[i].parentRow = _.find(editRows, function (r) { return r.financialCategoryId === curCat.parentFinancialCategoryId; });
                }
            };
            // Fill in children and set the parent
            for (var i = 0; i < editRows.length; ++i) {
                _loop_1(i);
            }
            var incomeCategory = this.rootFinancialCategory.childCategories.find(function (c) { return c.displayName === "Income"; });
            var incomeRoot = editRows.find(function (r) { return r.financialCategoryId === incomeCategory.financialCategoryId; });
            var markIncome = function (row) {
                row.isIncomeRow = true;
                --row.$$treeLevel; // We don't show the top level
                row.categoryTreeLabel = BudgetToolController.catToTreePrefix(row.$$treeLevel) + row.categoryDisplayName;
                if (row.childRows)
                    row.childRows.forEach(function (r) { return markIncome(r); });
            };
            markIncome(incomeRoot);
            this.curBudget = {
                budgetId: budget.budgetId,
                budgetName: budget.budgetName,
                budgetRows: editRows
            };
            this.refreshGridsFromCurBudget();
        };
        BudgetToolController.prototype.refreshGridsFromCurBudget = function () {
            var _this = this;
            var incomeRows = this.curBudget.budgetRows.filter(function (r) { return r.$$treeLevel >= 0 && r.isIncomeRow; });
            this.incomeGridOptions.data = incomeRows;
            this.incomeGridOptions.minRowsToShow = incomeRows.length;
            this.incomeGridOptions.virtualizationThreshold = incomeRows.length;
            var expenseRows = this.curBudget.budgetRows.filter(function (r) { return !r.isIncomeRow; });
            this.expenseGridOptions.data = expenseRows;
            this.expenseGridOptions.minRowsToShow = expenseRows.length;
            this.expenseGridOptions.virtualizationThreshold = expenseRows.length;
            window.setTimeout(function () {
                _this.expenseGridApi.treeBase.expandAllRows();
                _this.incomeGridApi.treeBase.expandAllRows();
            }, 50);
            this.onAmountChange(null);
        };
        BudgetToolController.prototype.closeBudget = function () {
            this.curBudget = null;
            this.selectedBudget = null;
            this.incomeGridOptions.data = [];
            this.expenseGridOptions.data = [];
        };
        BudgetToolController.prototype.saveBudget = function () {
            if (this.curBudget.budgetId)
                this.saveExistingBudget();
            else
                this.saveNewBudget();
        };
        BudgetToolController.prototype.saveExistingBudget = function () {
            var _this = this;
            this.isLoading = true;
            // Create a slimmed down version
            var putData = {
                budgetId: this.curBudget.budgetId,
                budgetName: this.curBudget.budgetName,
                rows: _.map(this.curBudget.budgetRows, function (r) {
                    return {
                        budgetRowId: r.budgetRowId,
                        amount: r.amount,
                        financialCategoryId: r.financialCategoryId
                    };
                })
            };
            this.$http.put("/api/Budget", putData).then(function (httpResponse) {
                _this.isLoading = false;
                _this.completeRefresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        BudgetToolController.prototype.saveNewBudget = function () {
            var _this = this;
            this.isLoading = true;
            // Create a slimmed down version
            var postData = {
                budgetId: 0,
                budgetName: this.curBudget.budgetName,
                rows: _.map(this.curBudget.budgetRows, function (r) {
                    return {
                        budgetRowId: 0,
                        amount: r.amount,
                        financialCategoryId: r.financialCategoryId
                    };
                })
            };
            this.$http.post("/api/Budget", postData).then(function (httpResponse) {
                _this.isLoading = false;
                _this.completeRefresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user selects a budget to view
         */
        BudgetToolController.prototype.onBudgetSelected = function () {
            if (!this.selectedBudget)
                return;
            this.loadBudget(this.selectedBudget);
        };
        /**
         * Occurs when the user presses the button to delete a budget
         */
        BudgetToolController.prototype.deleteBudget = function () {
            var _this = this;
            if (!confirm("Are you sure you want to deleted this budget?"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Budget/" + this.curBudget.budgetId).then(function (httpResponse) {
                _this.isLoading = false;
                _this.completeRefresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to delete, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        BudgetToolController.prototype.completeRefresh = function () {
            this.curBudget = null;
            this.selectedBudget = null;
            this.incomeGridOptions.data = [];
            this.expenseGridOptions.data = [];
            this.refreshData();
        };
        BudgetToolController.$inject = ["$http", "appCacheService", "uiGridConstants", "$rootScope"];
        return BudgetToolController;
    }());
    Ally.BudgetToolController = BudgetToolController;
    var SaveBudgetRow = /** @class */ (function () {
        function SaveBudgetRow() {
        }
        return SaveBudgetRow;
    }());
    var SaveBudget = /** @class */ (function () {
        function SaveBudget() {
        }
        return SaveBudget;
    }());
    var BudgetPageInfo = /** @class */ (function () {
        function BudgetPageInfo() {
        }
        return BudgetPageInfo;
    }());
    var BudgetDto = /** @class */ (function () {
        function BudgetDto() {
        }
        return BudgetDto;
    }());
    var BudgetLocalEdit = /** @class */ (function () {
        function BudgetLocalEdit() {
        }
        return BudgetLocalEdit;
    }());
    var BudgetRowDto = /** @class */ (function () {
        function BudgetRowDto() {
        }
        return BudgetRowDto;
    }());
    var BudgetRowLocalEdit = /** @class */ (function (_super) {
        __extends(BudgetRowLocalEdit, _super);
        function BudgetRowLocalEdit() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return BudgetRowLocalEdit;
    }(BudgetRowDto));
})(Ally || (Ally = {}));
CA.angularApp.component("budgetTool", {
    bindings: {},
    templateUrl: "/ngApp/chtn/manager/financial/budget-tool.html",
    controller: Ally.BudgetToolController
});

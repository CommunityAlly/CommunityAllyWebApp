var Ally;
(function (Ally) {
    /**
     * The controller for the component to manage financial categories
     */
    var FinancialCategoryManagerController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function FinancialCategoryManagerController($http, siteInfo, appCacheService, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.selectedCategory = null;
            this.newCategoryParent = null;
            this.deleteCategoryRessignTo = null;
            this.shouldShowNewCategoryArea = false;
            this.shouldShowDeleteCategoryArea = false;
            this.didMakeChanges = false;
            this.preselectById = null;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        FinancialCategoryManagerController.prototype.$onInit = function () {
            this.refresh();
        };
        /**
         * Load all of the data on the page
         */
        FinancialCategoryManagerController.prototype.refresh = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Ledger/FinancialCategories").then(function (httpResponse) {
                _this.isLoading = false;
                _this.rootFinancialCategory = httpResponse.data;
                _this.flatCategoryList = [];
                var visitNode = function (curNode, depth) {
                    if (curNode.displayName) {
                        var labelPrefix = "";
                        if (depth > 1)
                            labelPrefix = Array((depth - 2) * 4).join(String.fromCharCode(160)) + "|--";
                        curNode.dropDownLabel = labelPrefix + curNode.displayName;
                        _this.flatCategoryList.push(curNode);
                    }
                    if (curNode.childCategories == null || curNode.childCategories.length == 0)
                        return;
                    for (var i = 0; i < curNode.childCategories.length; ++i) {
                        visitNode(curNode.childCategories[i], depth + 1);
                    }
                };
                visitNode(_this.rootFinancialCategory, 0);
                _this.selectedCategory = _this.flatCategoryList[0];
                if (_this.preselectById) {
                    var preselectCat = _this.flatCategoryList.filter(function (c) { return c.financialCategoryId === _this.preselectById; });
                    if (preselectCat && preselectCat.length > 0)
                        _this.selectedCategory = preselectCat[0];
                    _this.preselectById = null;
                }
                _this.onCategorySelected();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
        * Occurs when a category is selected from the list
        */
        FinancialCategoryManagerController.prototype.onCategorySelected = function () {
            this.editName = this.selectedCategory ? this.selectedCategory.displayName : "";
        };
        /**
        * Called when the user wants to close the manager
        */
        FinancialCategoryManagerController.prototype.closeManager = function () {
            this.onClosed({ didMakeChanges: this.didMakeChanges });
        };
        /**
        * Display the section to add a new category
        */
        FinancialCategoryManagerController.prototype.showNewCategoryArea = function () {
            this.shouldShowNewCategoryArea = true;
            this.shouldShowDeleteCategoryArea = false;
            this.newName = "";
            this.newCategoryParent = null;
        };
        /**
        * Update a category name
        */
        FinancialCategoryManagerController.prototype.updateCategoryName = function () {
            var _this = this;
            if (!this.editName) {
                alert("Please enter a name");
                return;
            }
            this.isLoading = true;
            var putUri = "/api/Ledger/FinancialCategory/UpdateName/" + this.selectedCategory.financialCategoryId + "?newName=" + encodeURIComponent(this.editName);
            this.$http.put(putUri, null).then(function (httpResponse) {
                _this.isLoading = false;
                _this.didMakeChanges = true;
                _this.shouldShowNewCategoryArea = false;
                _this.newName = "";
                _this.preselectById = _this.selectedCategory.financialCategoryId;
                _this.refresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to update: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
        * Called when the user wants to add a new category
        */
        FinancialCategoryManagerController.prototype.saveNewCategory = function () {
            var _this = this;
            if (!this.newName) {
                alert("Please enter a name");
                return;
            }
            this.isLoading = true;
            var postUri = "/api/Ledger/FinancialCategory/Add?name=" + encodeURIComponent(this.newName);
            if (this.newCategoryParent)
                postUri += "&parentCategoryId=" + this.newCategoryParent.financialCategoryId;
            this.$http.post(postUri, null).then(function (httpResponse) {
                _this.isLoading = false;
                _this.didMakeChanges = true;
                _this.preselectById = httpResponse.data;
                _this.shouldShowNewCategoryArea = false;
                _this.refresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
        * Called when the user wants to remove a category
        */
        FinancialCategoryManagerController.prototype.deleteCategory = function () {
            var _this = this;
            if (this.selectedCategory.displayName === "Income") {
                alert("You cannot delete the income category");
                return;
            }
            this.isLoading = true;
            var deleteUri = "/api/Ledger/FinancialCategory/" + this.selectedCategory.financialCategoryId;
            if (this.deleteCategoryRessignTo)
                deleteUri += "?reassignToCategoryId=" + this.deleteCategoryRessignTo.financialCategoryId;
            this.$http.delete(deleteUri).then(function (httpResponse) {
                _this.isLoading = false;
                _this.didMakeChanges = true;
                _this.shouldShowDeleteCategoryArea = false;
                _this.refresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        };
        FinancialCategoryManagerController.$inject = ["$http", "SiteInfo", "appCacheService", "$rootScope"];
        return FinancialCategoryManagerController;
    }());
    Ally.FinancialCategoryManagerController = FinancialCategoryManagerController;
})(Ally || (Ally = {}));
CA.angularApp.component("financialCategoryManager", {
    bindings: {
        onClosed: "&"
    },
    templateUrl: "/ngApp/chtn/manager/financial/financial-category-manager.html",
    controller: Ally.FinancialCategoryManagerController
});

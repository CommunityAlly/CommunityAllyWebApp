var Ally;
(function (Ally) {
    class TodoItem {
    }
    Ally.TodoItem = TodoItem;
    class TodoList {
    }
    Ally.TodoList = TodoList;
    class TodoListCtrl {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, fellowResidents) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.todoLists = [];
            this.isLoading = false;
            this.newListName = "";
            this.isFixedList = false;
            this.shouldExpandTodoItemModal = false;
            this.canManage = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isFixedList = !!this.fixedTodoListId;
            if (this.isFixedList)
                this.loadFixedTodoList();
            else
                this.loadAllTodoLists();
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId).then(isCommitteeMember => this.canManage = isCommitteeMember);
        }
        /**
         * Retrieve a todo list by ID
         */
        loadFixedTodoList() {
            this.isLoading = true;
            this.$http.get("/api/Todo/List/" + this.fixedTodoListId).then((httpResponse) => {
                this.isLoading = false;
                this.todoLists = [httpResponse.data];
            });
        }
        /**
         * Retrieve all available todo lists
         */
        loadAllTodoLists() {
            this.isLoading = true;
            let getUri = "/api/Todo";
            if (this.committee)
                getUri = "/api/Todo/ListsForCommittee/" + this.committee.committeeId;
            this.$http.get(getUri).then((httpResponse) => {
                this.isLoading = false;
                this.todoLists = httpResponse.data;
            });
        }
        /**
         * Create a new to-do list
         */
        onAddList() {
            this.isLoading = true;
            let postUri = "/api/Todo/newList?listName=" + encodeURIComponent(this.newListName);
            if (this.committee)
                postUri += "&committeeId=" + this.committee.committeeId;
            this.$http.post(postUri, null).then(() => {
                this.isLoading = false;
                this.newListName = "";
                this.loadAllTodoLists();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to create: " + response.data.exceptionMessage);
            });
        }
        /**
         * Create a new to-do item
         */
        onAddItem(todoListId) {
            this.isLoading = true;
            const postUri = "/api/Todo/newItem/" + todoListId + "?description=" + encodeURIComponent(this.newItemDescription);
            this.$http.post(postUri, null).then(() => {
                this.isLoading = false;
                this.newItemDescription = "";
                this.loadAllTodoLists();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to create: " + response.data.exceptionMessage);
            });
        }
        /**
         * Create a new to-do
         */
        addNewItem(todoListId) {
            this.editTodoItem = new TodoItem();
            this.editTodoItem.owningTodoListId = todoListId;
            if (this.committee)
                this.editTodoItem.owningTodoListId = todoListId;
            this.shouldExpandTodoItemModal = false;
            window.setTimeout(() => $("#edit-todo-name-text-box").focus(), 100);
        }
        /**
         * Save changes to a to-do item
         */
        saveTodoItem() {
            this.isLoading = true;
            const postUri = "/api/Todo/Item";
            this.$http.post(postUri, this.editTodoItem).then(() => {
                this.isLoading = false;
                this.newItemDescription = "";
                this.editTodoItem = null;
                this.loadAllTodoLists();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to create: " + response.data.exceptionMessage);
            });
        }
        /**
         * Toggle an item's completed state
         */
        onToggleComplete(todoListId, todoItemId) {
            this.isLoading = true;
            this.$http.put("/api/Todo/toggleComplete/" + todoListId + "/" + todoItemId, null).then(() => {
                this.isLoading = false;
                this.loadAllTodoLists();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to toggle: " + response.data.exceptionMessage);
            });
        }
        /**
         * Delete a to-do item
         */
        deleteTodoItem(curItem) {
            this.isLoading = true;
            this.$http.delete("/api/Todo/Item/" + curItem.todoItemId).then(() => {
                this.isLoading = false;
                this.loadAllTodoLists();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to delete: " + response.data.exceptionMessage);
            });
        }
        /**
         * Delete a to-do list
         */
        deleteTodoList(curList) {
            if (curList.todoItems.length > 0) {
                if (!confirm("Are you sure you want to delete this list with active to-dos?"))
                    return;
            }
            this.isLoading = true;
            this.$http.delete("/api/Todo/List/" + curList.todoListId).then(() => {
                this.isLoading = false;
                this.loadAllTodoLists();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to delete: " + response.data.exceptionMessage);
            });
        }
        /**
         * Export the lists to CSV
         */
        exportAllToCsv() {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportTodoListCsv');
            const a = this.todoLists[0].todoItems;
            a[0].completedByFullName;
            const csvColumns = [
                {
                    headerText: "List",
                    fieldName: "owningTodoListName"
                },
                {
                    headerText: "Description",
                    fieldName: "description"
                },
                {
                    headerText: "Due Date",
                    fieldName: "dueDate",
                    dataMapper: function (value) {
                        if (!value)
                            return "";
                        return moment(value).format("YYYY-MM-DD");
                    }
                },
                {
                    headerText: "Added On",
                    fieldName: "addedDateUtc"
                },
                {
                    headerText: "Added By",
                    fieldName: "addedByFullName"
                },
                {
                    headerText: "Completed On",
                    fieldName: "completedDateUtc"
                },
                {
                    headerText: "Completed By",
                    fieldName: "completedByFullName"
                }
            ];
            let csvDataString = "";
            for (let listIndex = 0; listIndex < this.todoLists.length; ++listIndex) {
                const curList = this.todoLists[listIndex];
                for (let i = 0; i < curList.todoItems.length; ++i)
                    curList.todoItems[i].owningTodoListName = curList.name;
                csvDataString += Ally.createCsvString(curList.todoItems, csvColumns, listIndex === 0);
            }
            let filename = "ToDos.csv";
            if (this.committee)
                filename = this.committee.name.replace(/\W/g, '') + "_" + filename;
            Ally.HtmlUtil2.downloadCsv(csvDataString, filename);
        }
    }
    TodoListCtrl.$inject = ["$http", "SiteInfo", "fellowResidents"];
    Ally.TodoListCtrl = TodoListCtrl;
})(Ally || (Ally = {}));
CA.angularApp.component("todoList", {
    bindings: {
        fixedTodoListId: "<?",
        committee: "<?"
    },
    templateUrl: "/ngApp/services/todo-list.html",
    controller: Ally.TodoListCtrl
});

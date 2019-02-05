namespace Ally
{
    export class TodoItem
    {
        todoItemId: number;
        owningTodoListId: number;
        addedByUserId: string;
        addedDateUtc: Date;
        completedByUserId: string;
        completedDateUtc: Date;
        description: string
        sortPriority: number;
        assignedToUserId: string;
        dueDate: Date;
        repeatType: number;
        repeatTypeData: number;
        repeatEvery: number;

        addedByFullName: string;
        completedByFullName: string;
        assignedToFullName: string;
    }


    export class TodoList
    {
        todoListId: number;
        groupId: number;
        addedByUserId: string;
        addedDateUtc: Date;
        deletedDateUtc: Date;
        mame: string;
        todoItems: TodoItem[];
        committeeId: number;
}


    export class TodoListCtrl implements ng.IController
    {
        static $inject = ["$http"];
        todoLists: TodoList[] = [];
        isLoading: boolean = false;
        newItemDescription: string;
        newListName: string = "";
        fixedTodoListId: number;
        isFixedList: boolean = false;
        shouldExpandTodoItemModal: boolean = false;
        editTodoItem: TodoItem;
        committee: Ally.Committee;


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
            this.isFixedList = !!this.fixedTodoListId;

            if( this.isFixedList )
                this.loadFixedTodoList();
            else
                this.loadAllTodoLists();
        }


        /**
         * Retrieve a todo list
         */
        loadFixedTodoList()
        {
            this.isLoading = true;

            this.$http.get( "/api/Todo/List/" + this.fixedTodoListId ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<TodoList> ) =>
            {
                this.isLoading = false;
                this.todoLists = [httpResponse.data];
            } );
        }


        /**
         * Retrieve the todo lists
         */
        loadAllTodoLists()
        {
            this.isLoading = true;

            let getUri = "/api/Todo";
            if( this.committee )
                getUri = "/api/Todo/ListsForCommittee/" + this.committee.committeeId;

            this.$http.get( getUri ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<TodoList[]> ) =>
            {
                this.isLoading = false;
                this.todoLists = httpResponse.data;
            } );
        }


        /**
         * Create a new to-do list
         */
        onAddList()
        {
            this.isLoading = true;

            let postUri = "/api/Todo/newList?listName=" + encodeURIComponent( this.newListName );
            if( this.committee )
                postUri += "&committeeId=" + this.committee.committeeId;

            this.$http.post( postUri, null ).then( () =>
            {
                this.isLoading = false;
                this.loadAllTodoLists();
            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to create: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Create a new to-do item
         */
        onAddItem( todoListId: number )
        {
            this.isLoading = true;

            var postUri = "/api/Todo/newItem/" + todoListId + "?description=" + encodeURIComponent( this.newItemDescription );
            this.$http.post( postUri, null ).then( ( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.newItemDescription = "";
                this.loadAllTodoLists();
            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to create: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Create a new to-do
         */
        addNewItem( todoListId: number )
        {
            this.editTodoItem = new TodoItem();
            this.editTodoItem.owningTodoListId = todoListId;
            if( this.committee )
                this.editTodoItem.owningTodoListId = todoListId;

            this.shouldExpandTodoItemModal = false;
            window.setTimeout( () => $( "#edit-todo-name-text-box" ).focus(), 100 );
        }


        /**
         * Save changes to a to-do item
         */
        saveTodoItem()
        {
            this.isLoading = true;

            var postUri = "/api/Todo/Item";
            this.$http.post( postUri, this.editTodoItem ).then( ( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.newItemDescription = "";
                this.editTodoItem = null;
                this.loadAllTodoLists();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to create: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Toggle an item's completed state
         */
        onToggleComplete( todoListId: number, todoItemId: number )
        {
            this.isLoading = true;

            this.$http.put( "/api/Todo/toggleComplete/" + todoListId + "/" + todoItemId, null ).then( ( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.loadAllTodoLists();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to toggle: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Delete a to-do item
         */
        deleteTodoItem( curItem: TodoItem )
        {
            this.isLoading = true;

            this.$http.delete( "/api/Todo/Item/" + curItem.todoItemId ).then(( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.loadAllTodoLists();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to delete: " + response.data.exceptionMessage );
            } );
        }


        /**
         * Delete a to-do list
         */
        deleteTodoList( curList: TodoList )
        {
            if( curList.todoItems.length > 0 )
            {
                if( !confirm( "Are you sure you want to delete this list with active to-dos?" ) )
                    return;
            }

            this.isLoading = true;

            this.$http.delete( "/api/Todo/List/" + curList.todoListId ).then(( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.loadAllTodoLists();

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                alert( "Failed to delete: " + response.data.exceptionMessage );
            } );
        }
    }
}


CA.angularApp.component( "todoList", {
    bindings: {
        fixedTodoListId: "<?",
        committee: "<?"
    },
    templateUrl: "/ngApp/services/todo-list.html",
    controller: Ally.TodoListCtrl
} );
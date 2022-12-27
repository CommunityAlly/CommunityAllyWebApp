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
        owningTodoListName: string;
    }


    export class TodoList
    {
        todoListId: number;
        groupId: number;
        addedByUserId: string;
        addedDateUtc: Date;
        deletedDateUtc: Date;
        name: string;
        todoItems: TodoItem[];
        committeeId: number;
}


    export class TodoListCtrl implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "fellowResidents"];
        todoLists: TodoList[] = [];
        isLoading: boolean = false;
        newItemDescription: string;
        newListName: string = "";
        fixedTodoListId: number;
        isFixedList: boolean = false;
        shouldExpandTodoItemModal: boolean = false;
        editTodoItem: TodoItem;
        committee: Ally.Committee;
        canManage: boolean = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private siteInfo: SiteInfoService, private fellowResidents: Ally.FellowResidentsService )
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

            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;

            // Make sure committee members can manage their data
            if( this.committee && !this.canManage )
                this.fellowResidents.isCommitteeMember( this.committee.committeeId ).then( isCommitteeMember => this.canManage = isCommitteeMember );
        }


        /**
         * Retrieve a todo list by ID
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
         * Retrieve all available todo lists
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

            this.$http.post( postUri, null ).then(
                () =>
                {
                    this.isLoading = false;
                    this.newListName = "";
                    this.loadAllTodoLists();

                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to create: " + response.data.exceptionMessage );
                }
            );
        }


        /**
         * Create a new to-do item
         */
        onAddItem( todoListId: number )
        {
            this.isLoading = true;

            const postUri = "/api/Todo/newItem/" + todoListId + "?description=" + encodeURIComponent( this.newItemDescription );
            this.$http.post( postUri, null ).then(
                () =>
                {
                    this.isLoading = false;
                    this.newItemDescription = "";
                    this.loadAllTodoLists();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to create: " + response.data.exceptionMessage );
                }
            );
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

            const postUri = "/api/Todo/Item";
            this.$http.post( postUri, this.editTodoItem ).then(
                () =>
                {
                    this.isLoading = false;
                    this.newItemDescription = "";
                    this.editTodoItem = null;
                    this.loadAllTodoLists();

                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to create: " + response.data.exceptionMessage );
                }
            );
        }


        /**
         * Toggle an item's completed state
         */
        onToggleComplete( todoListId: number, todoItemId: number )
        {
            this.isLoading = true;

            this.$http.put( "/api/Todo/toggleComplete/" + todoListId + "/" + todoItemId, null ).then(
                () =>
                {
                    this.isLoading = false;
                    this.loadAllTodoLists();

                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to toggle: " + response.data.exceptionMessage );
                }
            );
        }


        /**
         * Delete a to-do item
         */
        deleteTodoItem( curItem: TodoItem )
        {
            this.isLoading = true;

            this.$http.delete( "/api/Todo/Item/" + curItem.todoItemId ).then(
                ( ) =>
                {
                    this.isLoading = false;
                    this.loadAllTodoLists();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to delete: " + response.data.exceptionMessage );
                }
            );
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

            this.$http.delete( "/api/Todo/List/" + curList.todoListId ).then(
                () =>
                {
                    this.isLoading = false;
                    this.loadAllTodoLists();

                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to delete: " + response.data.exceptionMessage );
                }
            );
        }


        /**
         * Export the lists to CSV
         */
        exportAllToCsv()
        {
            if( typeof ( analytics ) !== "undefined" )
                analytics.track( 'exportTodoListCsv' );

            const a = this.todoLists[0].todoItems;
            a[0].completedByFullName

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
                    dataMapper: function( value: Date )
                    {
                        if( !value )
                            return "";

                        return moment( value ).format( "YYYY-MM-DD" );
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
            for( let listIndex = 0; listIndex < this.todoLists.length; ++listIndex )
            {
                const curList = this.todoLists[listIndex];

                for( let i = 0; i < curList.todoItems.length; ++i )
                    curList.todoItems[i].owningTodoListName = curList.name;

                csvDataString += Ally.createCsvString( curList.todoItems, csvColumns, listIndex === 0 );
            }

            let filename = "ToDos.csv";
            if( this.committee )
                filename = this.committee.name.replace( /\W/g, '' ) + "_" + filename;
            HtmlUtil2.downloadCsv( csvDataString, filename );
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
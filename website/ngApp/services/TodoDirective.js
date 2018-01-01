function TodoCtrl( $http )
{
    var ctrl = this;

    ctrl.todoLists = [];

    ctrl.loadTodos = function()
    {
        ctrl.isLoading = true;

        $http.get( "/api/Todo" ).then( function( httpResponse )
        {
            ctrl.isLoading = false;
            ctrl.todoLists = httpResponse.data;
        } );
    };

    // Create a new to-do list
    ctrl.onAddList = function()
    {
        ctrl.isLoading = true;

        $http.post( "/api/Todo/newList?listName=" + encodeURIComponent( ctrl.newListName ) ).then( function()
        {
            ctrl.isLoading = false;
            ctrl.loadTodos();
        } );
    };

    // Create a new to-do item
    ctrl.onAddItem = function( todoListId )
    {
        ctrl.isLoading = true;

        $http.post( "/api/Todo/newItem/" + todoListId + "?description=" + encodeURIComponent( ctrl.newItemDescription ) ).then( function()
        {
            ctrl.isLoading = false;
            ctrl.newItemDescription = "";
            ctrl.loadTodos();
        } );
    };

    // Mark an item complete
    ctrl.onToggleComplete = function( todoListId, todoItemId )
    {
        ctrl.isLoading = true;

        $http.put( "/api/Todo/toggleComplete/" + todoListId + "/" + todoItemId ).then( function()
        {
            ctrl.isLoading = false;
            ctrl.loadTodos();
        } );
    };

    ctrl.loadTodos();
}

TodoCtrl.$inject = ["$http"];

CA.angularApp.component( "todos", {

    bindings: {},
    templateUrl: "/ngApp/Services/TodoDirectiveTemplate.html",
    controller: TodoCtrl
} );
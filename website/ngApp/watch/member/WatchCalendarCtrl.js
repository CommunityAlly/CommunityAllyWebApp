function WatchCalendarCtrl( $scope, $timeout, $http, $rootScope, $q ) {

    var vm = this;

    var calendarEvents = [];

    var DateFormat = "YYYY-MM-DD";
    var TimeFormat = "h:mma";

    var NoTime = "12:37am";

    $scope.today = new Date();

    var getCalendarEvents = function ( start, end, timezone, callback ) {
        $scope.isLoadingCalendarEvents = true;

        var firstDay = start.format( DateFormat );
        var lastDay = end.format( DateFormat );

        $http.get( "/api/CalendarEvent?startDate=" + firstDay + "&endDate=" + lastDay ).then( function ( httpResponse ) {
            var associationEvents = [];

            var data = httpResponse.data;

            $scope.isLoadingCalendarEvents = false;

            _.each( data, function ( entry ) {
                entry.timeOnly = moment.utc( entry.date ).format( TimeFormat );
                entry.dateOnly = entry.date;

                if ( entry.timeOnly == NoTime )
                    entry.timeOnly = "";

                var shortText = entry.title;
                if ( shortText.length > 17 )
                    shortText = shortText.substring( 0, 17 ) + "...";

                var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.title + "</p>";

                associationEvents.push( {
                    title: shortText,
                    start: entry.date.substring( 0, 10 ), // 10 = length of YYYY-MM-DD
                    toolTipTitle: "Event",
                    fullDescription: fullDescription,
                    calendarEventObject: entry
                } );
            } );

            callback( associationEvents );

        }, function () {
            $scope.isLoadingCalendarEvents = false;
        } );
    };

    /* config object */
    var uiConfig = {
        height: 600,
        editable: false,
        header: {
            left: 'month agendaWeek',
            center: 'title',
            right: 'today prev,next'
        },
        viewRender: function ( view, element ) {
            if ( $rootScope.isSiteManager )
                $( element ).css( "cursor", "pointer" );
        },
        dayClick: function ( date ) {
            if ( !$rootScope.isSiteManager )
                return;

            // The date is wrong if time zone is considered
            var clickedDate = moment( moment.utc( date ).format( DateFormat ) ).toDate();

            $scope.$apply( function () {
                $scope.setEditEvent( { date: clickedDate, dateOnly: clickedDate, associatedUserIds: [] } );
            } );
        },
        eventClick: function ( event ) {
            $scope.$apply( function () {
                if ( event.calendarEventObject ) {
                    $scope.setEditEvent( event.calendarEventObject, true );
                }
            } );
        },
        eventRender: function ( event, element ) {
            $( element ).css( "cursor", "default" );

            $( element ).qtip( {
                style: {
                    classes: 'qtip-light qtip-shadow'
                },
                content: {
                    text: event.fullDescription,
                    title: event.toolTipTitle
                }
            } );
        },
        eventSources: [{
            events: getCalendarEvents
        }]
    };


    $( document ).ready( function () {
        $( '.EditableEntry' ).editable( '<%= Request.Url %>',
        {
            id: 'EditEntryId',
            type: 'textarea',
            cancel: 'Cancel',
            submit: 'Ok'
        } );

        //$( ".collapsibleContainer" ).collapsiblePanel();

        $( '#log-calendar' ).fullCalendar( uiConfig );
    } );


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user clicks a user in the calendar event modal
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onResidentClicked = function ( userId ) {
        var alreadyExists = _.contains( $scope.editEvent.associatedUserIds, userId );

        if ( alreadyExists )
            $scope.editEvent.associatedUserIds = _.without( $scope.editEvent.associatedUserIds, userId );
        else
            $scope.editEvent.associatedUserIds.push( userId );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Returns if a specific user's ID is associated with the currently selected event
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.isUserAssociated = function ( userId )
    {
        if ( $scope.editEvent && $scope.editEvent.associatedUserIds )
            return _.contains( $scope.editEvent.associatedUserIds, userId );

        return false;
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Show the full calendar event edit modal
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.expandCalendarEventModel = function () {
        $scope.showExpandedCalendarEventModel = true;

        //TODO Animate this?
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Set the calendar event for us to edit
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.setEditEvent = function ( eventObject, showDetails ) {
        $scope.showExpandedCalendarEventModel = showDetails || false;
        $scope.editEvent = eventObject;

        // Set focus on the title so it's user friendly and ng-escape needs an input focused to
        // work
        if ( eventObject )
            setTimeout( function () { $( "#calendar-event-title" ).focus(); }, 10 );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Delete the calendar event that's being viewed
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.deleteCalendarEvent = function ( eventId ) {
        if ( !confirm( "Are you sure you want to remove this calendar event?" ) )
            return;

        $scope.isLoadingCalendarEvents = true;

        $http.delete( "/api/CalendarEvent?eventId=" + eventId ).then( function () {
            $scope.isLoadingCalendarEvents = false;

            $scope.editEvent = null;

            $scope.onlyRefreshCalendarEvents = true;
            $( '#log-calendar' ).fullCalendar( 'refetchEvents' );
        }, function () {
            $scope.isLoadingCalendarEvents = false;
            alert( "Failed to delete the calendar event." );
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Save the calendar event that's being viewed
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.saveCalendarEvent = function () {
        var dateTimeString = "";
        if ( typeof ( $scope.editEvent.timeOnly ) === "string" && $scope.editEvent.timeOnly.length > 1 )
            dateTimeString = moment.utc( $scope.editEvent.date ).format( DateFormat ) + " " + $scope.editEvent.timeOnly;
        else
            dateTimeString = moment.utc( $scope.editEvent.date ).format( DateFormat ) + " " + NoTime;

        $scope.editEvent.date = moment.utc( dateTimeString, DateFormat + " " + TimeFormat ).toDate();

        var httpFunc;
        if ( $scope.editEvent.eventId )
            httpFunc = $http.put;
        else
            httpFunc = $http.post;

        $scope.isLoadingCalendarEvents = true;

        httpFunc( "/api/CalendarEvent", $scope.editEvent ).then( function () {
            $scope.isLoadingCalendarEvents = false;
            $scope.editEvent = null;

            $scope.onlyRefreshCalendarEvents = true;
            $( '#log-calendar' ).fullCalendar( 'refetchEvents' );
        }, function () {
            $scope.isLoadingCalendarEvents = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user wants to delete a news item
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onDeleteItem = function ( item ) {
        if ( !confirm( 'Are you sure you want to delete this information?' ) )
            return;

        $scope.isLoading = true;

        LogEntryResource.delete( { logEntryId: item.logEntryId }, function () {
            $scope.RetrieveItems();
        } );
    };
    
    $( '#calendar-event-time' ).timepicker( { 'scrollDefault': '10:00am' } );
}
WatchCalendarCtrl.$inject = ['$scope', '$timeout', '$http', '$rootScope', "$q"];
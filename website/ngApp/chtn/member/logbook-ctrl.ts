namespace Ally
{
    /**
     * The controller for the page that lets users view a calender of events
     */
    export class LogbookController implements ng.IController
    {
        static $inject = ["$scope", "$timeout", "$http", "$rootScope", "$q", "fellowResidents", "SiteInfo"];

        calendarEvents: any[];
        residents: any[];
        viewEvent: any;
        editEvent: any;
        maxDaysBack: number;
        showBadNotificationDateWarning: boolean = false;
        isLoadingNews: boolean = false;
        isLoadingLogbookForCalendar: boolean = false;
        isLoadingPolls: boolean = false;
        isLoadingCalendarEvents: boolean = false;
        onlyRefreshCalendarEvents: boolean = false;
        showExpandedCalendarEventModel: boolean = false;
        currentTimeZoneAbbreviation: string = "CT";
        groupTimeZoneAbbreviation: string;
        localTimeZoneDiffersFromGroup: boolean = false;

        static DateFormat = "YYYY-MM-DD";
        static TimeFormat = "h:mma";
        static NoTime = "12:37am";


        /**
         * The constructor for the class
         */
        constructor( private $scope: ng.IScope, private $timeout: ng.ITimeoutService, private $http: ng.IHttpService, private $rootScope: ng.IRootScopeService, private $q: ng.IQService, private fellowResidents: Ally.FellowResidentsService, private siteInfo: Ally.SiteInfoService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            let tempMoment = <any>moment();
            let localTimeZone: string = ( <any>moment ).tz.guess();
            this.currentTimeZoneAbbreviation = tempMoment.tz( localTimeZone ).format( 'z' );

            if( this.siteInfo.privateSiteInfo.groupAddress && this.siteInfo.privateSiteInfo.groupAddress.timeZoneIana )
            {
                this.groupTimeZoneAbbreviation = tempMoment.tz( this.siteInfo.privateSiteInfo.groupAddress.timeZoneIana ).format( 'z' );

                if( this.groupTimeZoneAbbreviation != this.currentTimeZoneAbbreviation )
                    this.localTimeZoneDiffersFromGroup = true;
            }
            
            if( AppConfig.isChtnSite )
            {
                this.fellowResidents.getResidents().then( ( residents: any[] ) =>
                {
                    this.residents = residents;
                    this.residents = _.sortBy( this.residents, ( r: any ) => r.lastName )
                } );
            }

            var innerThis = this;

            /* config object */
            var uiConfig = {
                height: 600,
                editable: false,
                header: {
                    //left: 'month agendaWeek',
                    left: 'prevYear prev next nextYear today',
                    center: 'title',
                    right: 'month listYear'
                },
                viewRender: function( view: any, element: JQuery )
                {
                    $( element ).css( "cursor", "pointer" );
                },
                dayClick: function( date: moment.Moment )
                {
                    if( !innerThis.$rootScope.isSiteManager )
                        return;

                    // The date is wrong if time zone is considered
                    var clickedDate = moment( moment.utc( date ).format( LogbookController.DateFormat ) ).toDate();

                    innerThis.$scope.$apply( function()
                    {
                        var maxDaysBack: number = null; //3;
                        //if( moment( clickedDate ).subtract( maxDaysBack, 'day' ).isBefore( moment() ) )
                        //    maxDaysBack = moment( clickedDate ).diff( moment(), 'day' );

                        var eventDetails = {
                            date: clickedDate,
                            dateOnly: clickedDate,
                            associatedUserIds: <any[]>[],
                            notificationEmailDaysBefore: maxDaysBack
                        };

                        innerThis.setEditEvent( eventDetails, false );
                    } );
                },
                eventClick: function( event: any )
                {
                    innerThis.$scope.$apply( function()
                    {
                        if( event.calendarEventObject )
                        {
                            if( innerThis.$rootScope.isSiteManager )
                                innerThis.setEditEvent( event.calendarEventObject, true );
                            else
                                innerThis.viewEvent = event.calendarEventObject;
                        }
                    } );
                },
                eventRender: function( event: any, element: JQuery )
                {
                    //$( element ).css( "cursor", "default" );

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
                    events: ( start: moment.Moment, end: moment.Moment, timezone: string, callback: ( calendarEvents: any[] ) => void ) =>
                    {
                        innerThis.getAssociationEvents( start, end, timezone, callback )
                    }
                },
                {
                    events: ( start: moment.Moment, end: moment.Moment, timezone: string, callback: ( calendarEvents: any[] ) => void ) =>
                    {
                        innerThis.getCalendarEvents( start, end, timezone, callback )
                    }
                }]
            };


            $( document ).ready( function()
            {
                $( '.EditableEntry' ).editable( '<%= Request.Url %>',
                    {
                        id: 'EditEntryId',
                        type: 'textarea',
                        cancel: 'Cancel',
                        submit: 'Ok'
                    } );

                //$( ".collapsibleContainer" ).collapsiblePanel();

                $( '#log-calendar' ).fullCalendar( uiConfig );

                $( '#calendar-event-time' ).timepicker( { 'scrollDefault': '10:00am' } );

                $( ".fc-bg td.fc-today" ).append( "<div class='today-note'>Today</div>" );
            } );
        }


        getAllEvents( startDate: moment.Moment, endDate: moment.Moment )
        {
            var loadNewsToCalendar = false;
            var loadLogbookToCalendar = true;
            var loadPollsToCalendar = AppConfig.isChtnSite;

            //var firstDay = moment().startOf( "month" ).format( DateFormat );
            //var lastDay = moment().add( 1, "month" ).startOf( "month" ).format( DateFormat );

            var firstDay = startDate.format( LogbookController.DateFormat );
            var lastDay = endDate.format( LogbookController.DateFormat );

            var newsDeferred = this.$q.defer();
            var logbookDeferred = this.$q.defer();
            var pollDeferred = this.$q.defer();


            if( loadNewsToCalendar )
            {
                this.isLoadingNews = true;

                var innerThis = this;
                this.$http.get( "/api/News/WithinDates?startDate=" + firstDay + "&endDate=" + lastDay ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<any> )
                {
                    var data = <any[]>httpResponse.data;

                    innerThis.isLoadingNews = false;

                    _.each( data, function( entry: any )
                    {
                        var shortText = entry.text;
                        if( shortText.length > 10 )
                            shortText = shortText.substring( 0, 10 ) + "...";

                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";

                        innerThis.calendarEvents.push( {
                            title: "Notice: " + shortText,
                            start: moment( entry.postDate ).format( "YYYY-MM-DD" ),
                            toolTipTitle: "Notice Added",
                            fullDescription: fullDescription
                        } );
                    } );

                    newsDeferred.resolve();

                }, function()
                    {
                        innerThis.isLoadingNews = false;
                        newsDeferred.resolve();
                    } );
            }
            else
                newsDeferred.resolve();

            if( loadLogbookToCalendar )
            {
                this.isLoadingLogbookForCalendar = true;

                var innerThis = this;
                this.$http.get( "/api/Logbook?startDate=" + firstDay + "&endDate=" + lastDay ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<any> )
                {
                    var data = httpResponse.data;

                    innerThis.isLoadingLogbookForCalendar = false;

                    _.each( data, function( entry: any )
                    {
                        var shortText = entry.text;
                        if( shortText.length > 10 )
                            shortText = shortText.substring( 0, 10 ) + "...";

                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";

                        innerThis.calendarEvents.push( {
                            title: "Logbook: " + shortText,
                            start: moment( entry.postDate ).format( "YYYY-MM-DD" ),
                            toolTipTitle: "Logbook Entry Added",
                            fullDescription: fullDescription
                        } );
                    } );

                    logbookDeferred.resolve();

                }, function()
                {
                    innerThis.isLoadingLogbookForCalendar = false;
                    logbookDeferred.resolve();
                } );
            }
            else
                logbookDeferred.resolve();

            if( loadPollsToCalendar )
            {
                this.isLoadingPolls = true;
                
                this.$http.get( "/api/Poll/DateRange?startDate=" + firstDay + "&endDate=" + lastDay ).then( ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    var data = httpResponse.data;

                    this.isLoadingPolls = false;

                    _.each( data, ( entry: any ) =>
                    {
                        var shortText = entry.text;
                        if( shortText.length > 10 )
                            shortText = shortText.substring( 0, 10 ) + "...";

                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        
                        this.calendarEvents.push( {
                            title: "Poll: " + shortText,
                            start: moment( entry.postDate ).format( "YYYY-MM-DD" ),
                            toolTipTitle: "Poll Added",
                            fullDescription: fullDescription
                        } );
                    } );

                    pollDeferred.resolve();

                }, () =>
                {
                    this.isLoadingPolls = false;
                    pollDeferred.resolve();
                } );
            }
            else
                pollDeferred.resolve();

            return this.$q.all( [newsDeferred.promise, logbookDeferred.promise, pollDeferred.promise] );
        }


        getAssociationEvents( start: moment.Moment, end: moment.Moment, timezone: string, callback: ( calendarEvents: any[] ) => void )
        {
            if( this.onlyRefreshCalendarEvents )
            {
                this.onlyRefreshCalendarEvents = undefined;
                callback( this.calendarEvents );
                return;
            }

            this.calendarEvents = [];

            var innerThis = this;
            this.getAllEvents( start, end ).then( function()
            {
                callback( innerThis.calendarEvents );
            } );
        }


        getCalendarEvents( start: moment.Moment, end: moment.Moment, timezone: string, callback: ( calendarEvents: any[] ) => void )
        {
            this.isLoadingCalendarEvents = true;

            var firstDay = start.format( LogbookController.DateFormat );
            var lastDay = end.format( LogbookController.DateFormat );

            var innerThis = this;
            this.$http.get( "/api/CalendarEvent?startDate=" + firstDay + "&endDate=" + lastDay ).then( function( httpResponse )
            {
                var data = <any[]>httpResponse.data;

                var associationEvents: any[] = [];

                innerThis.isLoadingCalendarEvents = false;

                _.each( data, function( entry )
                {
                    var utcEventDate = moment.utc( entry.eventDateUtc );
                    var utcTimeOnly = utcEventDate.format( LogbookController.TimeFormat );
                    var isAllDay = utcTimeOnly == LogbookController.NoTime;

                    var dateEntry;
                    if( isAllDay )
                    {
                        entry.timeOnly = "";
                        entry.dateOnly = new Date( utcEventDate.year(), utcEventDate.month(), utcEventDate.date() );
                        dateEntry = new Date( utcEventDate.year(), utcEventDate.month(), utcEventDate.date() );
                    }
                    else
                    {
                        var localDate = moment.utc( entry.eventDateUtc ).local();
                        entry.timeOnly = localDate.format( LogbookController.TimeFormat );
                        entry.dateOnly = localDate.clone().startOf( 'day' ).toDate();
                        dateEntry = localDate.toDate();
                    }

                    var shortText = entry.title;
                    if( shortText && shortText.length > 10 )
                        shortText = shortText.substring( 0, 10 ) + "...";

                    var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.title + "</p>";

                    associationEvents.push( {
                        //title: "Event: " + shortText,
                        title: shortText,
                        start: dateEntry,
                        toolTipTitle: "Event",
                        fullDescription: fullDescription,
                        calendarEventObject: entry,
                        allDay: isAllDay
                    } );
                } );

                callback( associationEvents );

            }, function()
                {
                    innerThis.isLoadingCalendarEvents = false;
                } );
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks a user in the calendar event modal
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onResidentClicked = function( resident: any )
        {
            if( !resident.hasEmail )
            {
                alert( "That user cannot be included because they do not have an e-mail address on file." );
                resident.isAssociated = false;
                return;
            }

            var alreadyExists = _.contains( this.editEvent.associatedUserIds, resident.userId );

            if( alreadyExists )
                this.editEvent.associatedUserIds = _.without( this.editEvent.associatedUserIds, resident.userId );
            else
                this.editEvent.associatedUserIds.push( resident.userId );
        }


        isUserAssociated( userId: string ): boolean
        {
            if( this.editEvent && this.editEvent.associatedUserIds )
                return _.contains( this.editEvent.associatedUserIds, userId );

            return false;
        }


        isDateInPast( date: Date ): boolean
        {
            var momentDate = moment( date );
            var today = moment();
            return momentDate.isBefore( today, 'day' ) || momentDate.isSame( today, 'day' );
        }


        onShouldSendChange()
        {
            // Don't allow the user to send remdiner e-mails for past dates
            if( this.editEvent.shouldSendNotification && this.isDateInPast( this.editEvent.dateOnly ) )
                this.editEvent.shouldSendNotification = false;
        }


        onChangeEmailDaysBefore()
        {
            var notificationDate = moment( this.editEvent.dateOnly ).subtract( this.editEvent.notificationEmailDaysBefore, 'day' );
            var today = moment();
            this.showBadNotificationDateWarning = notificationDate.isBefore( today, 'day' ) || notificationDate.isSame( today, 'day' );

            if( this.showBadNotificationDateWarning )
            {
                this.maxDaysBack = moment( this.editEvent.dateOnly ).diff( today, 'day' );
                this.editEvent.notificationEmailDaysBefore = this.maxDaysBack;

                var innerThis = this;
                this.$timeout( function() { innerThis.showBadNotificationDateWarning = false; }, 10000 );
            }
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Show the full calendar event edit modal
        ///////////////////////////////////////////////////////////////////////////////////////////////
        expandCalendarEventModel()
        {
            this.showExpandedCalendarEventModel = true;
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Hide the read-only calendar event view
        ///////////////////////////////////////////////////////////////////////////////////////////////
        clearViewEvent = function()
        {
            this.viewEvent = null;
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Set the calendar event for us to edit
        ///////////////////////////////////////////////////////////////////////////////////////////////
        setEditEvent( eventObject: any, showDetails: boolean )
        {
            this.showExpandedCalendarEventModel = showDetails || false;
            this.editEvent = eventObject;

            // Clear this warning in case the user is clicking around quickly
            this.showBadNotificationDateWarning = false;

            if( this.editEvent )
            {
                // Simplify the UI logic by transforming this input
                if( this.residents )
                    _.each( this.residents, ( r ) => r.isAssociated = this.isUserAssociated( r.userId ) );

                this.editEvent.shouldSendNotification = this.editEvent.notificationEmailDaysBefore !== null;

                // Set focus on the title so it's user friendly and ng-escape needs an input focused
                // to work
                setTimeout( function() { $( "#calendar-event-title" ).focus(); }, 10 );
            }
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Delete the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        deleteCalendarEvent( eventId: number )
        {
            if( !confirm( "Are you sure you want to remove this event?" ) )
                return;

            this.isLoadingCalendarEvents = true;

            this.$http.delete( "/api/CalendarEvent?eventId=" + eventId ).then( () =>
            {
                this.isLoadingCalendarEvents = false;

                this.editEvent = null;

                this.onlyRefreshCalendarEvents = true;
                $( '#log-calendar' ).fullCalendar( 'refetchEvents' );

            }, () =>
            {
                this.isLoadingCalendarEvents = false;
                alert( "Failed to delete the calendar event." );
            } );
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Save the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        saveCalendarEvent()
        {
            // Build the list of the associated users
            if( this.residents )
            {
                var associatedUsers = _.filter( this.residents, function( r ) { return r.isAssociated; } );
                this.editEvent.associatedUserIds = _.map( associatedUsers, function( r ) { return r.userId; } );
            }

            var dateTimeString = "";
            if( typeof ( this.editEvent.timeOnly ) === "string" && this.editEvent.timeOnly.length > 1 )
            {
                dateTimeString = moment( this.editEvent.dateOnly ).format( LogbookController.DateFormat ) + " " + this.editEvent.timeOnly;
                this.editEvent.eventDateUtc = moment( dateTimeString, LogbookController.DateFormat + " " + LogbookController.TimeFormat ).utc().toDate();
            }
            else
            {
                dateTimeString = moment( this.editEvent.dateOnly ).format( LogbookController.DateFormat ) + " " + LogbookController.NoTime;
                this.editEvent.eventDateUtc = moment.utc( dateTimeString, LogbookController.DateFormat + " " + LogbookController.TimeFormat ).toDate();
            }

            if( !this.editEvent.shouldSendNotification )
                this.editEvent.notificationEmailDaysBefore = null;

            var httpFunc;
            if( this.editEvent.eventId )
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;

            analytics.track( "addCalendarEvent" );

            this.isLoadingCalendarEvents = true;

            httpFunc( "/api/CalendarEvent", this.editEvent ).then( () =>
            {
                this.isLoadingCalendarEvents = false;
                this.editEvent = null;

                this.onlyRefreshCalendarEvents = true;
                $( '#log-calendar' ).fullCalendar( 'refetchEvents' );

            }, ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoadingCalendarEvents = false;

                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert( "Failed to save the calendar event: " + errorMessage );
            } );
        };
    }
}


CA.angularApp.component( "logbookPage", {
    templateUrl: "/ngApp/chtn/member/logbook.html",
    controller: Ally.LogbookController
} );
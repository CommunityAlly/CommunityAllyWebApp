declare var rrule: any;

namespace Ally
{
    /**
     * The controller for the page that lets users view a calender of events
     */
    export class LogbookController implements ng.IController
    {
        static $inject = ["$scope", "$timeout", "$http", "$rootScope", "$q", "fellowResidents", "SiteInfo"];

        calendarEvents: uiCalendarEntry[];
        residents: FellowChtnResident[];
        viewEvent: CalendarEvent;
        editEvent: CalendarEvent;
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
        tinyMceEditor: ITinyMce;
        descriptionText = "";
        associatedGroups: AssociatedGroup[] = [];
        canEditEvents = false;
        readonly GroupShortNameIndividuals = "Individuals";

        static DateFormat = "YYYY-MM-DD";
        static TimeFormat = "h:mma";
        static NoTime = "12:37am";


        /**
         * The constructor for the class
         */
        constructor( private $scope: ng.IScope, private $timeout: ng.ITimeoutService, private $http: ng.IHttpService, private $rootScope: ng.IRootScopeService, private $q: ng.IQService, private fellowResidents: FellowResidentsService, private siteInfo: SiteInfoService )
        {
        }


        getTimezoneAbbreviation( timeZoneIana: string = null )
        {
            // Need to cast moment to any because we don't have the tz typedef file
            const tempMoment = <any>moment();

            if( !timeZoneIana )
                timeZoneIana = ( <any>moment ).tz.guess();

            const timeZoneInfo = tempMoment.tz( timeZoneIana );
            const timeZoneAbbreviation: string = timeZoneInfo.format( 'z' );

            // Drop the daylight savings time (DST) info to avoid confusion with users
            if( timeZoneAbbreviation === "EST" || timeZoneAbbreviation === "EDT" )
                return "ET";
            else if( timeZoneAbbreviation === "CST" || timeZoneAbbreviation === "CDT" )
                return "CT";
            else if( timeZoneAbbreviation === "MST" || timeZoneAbbreviation === "MDT" )
                return "MT";
            else if( timeZoneAbbreviation === "PST" || timeZoneAbbreviation === "PDT" )
                return "PT";

            return timeZoneAbbreviation;
        }

        
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.currentTimeZoneAbbreviation = this.getTimezoneAbbreviation();
            this.canEditEvents = this.siteInfo.userInfo.isSiteManager;

            if( this.siteInfo.privateSiteInfo.groupAddress && this.siteInfo.privateSiteInfo.groupAddress.timeZoneIana )
            {
                this.groupTimeZoneAbbreviation = this.getTimezoneAbbreviation( this.siteInfo.privateSiteInfo.groupAddress.timeZoneIana );

                if( this.groupTimeZoneAbbreviation != this.currentTimeZoneAbbreviation )
                    this.localTimeZoneDiffersFromGroup = true;
            }
            
            if( AppConfig.isChtnSite )
            {
                this.fellowResidents.getResidents().then( ( residents: FellowChtnResident[] ) =>
                {
                    this.residents = residents;
                    this.residents = _.sortBy( this.residents, ( r: any ) => r.lastName )
                } );
            }

            /* config object */
            const uiConfig = {
                height: 600,
                editable: false,
                header: {
                    //left: 'month agendaWeek',
                    left: 'prevYear prev next nextYear today',
                    center: 'title',
                    right: 'month listYear'
                },
                viewRender: ( view: any, element: JQuery ) =>
                {
                    $( element ).css( "cursor", "pointer" );
                },
                dayClick: ( date: moment.Moment ) =>
                {
                    if( !this.$rootScope.isSiteManager )
                        return;

                    // The date is wrong if time zone is considered
                    var clickedDate = moment( moment.utc( date ).format( LogbookController.DateFormat ) ).toDate();

                    this.$scope.$apply( () =>
                    {
                        const maxDaysBack: number = null; //3;
                        //if( moment( clickedDate ).subtract( maxDaysBack, 'day' ).isBefore( moment() ) )
                        //    maxDaysBack = moment( clickedDate ).diff( moment(), 'day' );

                        const eventDetails = new CalendarEvent();
                        eventDetails.dateOnly = clickedDate;
                        eventDetails.associatedUserIds = <any[]>[];
                        eventDetails.notificationEmailDaysBefore = maxDaysBack;
                        eventDetails.repeatType = null;
                        eventDetails.repeatFrequency = 1;

                        this.setEditEvent( eventDetails, false );
                    } );
                },
                eventClick: ( event: any ) =>
                {
                    this.$scope.$apply( () =>
                    {
                        if( event.calendarEventObject )
                        {
                            this.viewEvent = event.calendarEventObject;

                            if( this.viewEvent.repeatRule )
                            {
                                const parsedRule = new rrule.rrulestr( this.viewEvent.repeatRule );

                                this.viewEvent.repeatViewLabel = "Every ";
                                if( parsedRule.options.interval > 1 )
                                    this.viewEvent.repeatViewLabel += parsedRule.options.interval + " ";

                                if( parsedRule.options.freq === rrule.RRule.DAILY )
                                    this.viewEvent.repeatViewLabel += "day";
                                else if( parsedRule.options.freq === rrule.RRule.WEEKLY )
                                    this.viewEvent.repeatViewLabel += "week";
                                else if( parsedRule.options.freq === rrule.RRule.MONTHLY )
                                    this.viewEvent.repeatViewLabel += "month";
                                else if( parsedRule.options.freq === rrule.RRule.YEARLY )
                                    this.viewEvent.repeatViewLabel += "year";

                                if( parsedRule.options.interval > 1 )
                                    this.viewEvent.repeatViewLabel += "s";

                                if( this.viewEvent.repeatUntilDate )
                                    this.viewEvent.repeatViewLabel += " until " + moment( this.viewEvent.repeatUntilDate ).format( "MMM D, YYYY" );
                            }
                            else
                                this.viewEvent.repeatViewLabel = null;

                            //if( this.$rootScope.isSiteManager )
                            //    this.setEditEvent( event.calendarEventObject, true );
                            //else
                            //{
                            //    this.viewEvent = event.calendarEventObject;

                            //    // Make <a> links open in new tabs
                            //    //setTimeout( () => RichTextHelper.makeLinksOpenNewTab( "view-event-desc" ), 500 );
                            //}
                        }
                        else
                            alert( "This is an informational entry that does not have data to display" );
                    } );
                },
                eventRender: ( event: any, element: JQuery ) =>
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
                eventSources: [
                    {
                        events: ( start: moment.Moment, end: moment.Moment, timezone: string, callback: ( calendarEvents: any[] ) => void ) =>
                        {
                            this.getAssociationEvents( start, end, timezone, callback )
                        }
                    },
                    {
                        events: ( start: moment.Moment, end: moment.Moment, timezone: string, callback: ( calendarEvents: any[] ) => void ) =>
                        {
                            this.getCalendarEvents( start, end, timezone, callback )
                        }
                    }
                ]
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

                $( '#full-calendar-elem' ).fullCalendar( uiConfig );

                $( '#calendar-event-time' ).timepicker( { 'scrollDefault': '10:00am' } );

                $( ".fc-bg td.fc-today" ).append( "<div class='today-note'>Today</div>" );
            } );

            this.fellowResidents.getGroupEmailObject().then( ( emailList: Ally.GroupEmailInfo[] ) =>
            {
                this.associatedGroups = emailList.map( e =>
                {
                    const isCustomRecipientGroup = e.recipientType.toUpperCase() === FellowResidentsService.CustomRecipientType;
                    
                    return {
                        groupShortName: isCustomRecipientGroup ? ( "custom:" + e.recipientTypeName ) : e.recipientType,
                        displayLabel: e.displayName,
                        isAssociated: false
                    };
                } );

                this.associatedGroups.push( { displayLabel: this.GroupShortNameIndividuals, groupShortName: this.GroupShortNameIndividuals, isAssociated: false } );
            } );
        }


        getAllEvents( startDate: moment.Moment, endDate: moment.Moment )
        {
            const loadNewsToCalendar = false;
            const loadLogbookToCalendar = false;
            const loadPollsToCalendar = AppConfig.isChtnSite;

            //var firstDay = moment().startOf( "month" ).format( DateFormat );
            //var lastDay = moment().add( 1, "month" ).startOf( "month" ).format( DateFormat );

            const firstDay = startDate.format( LogbookController.DateFormat );
            const lastDay = endDate.format( LogbookController.DateFormat );

            const newsDeferred = this.$q.defer();
            const logbookDeferred = this.$q.defer();
            const pollDeferred = this.$q.defer();

            if( loadNewsToCalendar )
            {
                this.isLoadingNews = true;

                this.$http.get( "/api/News/WithinDates?startDate=" + firstDay + "&endDate=" + lastDay ).then(
                    ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                    {
                        var data = <any[]>httpResponse.data;

                        this.isLoadingNews = false;

                        _.each( data, function( entry: any )
                        {
                            var shortText = entry.text;
                            if( shortText.length > 10 )
                                shortText = shortText.substring( 0, 10 ) + "...";

                            var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";

                            this.calendarEvents.push( {
                                title: "Notice: " + shortText,
                                start: moment( entry.postDate ).toDate(),
                                toolTipTitle: "Notice Added",
                                fullDescription: fullDescription
                            } );
                        } );

                        newsDeferred.resolve();
                    },
                    () =>
                    {
                        this.isLoadingNews = false;
                        newsDeferred.resolve();
                    }
                );
            }
            else
                newsDeferred.resolve();

            if( loadLogbookToCalendar )
            {
                this.isLoadingLogbookForCalendar = true;

                this.$http.get( "/api/Logbook?startDate=" + firstDay + "&endDate=" + lastDay ).then(
                    ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                    {
                        var data = httpResponse.data;

                        this.isLoadingLogbookForCalendar = false;

                        _.each( data, function( entry: any )
                        {
                            var shortText = entry.text;
                            if( shortText.length > 10 )
                                shortText = shortText.substring( 0, 10 ) + "...";

                            var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";

                            this.calendarEvents.push( {
                                title: "Logbook: " + shortText,
                                start: moment( entry.postDate ).format( "YYYY-MM-DD" ),
                                toolTipTitle: "Logbook Entry Added",
                                fullDescription: fullDescription
                            } );
                        } );

                        logbookDeferred.resolve();

                    },
                    () =>
                    {
                        this.isLoadingLogbookForCalendar = false;
                        logbookDeferred.resolve();
                    }
                );
            }
            else
                logbookDeferred.resolve();

            if( loadPollsToCalendar )
            {
                this.isLoadingPolls = true;
                
                this.$http.get( "/api/Poll/DateRange?startDate=" + firstDay + "&endDate=" + lastDay ).then(
                    ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
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
                                start: moment( entry.postDate ).toDate(),
                                calendarEventObject: null,
                                toolTipTitle: "Poll Added",
                                fullDescription: fullDescription,
                                allDay: false
                            } );
                        } );

                        pollDeferred.resolve();

                    },
                    () =>
                    {
                        this.isLoadingPolls = false;
                        pollDeferred.resolve();
                    }
                );
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

            this.getAllEvents( start, end ).then( () =>
            {
                callback( this.calendarEvents );
            } );
        }


        getCalendarEvents( start: moment.Moment, end: moment.Moment, timezone: string, callback: ( calendarEvents: any[] ) => void )
        {
            this.isLoadingCalendarEvents = true;

            const firstDay = start.format( LogbookController.DateFormat );
            const lastDay = end.format( LogbookController.DateFormat );

            this.$http.get( "/api/CalendarEvent?startDate=" + firstDay + "&endDate=" + lastDay ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<CalendarEvent[]> ) =>
                {
                    var associationEvents: uiCalendarEntry[] = [];

                    this.isLoadingCalendarEvents = false;

                    _.each( httpResponse.data, ( entry: CalendarEvent ) =>
                    {
                        const utcEventDate = moment.utc( entry.eventDateUtc );
                        const utcTimeOnly = utcEventDate.format( LogbookController.TimeFormat );
                        const isAllDay = utcTimeOnly == LogbookController.NoTime;

                        let dateEntry: Date;
                        if( isAllDay )
                        {
                            entry.timeOnly = "";
                            entry.dateOnly = new Date( utcEventDate.year(), utcEventDate.month(), utcEventDate.date() );
                            dateEntry = entry.dateOnly;
                        }
                        else
                        {
                            const localDate = moment.utc( entry.eventDateUtc ).local();
                            entry.timeOnly = localDate.format( LogbookController.TimeFormat );
                            entry.dateOnly = localDate.clone().startOf( 'day' ).toDate();
                            dateEntry = localDate.toDate();
                        }

                        var shortText = entry.title;
                        if( shortText && shortText.length > 10 )
                            shortText = shortText.substring( 0, 10 ) + "...";

                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.title + "</p>";

                        associationEvents.push( {
                            title: shortText,
                            start: dateEntry,
                            toolTipTitle: "Event",
                            fullDescription: fullDescription,
                            calendarEventObject: entry,
                            allDay: isAllDay
                        } );
                    } );

                    callback( associationEvents );
                },
                () =>
                {
                    this.isLoadingCalendarEvents = false;
                }
            );
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks a user in the calendar event modal
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onResidentClicked( resident: FellowChtnResident )
        {
            if( !resident.hasEmail )
            {
                alert( "That user cannot be included because they do not have an email address on file." );
                resident.isAssociated = false;
                return;
            }

            const alreadyExists = _.contains( this.editEvent.associatedUserIds, resident.userId );

            if( alreadyExists )
                this.editEvent.associatedUserIds = _.without( this.editEvent.associatedUserIds, resident.userId );
            else
                this.editEvent.associatedUserIds.push( resident.userId );
        }


        /**
         * Used to determine if the given event is in the past and if allow notifications to be
         * sent. Events in the past can't have notifications sent since there's no point.
         */
        isDateInPast( calendarEvent: CalendarEvent ): boolean
        {
            if( !calendarEvent )
                return false;

            let testDate = calendarEvent.dateOnly;
            if( calendarEvent.repeatRule )
            {
                // If this event never ends then we can always enable notifications
                if( !calendarEvent.repeatUntilDate )
                    return false;

                testDate = calendarEvent.repeatUntilDate;
            }

            const momentDate = moment( testDate );
            const today = moment();
            return momentDate.isBefore( today, 'day' ) || momentDate.isSame( today, 'day' );
        }


        onShouldSendChange()
        {
            // Don't allow the user to send remdiner emails for past dates
            if( this.editEvent.shouldSendNotification && this.isDateInPast( this.editEvent ) )
                this.editEvent.shouldSendNotification = false;
            else if( !this.editEvent.notificationEmailDaysBefore )
                this.editEvent.notificationEmailDaysBefore = 1;
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user changes the "days before" email setting
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onChangeEmailDaysBefore()
        {
            const notificationDate = moment( this.editEvent.dateOnly ).subtract( this.editEvent.notificationEmailDaysBefore, 'day' );
            const today = moment();
            this.showBadNotificationDateWarning = notificationDate.isBefore( today, 'day' ) || notificationDate.isSame( today, 'day' );

            if( this.showBadNotificationDateWarning )
            {
                this.maxDaysBack = moment( this.editEvent.dateOnly ).diff( today, 'day' );
                this.editEvent.notificationEmailDaysBefore = this.maxDaysBack;

                this.$timeout( function() { this.showBadNotificationDateWarning = false; }, 10000 );
            }
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Show the full calendar event edit modal
        ///////////////////////////////////////////////////////////////////////////////////////////////
        expandCalendarEventModel()
        {
            this.showExpandedCalendarEventModel = true;

            this.hookUpWysiwyg();
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Wire up the WYSIWYG description editor
        ///////////////////////////////////////////////////////////////////////////////////////////////
        hookUpWysiwyg()
        {
            this.$timeout( () =>
            {
                HtmlUtil2.initTinyMce( "tiny-mce-editor", 200, { menubar: false, toolbar: "styleselect | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent link | code" } ).then( e =>
                {
                    this.tinyMceEditor = e;

                    if( this.tinyMceEditor )
                    {
                        if( this.editEvent && this.editEvent.description )
                            this.tinyMceEditor.setContent( this.editEvent.description );
                        else
                            this.tinyMceEditor.setContent( "" );
                    }
                } );
            }, 100 );
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
        setEditEvent( eventObject: CalendarEvent|null, showDetails: boolean )
        {
            this.showExpandedCalendarEventModel = showDetails || false;
            this.editEvent = eventObject;

            // Make sure both modals can't be opened at the same time
            this.viewEvent = null;

            // Clear this warning in case the user is clicking around quickly
            this.showBadNotificationDateWarning = false;

            if( this.editEvent )
            {
                // Simplify the UI logic by transforming this input
                if( this.residents )
                {
                    this.residents.forEach( r => r.isAssociated = false );
                    if( this.editEvent.associatedUserIds )
                        this.residents.filter( r => this.editEvent.associatedUserIds.indexOf( r.userId ) !== -1 ).forEach( r => r.isAssociated = true );
                }

                // Set the checked status for the associated groups
                if( this.editEvent.associatedGroupShortNames )
                {
                    this.associatedGroups.forEach( ag =>
                    {
                        ag.isAssociated = this.editEvent.associatedGroupShortNames.indexOf( ag.groupShortName ) !== -1;
                    } );
                }
                else
                    this.associatedGroups.forEach( ag => ag.isAssociated = false );

                this.editEvent.associatedGroupShortNames = this.associatedGroups.filter( ag => ag.isAssociated ).map( ag => ag.groupShortName );

                this.editEvent.shouldSendNotification = this.editEvent.notificationEmailDaysBefore !== null;

                // Ensure a valid repeat frequency
                if( this.editEvent.repeatRule )
                {
                    const parsedRule = new rrule.rrulestr( this.editEvent.repeatRule );
                    this.editEvent.repeatType = parsedRule.options.freq;
                    this.editEvent.repeatFrequency = parsedRule.options.interval;
                    
                    // If we're edting a repeat instance of an event, use the original date
                    if( this.editEvent.repeatOriginalDate )
                    {
                        this.editEvent.eventDateUtc = this.editEvent.repeatOriginalDate;
                        this.editEvent.dateOnly = moment( this.editEvent.eventDateUtc ).clone().startOf( 'day' ).toDate();
                    }
                }
                else
                {
                    this.editEvent.repeatType = null;
                    this.editEvent.repeatFrequency = 1;
                }

                // Set focus on the title so it's user friendly and ng-escape needs an input focused
                // to work
                setTimeout( function() { $( "#calendar-event-title" ).focus(); }, 10 );

                if( this.showExpandedCalendarEventModel )
                    this.hookUpWysiwyg();
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
                $( '#full-calendar-elem' ).fullCalendar( 'refetchEvents' );

            }, () =>
            {
                this.isLoadingCalendarEvents = false;
                alert( "Failed to delete the calendar event." );
            } );
        }


        private getDaysBeforeValue()
        {
            let daysBefore: number = null;
            // We need to handle strings or numbers for this property
            if( this.editEvent.notificationEmailDaysBefore !== null && this.editEvent.notificationEmailDaysBefore !== undefined )
            {
                if( typeof this.editEvent.notificationEmailDaysBefore === "string" )
                {
                    daysBefore = parseInt( this.editEvent.notificationEmailDaysBefore );
                    if( isNaN( daysBefore ) )
                        daysBefore = null;
                }
                else if( typeof this.editEvent.notificationEmailDaysBefore === "number" )
                    daysBefore = this.editEvent.notificationEmailDaysBefore;
            }

            if( daysBefore !== null && daysBefore < 0 )
                daysBefore = null;

            return daysBefore;
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Save the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        saveCalendarEvent()
        {
            if( !HtmlUtil2.isValidString( this.editEvent.title ) )
            {
                alert( "Please enter a title in the 'what' field" );
                return;
            }

            if( this.tinyMceEditor )
                this.editEvent.description = this.tinyMceEditor.getContent();

            // Ensure the user enters a 'days before' email setting
            if( this.editEvent.shouldSendNotification )
            {
                const daysBefore = this.getDaysBeforeValue();
                if( daysBefore === null )
                {
                    alert( "Please enter a valid number for the 'days before' email send date" );
                    return;
                }
            }

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

            this.editEvent.associatedGroupShortNames = this.associatedGroups.filter( ag => ag.isAssociated ).map( ag => ag.groupShortName );

            let httpFunc;
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
                $( '#full-calendar-elem' ).fullCalendar( 'refetchEvents' );

            }, ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoadingCalendarEvents = false;

                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert( "Failed to save the calendar event: " + errorMessage );
            } );
        }


        getNumSelectedIndividuals()
        {
            return this.residents.filter( r => r.isAssociated ).length;
        }


        getNumSelectedGroups()
        {
            return this.associatedGroups.filter( g => g.isAssociated ).length;
        }


        editViewingEvent()
        {
            this.setEditEvent( this.viewEvent, true );
        }


        onIcsFileSelected( icsFileEvent: any )
        {
            console.log( "In onIcsFileSelected", icsFileEvent.target.files[0] );

            const formData = new FormData();
            formData.append( "IcsFile", icsFileEvent.target.files[0] );

            this.isLoadingCalendarEvents = true;

            const postHeaders: ng.IRequestShortcutConfig = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };

            // Reset the file input so the user can choose the file again, if needed
            const clearFile = () => { ( document.getElementById( "ics-file-input" ) as HTMLInputElement ).value = null; };

            const createEvents = () =>
            {
                this.isLoadingCalendarEvents = true;

                this.$http.post( "/api/CalendarEvent/ImportIcs", formData, postHeaders ).then(
                    ( response: ng.IHttpPromiseCallbackArg<PreviewIcsResult> ) =>
                    {
                        this.isLoadingCalendarEvents = false;
                        clearFile();
                        this.onlyRefreshCalendarEvents = true;
                        $( '#full-calendar-elem' ).fullCalendar( 'refetchEvents' );
                    },
                    ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                    {
                        this.isLoadingCalendarEvents = false;
                        alert( "Failed to import file: " + response.data.exceptionMessage );

                        clearFile();
                    }
                );
            };

            this.$http.post( "/api/CalendarEvent/PreviewIcs", formData, postHeaders ).then(
                ( response: ng.IHttpPromiseCallbackArg<PreviewIcsResult> ) =>
                {
                    this.isLoadingCalendarEvents = false;

                    if( confirm( response.data.resultMessage ) )
                    {
                        createEvents();
                    }
                    else
                        clearFile();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoadingCalendarEvents = false;
                    alert( "Failed to parse file: " + response.data.exceptionMessage );

                    clearFile();
                }
            );
        }


        onRepeatSettingChange()
        {
            const repeatRule = this.getRepeatRule();

            if( repeatRule )
                this.editEvent.repeatRule = repeatRule.toString();
            else
                this.editEvent.repeatRule = null;
        }

        
        getRepeatRule()
        {
            if( !this.editEvent || this.editEvent.repeatType === null )
                return null;

            let rruleRepeatType: number;
            rruleRepeatType = this.editEvent.repeatType;
            //if( this.editEvent.repeatType === "daily" )
            //    rruleRepeatType = rrule.RRule.DAILY; // 3
            //else if( this.editEvent.repeatType === "weekly" )
            //    rruleRepeatType = rrule.RRule.WEEKLY; // 2
            //else if( this.editEvent.repeatType === "monthly" )
            //    rruleRepeatType = rrule.RRule.MONTHLY; // 1
            //else if( this.editEvent.repeatType === "yearly" )
            //    rruleRepeatType = rrule.RRule.YEARLY;
            //else
            //    return null;

            const dateTimeString = moment( this.editEvent.dateOnly ).format( LogbookController.DateFormat ) + " " + this.editEvent.timeOnly;
            this.editEvent.eventDateUtc = moment( dateTimeString, LogbookController.DateFormat + " " + LogbookController.TimeFormat ).utc().toDate();

            const rule = new rrule.RRule( {
                freq: rruleRepeatType,
                interval: this.editEvent.repeatFrequency || 1,
                //byweekday: [RRule.MO, RRule.FR],
                dtstart: this.editEvent.eventDateUtc,
                until: this.editEvent.repeatUntilDate
            } );
            
            //const result = new rrule.rrulestr( "FREQ=YEARLY;UNTIL=99991231T235959;BYDAY=4TH;BYMONTH=11" );
            return rule;
        }


        getRepeatDatePreview()
        {
            const repeatRule = this.getRepeatRule();
            repeatRule.options.count = 10;

            const occuranceDates: Date[] = repeatRule.all();
            const dateStrings = occuranceDates.map( od => moment( od ).format( "ddd, MMM D YYYY, h:mm:ssa" ) );

            return dateStrings.join( "\n" );
        }
    }


    class PreviewIcsResult
    {
        resultMessage: string;
        numEvents: number;
    }

    class AssociatedGroup
    {
        groupShortName: string;
        displayLabel: string;
        isAssociated: boolean;
    }


    interface uiCalendarEntry
    {
        title: string;
        start: Date;
        toolTipTitle: string;
        fullDescription: string;
        calendarEventObject: CalendarEvent;
        allDay: boolean;
    }


    class CalendarEvent
    {
        eventId: number;
        eventDateUtc: Date;
        title: string;
        description: string;
        notificationEmailDaysBefore: number | null;
        groupId: number;
        authorUserId: string;
        authorName: string;
        postDate: string;
        associatedUserIds: string[];
        associatedGroupShortNames: string[];
        additionalEmailsString: string;
        calendarEventId: string;
        emailGroupShortName: string;
        repeatRule: string;
        repeatUntilDate: Date | null;
        repeatOriginalDate: Date | null;

        // Not from server, used locally
        timeOnly: string;
        dateOnly: Date;
        shouldSendNotification: boolean;
        //repeatType: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
        repeatType: 0 | 1 | 2 | 3 | null;
        repeatFrequency: number;
        repeatViewLabel: string;
    }
}


CA.angularApp.component( "logbookPage", {
    templateUrl: "/ngApp/chtn/member/logbook.html",
    controller: Ally.LogbookController
} );
var Ally;
(function (Ally) {
    /**
     * The controller for the page that lets users view a calender of events
     */
    class LogbookController {
        //static NoTime = "12:37am";
        /**
         * The constructor for the class
         */
        constructor($scope, $timeout, $http, $rootScope, $q, fellowResidents, siteInfo) {
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$q = $q;
            this.fellowResidents = fellowResidents;
            this.siteInfo = siteInfo;
            this.viewEvent = null;
            this.showBadNotificationDateWarning = false;
            this.isLoadingNews = false;
            this.isLoadingLogbookForCalendar = false;
            this.isLoadingPolls = false;
            this.isLoadingCalendarEvents = false;
            this.isLoadingAmenities = false;
            this.isLoadingBulletinBoardEvents = false;
            this.onlyRefreshCalendarEvents = false;
            this.showExpandedCalendarEventModel = false;
            this.currentTimeZoneAbbreviation = "CT";
            this.localTimeZoneDiffersFromGroup = false;
            this.descriptionText = "";
            this.associatedGroups = [];
            this.canEditEvents = false;
            this.reservableAmenities = [];
            this.GroupShortNameIndividuals = "Individuals";
            ///////////////////////////////////////////////////////////////////////////////////////////////
            // Hide the read-only calendar event view
            ///////////////////////////////////////////////////////////////////////////////////////////////
            this.clearViewEvent = function () {
                this.viewEvent = null;
            };
        }
        static getTimezoneAbbreviation(timeZoneIana = null, privateSiteInfo = null) {
            // Need to cast moment to any because we don't have the tz typedef file
            const tempMoment = moment();
            if (!timeZoneIana)
                timeZoneIana = moment.tz.guess();
            const timeZoneInfo = tempMoment.tz(timeZoneIana);
            const timeZoneAbbreviation = timeZoneInfo.format('z');
            let shouldShortenAbbreviation = true;
            if (privateSiteInfo && privateSiteInfo.groupAddress) {
                // Only shorten for US groups
                if (!privateSiteInfo.country || privateSiteInfo.country !== "US")
                    shouldShortenAbbreviation = false;
                else {
                    // Arizona and Hawaii don't use daylight savings
                    const isNonDstState = ["HI", "AZ"].includes(privateSiteInfo.groupAddress.state);
                    if (isNonDstState)
                        shouldShortenAbbreviation = false;
                }
            }
            // Drop the daylight savings time (DST) info to avoid confusion with users
            if (shouldShortenAbbreviation) {
                if (timeZoneAbbreviation === "EST" || timeZoneAbbreviation === "EDT")
                    return "ET";
                else if (timeZoneAbbreviation === "CST" || timeZoneAbbreviation === "CDT")
                    return "CT";
                else if (timeZoneAbbreviation === "MST" || timeZoneAbbreviation === "MDT")
                    return "MT";
                else if (timeZoneAbbreviation === "PST" || timeZoneAbbreviation === "PDT")
                    return "PT";
            }
            return timeZoneAbbreviation;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.currentTimeZoneAbbreviation = LogbookController.getTimezoneAbbreviation(null, this.siteInfo.privateSiteInfo);
            this.canEditEvents = this.siteInfo.userInfo.isSiteManager;
            if (this.siteInfo.privateSiteInfo.groupAddress && this.siteInfo.privateSiteInfo.groupAddress.timeZoneIana) {
                this.groupTimeZoneAbbreviation = LogbookController.getTimezoneAbbreviation(this.siteInfo.privateSiteInfo.groupAddress.timeZoneIana, this.siteInfo.privateSiteInfo);
                if (this.groupTimeZoneAbbreviation != this.currentTimeZoneAbbreviation)
                    this.localTimeZoneDiffersFromGroup = true;
            }
            if (AppConfig.isChtnSite) {
                this.fellowResidents.getResidents().then((residents) => {
                    this.residents = residents;
                    this.residents = _.sortBy(this.residents, r => r.fullName.toUpperCase());
                    this.residents.forEach(r => {
                        // TODO include the home address in the drop down to distinguish between residents with the same name
                        //if( r.homes && r.homes.length > 0 )
                        //{
                        //    //const home = residents.h
                        //    r.dropDownAdditionalLabel = ` (${r.homes[0].})`;
                        //}
                        if (r.email) {
                            //const home = residents.h
                            r.dropDownAdditionalLabel = ` (${r.email})`;
                        }
                    });
                });
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
                viewRender: (view, element) => {
                    $(element).css("cursor", "pointer");
                },
                dayClick: (date) => {
                    if (!this.$rootScope.isSiteManager)
                        return;
                    // The date is wrong if time zone is considered
                    const clickedDate = moment(date.format(LogbookController.DateFormat)).toDate();
                    this.$scope.$apply(() => {
                        const maxDaysBack = null; //3;
                        //if( moment( clickedDate ).subtract( maxDaysBack, 'day' ).isBefore( moment() ) )
                        //    maxDaysBack = moment( clickedDate ).diff( moment(), 'day' );
                        const eventDetails = new CalendarEvent();
                        eventDetails.dateOnly = clickedDate;
                        eventDetails.associatedUserIds = [];
                        eventDetails.notificationEmailDaysBefore = maxDaysBack;
                        eventDetails.repeatType = null;
                        eventDetails.repeatFrequency = 1;
                        this.setEditEvent(eventDetails, false);
                    });
                },
                eventClick: (event) => {
                    this.$scope.$apply(() => {
                        if (event.calendarEventObject) {
                            this.viewEvent = event.calendarEventObject;
                            if (this.viewEvent.repeatRule) {
                                const parsedRule = new rrule.rrulestr(this.viewEvent.repeatRule);
                                this.viewEvent.repeatViewLabel = "Every ";
                                if (parsedRule.options.interval > 1)
                                    this.viewEvent.repeatViewLabel += parsedRule.options.interval + " ";
                                if (parsedRule.options.freq === rrule.RRule.DAILY)
                                    this.viewEvent.repeatViewLabel += "day";
                                else if (parsedRule.options.freq === rrule.RRule.WEEKLY)
                                    this.viewEvent.repeatViewLabel += "week";
                                else if (parsedRule.options.freq === rrule.RRule.MONTHLY)
                                    this.viewEvent.repeatViewLabel += "month";
                                else if (parsedRule.options.freq === rrule.RRule.YEARLY)
                                    this.viewEvent.repeatViewLabel += "year";
                                if (parsedRule.options.interval > 1)
                                    this.viewEvent.repeatViewLabel += "s";
                                if (this.viewEvent.repeatUntilDate)
                                    this.viewEvent.repeatViewLabel += " until " + moment(this.viewEvent.repeatUntilDate).format("MMM D, YYYY");
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
                        // Otherwise there is nothing to open
                        else {
                            // On mobile, don't show an alert as tapping will show the hover info, so only alert on desktop
                            if (!Ally.HtmlUtil2.isOnMobileDevice())
                                alert("This is an informational entry that does not have data to display");
                        }
                    });
                },
                eventRender: (event, element) => {
                    //$( element ).css( "cursor", "default" );
                    $(element).qtip({
                        style: {
                            classes: 'qtip-light qtip-shadow'
                        },
                        content: {
                            text: event.fullDescription,
                            title: event.toolTipTitle
                        }
                    });
                },
                eventSources: [
                    {
                        events: (start, end, timezone, callback) => {
                            this.getAssociationEvents(start, end, timezone, callback);
                        }
                    },
                    {
                        events: (start, end, timezone, callback) => {
                            this.getCalendarEvents(start, end, timezone, callback);
                        }
                    }
                ]
            };
            $(document).ready(function () {
                $('.EditableEntry').editable('<%= Request.Url %>', {
                    id: 'EditEntryId',
                    type: 'textarea',
                    cancel: 'Cancel',
                    submit: 'Ok'
                });
                //$( ".collapsibleContainer" ).collapsiblePanel();
                $('#full-calendar-elem').fullCalendar(uiConfig);
                $('#calendar-event-time').timepicker({ 'scrollDefault': '10:00am' });
                $(".fc-bg td.fc-today").append("<div class='today-note'>Today</div>");
            });
            this.fellowResidents.getGroupEmailObject().then((emailList) => {
                this.associatedGroups = emailList.map(e => {
                    const isCustomRecipientGroup = e.recipientType.toUpperCase() === Ally.FellowResidentsService.CustomRecipientType;
                    return {
                        groupShortName: isCustomRecipientGroup ? ("custom:" + e.recipientTypeName) : e.recipientType,
                        displayLabel: e.displayName,
                        isAssociated: false
                    };
                });
                this.associatedGroups.push({ displayLabel: this.GroupShortNameIndividuals, groupShortName: this.GroupShortNameIndividuals, isAssociated: false });
            });
            // Delay a little to speed up the UI
            this.$timeout(() => this.loadReservableAmenities(), 100);
        }
        getAllEvents(startDate, endDate) {
            const shouldLoadNewsToCalendar = false;
            const shouldLoadLogbookToCalendar = false;
            const shouldLoadPollsToCalendar = AppConfig.isChtnSite;
            const firstDay = startDate.format(LogbookController.DateFormat);
            const lastDay = endDate.format(LogbookController.DateFormat);
            const newsDeferred = this.$q.defer();
            const logbookDeferred = this.$q.defer();
            const pollDeferred = this.$q.defer();
            const bulletinBoardEventsDeferred = this.$q.defer();
            if (shouldLoadNewsToCalendar) {
                this.isLoadingNews = true;
                this.$http.get("/api/News/WithinDates?startDate=" + firstDay + "&endDate=" + lastDay).then((httpResponse) => {
                    const newsData = httpResponse.data;
                    this.isLoadingNews = false;
                    _.each(newsData, function (entry) {
                        let shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        const fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        this.calendarEvents.push({
                            title: "Notice: " + shortText,
                            start: moment(entry.postDate).toDate(),
                            toolTipTitle: "Notice Added",
                            fullDescription: fullDescription
                        });
                    });
                    newsDeferred.resolve();
                }, () => {
                    this.isLoadingNews = false;
                    newsDeferred.resolve();
                });
            }
            else
                newsDeferred.resolve();
            if (shouldLoadLogbookToCalendar) {
                this.isLoadingLogbookForCalendar = true;
                this.$http.get("/api/Logbook?startDate=" + firstDay + "&endDate=" + lastDay).then((httpResponse) => {
                    const calendarEvents = httpResponse.data;
                    this.isLoadingLogbookForCalendar = false;
                    _.each(calendarEvents, function (entry) {
                        let shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        const fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        this.calendarEvents.push({
                            title: "Logbook: " + shortText,
                            start: moment(entry.postDate).format("YYYY-MM-DD"),
                            toolTipTitle: "Logbook Entry Added",
                            fullDescription: fullDescription
                        });
                    });
                    logbookDeferred.resolve();
                }, () => {
                    this.isLoadingLogbookForCalendar = false;
                    logbookDeferred.resolve();
                });
            }
            else
                logbookDeferred.resolve();
            if (shouldLoadPollsToCalendar) {
                this.isLoadingPolls = true;
                this.$http.get("/api/Poll/DateRange?startDate=" + firstDay + "&endDate=" + lastDay).then((httpResponse) => {
                    const pollData = httpResponse.data;
                    this.isLoadingPolls = false;
                    _.each(pollData, (entry) => {
                        let shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        const fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        this.calendarEvents.push({
                            title: "Poll: " + shortText,
                            start: moment(entry.postDate).toDate(),
                            calendarEventObject: null,
                            toolTipTitle: "Poll Added",
                            fullDescription: fullDescription,
                            allDay: false
                        });
                    });
                    pollDeferred.resolve();
                }, () => {
                    this.isLoadingPolls = false;
                    pollDeferred.resolve();
                });
            }
            else
                pollDeferred.resolve();
            this.isLoadingBulletinBoardEvents = true;
            this.$http.get("/api/CommentThread/BulletinBoard/EventsOnly?startDate=" + firstDay + "&endDate=" + lastDay).then((httpResponse) => {
                const postData = httpResponse.data;
                this.isLoadingBulletinBoardEvents = false;
                _.each(postData, (entry) => {
                    let shortText = entry.title;
                    if (shortText.length > 10)
                        shortText = shortText.substring(0, 10) + "...";
                    let fullDescription = `Posted by: ${entry.authorFullName}<br>Name: ${entry.title}`;
                    if (entry.eventLocationText)
                        fullDescription += "<br><p>Location: " + entry.eventLocationText + "</p>";
                    this.calendarEvents.push({
                        title: "Post: " + shortText,
                        start: moment(entry.eventDateUtc).toDate(),
                        calendarEventObject: null,
                        toolTipTitle: "Bulletin Board Event Post Added",
                        fullDescription: fullDescription,
                        allDay: false
                    });
                });
                bulletinBoardEventsDeferred.resolve();
            }, () => {
                this.isLoadingBulletinBoardEvents = false;
                bulletinBoardEventsDeferred.resolve();
            });
            return this.$q.all([newsDeferred.promise, logbookDeferred.promise, pollDeferred.promise, bulletinBoardEventsDeferred.promise]);
        }
        getAssociationEvents(start, end, timezone, callback) {
            if (this.onlyRefreshCalendarEvents) {
                this.onlyRefreshCalendarEvents = undefined;
                callback(this.calendarEvents);
                return;
            }
            this.calendarEvents = [];
            this.getAllEvents(start, end).then(() => {
                callback(this.calendarEvents);
            });
        }
        getCalendarEvents(start, end, timezone, callback) {
            this.isLoadingCalendarEvents = true;
            const firstDay = start.format(LogbookController.DateFormat);
            const lastDay = end.format(LogbookController.DateFormat);
            this.$http.get("/api/CalendarEvent?startDate=" + firstDay + "&endDate=" + lastDay).then((httpResponse) => {
                this.isLoadingCalendarEvents = false;
                const associationEvents = this.prepEventObjectData(httpResponse.data);
                callback(associationEvents);
            }, () => {
                this.isLoadingCalendarEvents = false;
            });
        }
        prepEventObjectData(calendarEvents) {
            const associationEvents = [];
            _.each(calendarEvents, (entry) => {
                const utcEventDate = moment(entry.eventDateUtc);
                //const utcTimeOnly = utcEventDate.format( LogbookController.TimeFormat );
                const isAllDay = !entry.hasTimeComponent; // utcTimeOnly == LogbookController.NoTime;
                let dateEntry;
                if (isAllDay) {
                    entry.timeOnly = "";
                    entry.calLinkStartTimeOnly = "00:01";
                    entry.calLinkEndTimeOnly = "23:59";
                    entry.dateOnly = new Date(utcEventDate.year(), utcEventDate.month(), utcEventDate.date());
                    dateEntry = entry.dateOnly;
                }
                else {
                    const localDate = moment(entry.eventDateUtc).local();
                    entry.timeOnly = localDate.format(LogbookController.TimeFormat);
                    entry.calLinkStartTimeOnly = localDate.format("HH:mm");
                    ;
                    entry.calLinkEndTimeOnly = localDate.clone().add(1, 'hours').format("HH:mm");
                    ;
                    entry.dateOnly = localDate.clone().startOf('day').toDate();
                    dateEntry = localDate.toDate();
                }
                let shortText = entry.title;
                if (shortText && shortText.length > 10)
                    shortText = shortText.substring(0, 10) + "...";
                const fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.title + "</p>";
                associationEvents.push({
                    title: shortText,
                    start: dateEntry,
                    toolTipTitle: "Event",
                    fullDescription: fullDescription,
                    calendarEventObject: entry,
                    allDay: isAllDay
                });
            });
            return associationEvents;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks a user in the calendar event modal
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onResidentClicked(resident) {
            if (!resident.hasEmail) {
                alert("That user cannot be included because they do not have an email address on file.");
                resident.isAssociated = false;
                return;
            }
            const alreadyExists = _.contains(this.editEvent.associatedUserIds, resident.userId);
            if (alreadyExists)
                this.editEvent.associatedUserIds = _.without(this.editEvent.associatedUserIds, resident.userId);
            else
                this.editEvent.associatedUserIds.push(resident.userId);
        }
        /**
         * Used to determine if the given event is in the past and if allow notifications to be
         * sent. Events in the past can't have notifications sent since there's no point.
         */
        isDateInPast(calendarEvent) {
            if (!calendarEvent)
                return false;
            let testDate = calendarEvent.dateOnly;
            if (calendarEvent.repeatRule) {
                // If this event never ends then we can always enable notifications
                if (!calendarEvent.repeatUntilDate)
                    return false;
                testDate = calendarEvent.repeatUntilDate;
            }
            const momentDate = moment(testDate);
            const today = moment();
            return momentDate.isBefore(today, 'day') || momentDate.isSame(today, 'day');
        }
        onShouldSendChange() {
            // Don't allow the user to send remdiner emails for past dates
            if (this.editEvent.shouldSendNotification && this.isDateInPast(this.editEvent))
                this.editEvent.shouldSendNotification = false;
            else if (!this.editEvent.notificationEmailDaysBefore)
                this.editEvent.notificationEmailDaysBefore = 1;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user changes the "days before" email setting
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onChangeEmailDaysBefore() {
            const notificationDate = moment(this.editEvent.dateOnly).subtract(this.editEvent.notificationEmailDaysBefore, 'day');
            const today = moment();
            this.showBadNotificationDateWarning = notificationDate.isBefore(today, 'day') || notificationDate.isSame(today, 'day');
            if (this.showBadNotificationDateWarning) {
                this.maxDaysBack = moment(this.editEvent.dateOnly).diff(today, 'day');
                this.editEvent.notificationEmailDaysBefore = this.maxDaysBack;
                this.$timeout(function () { this.showBadNotificationDateWarning = false; }, 10000);
            }
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Show the full calendar event edit modal
        ///////////////////////////////////////////////////////////////////////////////////////////////
        expandCalendarEventModel() {
            this.showExpandedCalendarEventModel = true;
            this.hookUpWysiwyg();
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Wire up the WYSIWYG description editor
        ///////////////////////////////////////////////////////////////////////////////////////////////
        hookUpWysiwyg() {
            this.$timeout(() => {
                Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 200, { menubar: false, toolbar: "styleselect | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent link | code" }).then(e => {
                    this.tinyMceEditor = e;
                    if (this.tinyMceEditor) {
                        if (this.editEvent && this.editEvent.description)
                            this.tinyMceEditor.setContent(this.editEvent.description);
                        else
                            this.tinyMceEditor.setContent("");
                    }
                });
            }, 100);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Set the calendar event for us to edit
        ///////////////////////////////////////////////////////////////////////////////////////////////
        setEditEvent(eventObject, showDetails) {
            this.showExpandedCalendarEventModel = showDetails || false;
            this.editEvent = eventObject;
            // Make sure both modals can't be opened at the same time
            this.viewEvent = null;
            // Clear this warning in case the user is clicking around quickly
            this.showBadNotificationDateWarning = false;
            if (this.editEvent) {
                // Simplify the UI logic by transforming this input
                if (this.residents) {
                    this.residents.forEach(r => r.isAssociated = false);
                    if (this.editEvent.associatedUserIds)
                        this.residents.filter(r => this.editEvent.associatedUserIds.indexOf(r.userId) !== -1).forEach(r => r.isAssociated = true);
                }
                // Set the checked status for the associated groups
                if (this.editEvent.associatedGroupShortNames) {
                    this.associatedGroups.forEach(ag => {
                        ag.isAssociated = this.editEvent.associatedGroupShortNames.indexOf(ag.groupShortName) !== -1;
                    });
                }
                else
                    this.associatedGroups.forEach(ag => ag.isAssociated = false);
                this.editEvent.associatedGroupShortNames = this.associatedGroups.filter(ag => ag.isAssociated).map(ag => ag.groupShortName);
                this.editEvent.shouldSendNotification = this.editEvent.notificationEmailDaysBefore !== null;
                // Ensure a valid repeat frequency
                if (this.editEvent.repeatRule) {
                    const parsedRule = new rrule.rrulestr(this.editEvent.repeatRule);
                    this.editEvent.repeatType = parsedRule.options.freq;
                    this.editEvent.repeatFrequency = parsedRule.options.interval;
                    // If we're edting a repeat instance of an event, use the original date
                    if (this.editEvent.repeatOriginalDate) {
                        this.editEvent.eventDateUtc = this.editEvent.repeatOriginalDate;
                        this.editEvent.dateOnly = moment(this.editEvent.eventDateUtc).clone().startOf('day').toDate();
                    }
                }
                else {
                    this.editEvent.repeatType = null;
                    this.editEvent.repeatFrequency = 1;
                }
                // Set focus on the title so it's user friendly and ng-escape needs an input focused
                // to work
                setTimeout(function () { $("#calendar-event-title").focus(); }, 10);
                if (this.showExpandedCalendarEventModel)
                    this.hookUpWysiwyg();
            }
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Delete the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        deleteCalendarEvent(eventId) {
            if (!confirm("Are you sure you want to remove this event?"))
                return;
            this.isLoadingCalendarEvents = true;
            this.$http.delete("/api/CalendarEvent?eventId=" + eventId).then(() => {
                this.isLoadingCalendarEvents = false;
                this.editEvent = null;
                this.onlyRefreshCalendarEvents = true;
                $('#full-calendar-elem').fullCalendar('refetchEvents');
                // Delay a little to speed up the UI
                this.$timeout(() => this.getUpcomingAmenityEvents(), 100);
            }, () => {
                this.isLoadingCalendarEvents = false;
                alert("Failed to delete the calendar event.");
            });
        }
        getDaysBeforeValue() {
            let daysBefore = null;
            // We need to handle strings or numbers for this property
            if (this.editEvent.notificationEmailDaysBefore !== null && this.editEvent.notificationEmailDaysBefore !== undefined) {
                if (typeof this.editEvent.notificationEmailDaysBefore === "string") {
                    daysBefore = parseInt(this.editEvent.notificationEmailDaysBefore);
                    if (isNaN(daysBefore))
                        daysBefore = null;
                }
                else if (typeof this.editEvent.notificationEmailDaysBefore === "number")
                    daysBefore = this.editEvent.notificationEmailDaysBefore;
            }
            if (daysBefore !== null && daysBefore < 0)
                daysBefore = null;
            return daysBefore;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Save the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        saveCalendarEvent() {
            if (!Ally.HtmlUtil2.isValidString(this.editEvent.title)) {
                alert("Please enter a title in the 'what' field");
                return;
            }
            if (this.tinyMceEditor)
                this.editEvent.description = this.tinyMceEditor.getContent();
            // Ensure the user enters a 'days before' email setting
            if (this.editEvent.shouldSendNotification) {
                const daysBefore = this.getDaysBeforeValue();
                if (daysBefore === null) {
                    alert("Please enter a valid number for the 'days before' email send date");
                    return;
                }
            }
            // Build the list of the associated users
            if (this.residents) {
                const associatedUsers = _.filter(this.residents, function (r) { return r.isAssociated; });
                this.editEvent.associatedUserIds = _.map(associatedUsers, function (r) { return r.userId; });
            }
            let dateTimeString = "";
            if (typeof (this.editEvent.timeOnly) === "string" && this.editEvent.timeOnly.length > 1) {
                dateTimeString = moment(this.editEvent.dateOnly).format(LogbookController.DateFormat) + " " + this.editEvent.timeOnly;
                this.editEvent.eventDateUtc = moment(dateTimeString, LogbookController.DateFormat + " " + LogbookController.TimeFormat).utc().toDate();
                this.editEvent.hasTimeComponent = true;
            }
            else {
                dateTimeString = moment(this.editEvent.dateOnly).format(LogbookController.DateFormat) + " 12:00pm"; // Use 12pm so it's on the correct day no matter the time zone, LogbookController.NoTime
                this.editEvent.eventDateUtc = moment.utc(dateTimeString, LogbookController.DateFormat + " " + LogbookController.TimeFormat).toDate();
                this.editEvent.hasTimeComponent = false;
            }
            if (!this.editEvent.shouldSendNotification)
                this.editEvent.notificationEmailDaysBefore = null;
            // Ensure we're not allowing amenity reservations with repeating events
            if (this.editEvent.repeatType) {
                this.editEvent.reservableAmenityId = null;
                this.editEvent.amenityReservedForUserId = null;
            }
            // Build the list of group emails to notify
            this.editEvent.associatedGroupShortNames = this.associatedGroups.filter(ag => ag.isAssociated).map(ag => ag.groupShortName);
            const httpFunc = this.editEvent.eventId ? this.$http.put : this.$http.post;
            analytics.track("addCalendarEvent");
            this.isLoadingCalendarEvents = true;
            httpFunc("/api/CalendarEvent", this.editEvent).then(() => {
                this.isLoadingCalendarEvents = false;
                this.editEvent = null;
                this.onlyRefreshCalendarEvents = true;
                $('#full-calendar-elem').fullCalendar('refetchEvents');
                // Refresh the upcoming events, delay a little to speed up the UI
                this.$timeout(() => this.getUpcomingAmenityEvents(), 100);
            }, (httpResponse) => {
                this.isLoadingCalendarEvents = false;
                const errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to save the calendar event: " + errorMessage);
            });
        }
        getNumSelectedIndividuals() {
            return this.residents.filter(r => r.isAssociated).length;
        }
        getNumSelectedGroups() {
            return this.associatedGroups.filter(g => g.isAssociated).length;
        }
        editViewingEvent() {
            this.setEditEvent(this.viewEvent, true);
        }
        onIcsFileSelected(icsFileEvent) {
            console.log("In onIcsFileSelected", icsFileEvent.target.files[0]);
            const formData = new FormData();
            formData.append("IcsFile", icsFileEvent.target.files[0]);
            this.isLoadingCalendarEvents = true;
            const postHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            // Reset the file input so the user can choose the file again, if needed
            const clearFile = () => { document.getElementById("ics-file-input").value = null; };
            const createEvents = () => {
                this.isLoadingCalendarEvents = true;
                this.$http.post("/api/CalendarEvent/ImportIcs", formData, postHeaders).then(() => // response: ng.IHttpPromiseCallbackArg<PreviewIcsResult> ) =>
                 {
                    this.isLoadingCalendarEvents = false;
                    clearFile();
                    this.onlyRefreshCalendarEvents = true;
                    $('#full-calendar-elem').fullCalendar('refetchEvents');
                }, (response) => {
                    this.isLoadingCalendarEvents = false;
                    alert("Failed to import file: " + response.data.exceptionMessage);
                    clearFile();
                });
            };
            this.$http.post("/api/CalendarEvent/PreviewIcs", formData, postHeaders).then((response) => {
                this.isLoadingCalendarEvents = false;
                if (confirm(response.data.resultMessage)) {
                    createEvents();
                }
                else
                    clearFile();
            }, (response) => {
                this.isLoadingCalendarEvents = false;
                alert("Failed to parse file: " + response.data.exceptionMessage);
                clearFile();
            });
        }
        onRepeatSettingChange() {
            const repeatRule = this.getRepeatRule();
            if (repeatRule)
                this.editEvent.repeatRule = repeatRule.toString();
            else
                this.editEvent.repeatRule = null;
        }
        getRepeatRule() {
            if (!this.editEvent || this.editEvent.repeatType === null)
                return null;
            const rruleRepeatType = this.editEvent.repeatType;
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
            const dateTimeString = moment(this.editEvent.dateOnly).format(LogbookController.DateFormat) + " " + this.editEvent.timeOnly;
            this.editEvent.eventDateUtc = moment(dateTimeString, LogbookController.DateFormat + " " + LogbookController.TimeFormat).utc().toDate();
            const rule = new rrule.RRule({
                freq: rruleRepeatType,
                interval: this.editEvent.repeatFrequency || 1,
                //byweekday: [RRule.MO, RRule.FR],
                dtstart: this.editEvent.eventDateUtc,
                until: this.editEvent.repeatUntilDate
            });
            //const result = new rrule.rrulestr( "FREQ=YEARLY;UNTIL=99991231T235959;BYDAY=4TH;BYMONTH=11" );
            return rule;
        }
        getRepeatDatePreview() {
            const repeatRule = this.getRepeatRule();
            repeatRule.options.count = 10;
            const occuranceDates = repeatRule.all();
            const dateStrings = occuranceDates.map(od => moment(od).format("ddd, MMM D YYYY, h:mm:ssa"));
            return dateStrings.join("\n");
        }
        loadReservableAmenities() {
            this.$http.get("/api/CalendarEvent/GetReservableAmenities").then((httpResponse) => {
                this.reservableAmenities = httpResponse.data;
                // Delay a little to speed up the UI
                this.$timeout(() => this.getUpcomingAmenityEvents(), 100);
            }, (response) => {
                console.log("Failed to load reservable amenities", response.data.exceptionMessage);
            });
        }
        getUpcomingAmenityEvents() {
            if (!this.reservableAmenities || this.reservableAmenities.length === 0)
                return;
            this.$http.get("/api/CalendarEvent/UpcomingAmenityEvents").then((httpResponse) => {
                for (const curAmenity of this.reservableAmenities) {
                    curAmenity.upcomingEvents = httpResponse.data.filter(e => e.reservableAmenityId === curAmenity.reservableAmenityId);
                    //if( !curAmenity.upcomingEvents || curAmenity.upcomingEvents.length === 0 )
                    //    return;
                }
            }, (response) => {
                console.log("Failed to load reservable amenities", response.data.exceptionMessage);
            });
        }
        showAddReservableAmenityModal(selection = null) {
            if (selection)
                this.editReservableAmenity = _.clone(selection);
            else
                this.editReservableAmenity = new ReservableAmenity();
            window.setTimeout(() => document.getElementById("edit-amenity-name-input").focus(), 100);
        }
        deleteReservableAmenity(selection) {
            if (!selection || !confirm(`Are you sure you want to delete '${selection.amenityName}'?`))
                return;
            const onSaved = () => {
                this.editReservableAmenity = null;
                this.isLoadingAmenities = false;
                this.loadReservableAmenities();
            };
            const onError = (response) => {
                this.isLoadingAmenities = false;
                alert("Failed to delete amenity: " + response.data.exceptionMessage);
            };
            this.isLoadingAmenities = true;
            this.$http.delete("/api/CalendarEvent/DeleteReservableAmenity/" + selection.reservableAmenityId).then(onSaved, onError);
        }
        saveReservableAmenity() {
            const onSaved = () => {
                this.editReservableAmenity = null;
                this.isLoadingAmenities = false;
                this.loadReservableAmenities();
            };
            const onError = (response) => {
                this.isLoadingAmenities = false;
                alert("Failed to save amenity: " + response.data.exceptionMessage);
            };
            this.isLoadingAmenities = true;
            if (this.editReservableAmenity.reservableAmenityId)
                this.$http.put("/api/CalendarEvent/UpdateReservableAmenity", this.editReservableAmenity).then(onSaved, onError);
            else
                this.$http.post("/api/CalendarEvent/CreateReservableAmenity", this.editReservableAmenity).then(onSaved, onError);
        }
    }
    LogbookController.$inject = ["$scope", "$timeout", "$http", "$rootScope", "$q", "fellowResidents", "SiteInfo"];
    LogbookController.DateFormat = "YYYY-MM-DD";
    LogbookController.TimeFormat = "h:mma";
    Ally.LogbookController = LogbookController;
    class PreviewIcsResult {
    }
    class AssociatedGroup {
    }
    class CalendarEvent {
    }
    class ReservableAmenity {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("logbookPage", {
    templateUrl: "/ngApp/chtn/member/logbook.html",
    controller: Ally.LogbookController
});

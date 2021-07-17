var Ally;
(function (Ally) {
    /**
     * The controller for the page that lets users view a calender of events
     */
    var LogbookController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function LogbookController($scope, $timeout, $http, $rootScope, $q, fellowResidents, siteInfo) {
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$q = $q;
            this.fellowResidents = fellowResidents;
            this.siteInfo = siteInfo;
            this.showBadNotificationDateWarning = false;
            this.isLoadingNews = false;
            this.isLoadingLogbookForCalendar = false;
            this.isLoadingPolls = false;
            this.isLoadingCalendarEvents = false;
            this.onlyRefreshCalendarEvents = false;
            this.showExpandedCalendarEventModel = false;
            this.currentTimeZoneAbbreviation = "CT";
            this.localTimeZoneDiffersFromGroup = false;
            ///////////////////////////////////////////////////////////////////////////////////////////////
            // Occurs when the user clicks a user in the calendar event modal
            ///////////////////////////////////////////////////////////////////////////////////////////////
            this.onResidentClicked = function (resident) {
                if (!resident.hasEmail) {
                    alert("That user cannot be included because they do not have an e-mail address on file.");
                    resident.isAssociated = false;
                    return;
                }
                var alreadyExists = _.contains(this.editEvent.associatedUserIds, resident.userId);
                if (alreadyExists)
                    this.editEvent.associatedUserIds = _.without(this.editEvent.associatedUserIds, resident.userId);
                else
                    this.editEvent.associatedUserIds.push(resident.userId);
            };
            ///////////////////////////////////////////////////////////////////////////////////////////////
            // Hide the read-only calendar event view
            ///////////////////////////////////////////////////////////////////////////////////////////////
            this.clearViewEvent = function () {
                this.viewEvent = null;
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        LogbookController.prototype.$onInit = function () {
            var _this = this;
            var tempMoment = moment();
            var localTimeZone = moment.tz.guess();
            this.currentTimeZoneAbbreviation = tempMoment.tz(localTimeZone).format('z');
            if (this.siteInfo.privateSiteInfo.groupAddress && this.siteInfo.privateSiteInfo.groupAddress.timeZoneIana) {
                this.groupTimeZoneAbbreviation = tempMoment.tz(this.siteInfo.privateSiteInfo.groupAddress.timeZoneIana).format('z');
                if (this.groupTimeZoneAbbreviation != this.currentTimeZoneAbbreviation)
                    this.localTimeZoneDiffersFromGroup = true;
            }
            if (AppConfig.isChtnSite) {
                this.fellowResidents.getResidents().then(function (residents) {
                    _this.residents = residents;
                    _this.residents = _.sortBy(_this.residents, function (r) { return r.lastName; });
                });
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
                viewRender: function (view, element) {
                    $(element).css("cursor", "pointer");
                },
                dayClick: function (date) {
                    if (!innerThis.$rootScope.isSiteManager)
                        return;
                    // The date is wrong if time zone is considered
                    var clickedDate = moment(moment.utc(date).format(LogbookController.DateFormat)).toDate();
                    innerThis.$scope.$apply(function () {
                        var maxDaysBack = null; //3;
                        //if( moment( clickedDate ).subtract( maxDaysBack, 'day' ).isBefore( moment() ) )
                        //    maxDaysBack = moment( clickedDate ).diff( moment(), 'day' );
                        var eventDetails = {
                            date: clickedDate,
                            dateOnly: clickedDate,
                            associatedUserIds: [],
                            notificationEmailDaysBefore: maxDaysBack
                        };
                        innerThis.setEditEvent(eventDetails, false);
                    });
                },
                eventClick: function (event) {
                    innerThis.$scope.$apply(function () {
                        if (event.calendarEventObject) {
                            if (innerThis.$rootScope.isSiteManager)
                                innerThis.setEditEvent(event.calendarEventObject, true);
                            else
                                innerThis.viewEvent = event.calendarEventObject;
                        }
                    });
                },
                eventRender: function (event, element) {
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
                eventSources: [{
                        events: function (start, end, timezone, callback) {
                            innerThis.getAssociationEvents(start, end, timezone, callback);
                        }
                    },
                    {
                        events: function (start, end, timezone, callback) {
                            innerThis.getCalendarEvents(start, end, timezone, callback);
                        }
                    }]
            };
            $(document).ready(function () {
                $('.EditableEntry').editable('<%= Request.Url %>', {
                    id: 'EditEntryId',
                    type: 'textarea',
                    cancel: 'Cancel',
                    submit: 'Ok'
                });
                //$( ".collapsibleContainer" ).collapsiblePanel();
                $('#log-calendar').fullCalendar(uiConfig);
                $('#calendar-event-time').timepicker({ 'scrollDefault': '10:00am' });
                $(".fc-bg td.fc-today").append("<div class='today-note'>Today</div>");
            });
        };
        LogbookController.prototype.getAllEvents = function (startDate, endDate) {
            var _this = this;
            var loadNewsToCalendar = false;
            var loadLogbookToCalendar = true;
            var loadPollsToCalendar = AppConfig.isChtnSite;
            //var firstDay = moment().startOf( "month" ).format( DateFormat );
            //var lastDay = moment().add( 1, "month" ).startOf( "month" ).format( DateFormat );
            var firstDay = startDate.format(LogbookController.DateFormat);
            var lastDay = endDate.format(LogbookController.DateFormat);
            var newsDeferred = this.$q.defer();
            var logbookDeferred = this.$q.defer();
            var pollDeferred = this.$q.defer();
            if (loadNewsToCalendar) {
                this.isLoadingNews = true;
                var innerThis = this;
                this.$http.get("/api/News/WithinDates?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                    var data = httpResponse.data;
                    innerThis.isLoadingNews = false;
                    _.each(data, function (entry) {
                        var shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        innerThis.calendarEvents.push({
                            title: "Notice: " + shortText,
                            start: moment(entry.postDate).format("YYYY-MM-DD"),
                            toolTipTitle: "Notice Added",
                            fullDescription: fullDescription
                        });
                    });
                    newsDeferred.resolve();
                }, function () {
                    innerThis.isLoadingNews = false;
                    newsDeferred.resolve();
                });
            }
            else
                newsDeferred.resolve();
            if (loadLogbookToCalendar) {
                this.isLoadingLogbookForCalendar = true;
                var innerThis = this;
                this.$http.get("/api/Logbook?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                    var data = httpResponse.data;
                    innerThis.isLoadingLogbookForCalendar = false;
                    _.each(data, function (entry) {
                        var shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        innerThis.calendarEvents.push({
                            title: "Logbook: " + shortText,
                            start: moment(entry.postDate).format("YYYY-MM-DD"),
                            toolTipTitle: "Logbook Entry Added",
                            fullDescription: fullDescription
                        });
                    });
                    logbookDeferred.resolve();
                }, function () {
                    innerThis.isLoadingLogbookForCalendar = false;
                    logbookDeferred.resolve();
                });
            }
            else
                logbookDeferred.resolve();
            if (loadPollsToCalendar) {
                this.isLoadingPolls = true;
                this.$http.get("/api/Poll/DateRange?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                    var data = httpResponse.data;
                    _this.isLoadingPolls = false;
                    _.each(data, function (entry) {
                        var shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        _this.calendarEvents.push({
                            title: "Poll: " + shortText,
                            start: moment(entry.postDate).format("YYYY-MM-DD"),
                            toolTipTitle: "Poll Added",
                            fullDescription: fullDescription
                        });
                    });
                    pollDeferred.resolve();
                }, function () {
                    _this.isLoadingPolls = false;
                    pollDeferred.resolve();
                });
            }
            else
                pollDeferred.resolve();
            return this.$q.all([newsDeferred.promise, logbookDeferred.promise, pollDeferred.promise]);
        };
        LogbookController.prototype.getAssociationEvents = function (start, end, timezone, callback) {
            if (this.onlyRefreshCalendarEvents) {
                this.onlyRefreshCalendarEvents = undefined;
                callback(this.calendarEvents);
                return;
            }
            this.calendarEvents = [];
            var innerThis = this;
            this.getAllEvents(start, end).then(function () {
                callback(innerThis.calendarEvents);
            });
        };
        LogbookController.prototype.getCalendarEvents = function (start, end, timezone, callback) {
            this.isLoadingCalendarEvents = true;
            var firstDay = start.format(LogbookController.DateFormat);
            var lastDay = end.format(LogbookController.DateFormat);
            var innerThis = this;
            this.$http.get("/api/CalendarEvent?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                var data = httpResponse.data;
                var associationEvents = [];
                innerThis.isLoadingCalendarEvents = false;
                _.each(data, function (entry) {
                    var utcEventDate = moment.utc(entry.eventDateUtc);
                    var utcTimeOnly = utcEventDate.format(LogbookController.TimeFormat);
                    var isAllDay = utcTimeOnly == LogbookController.NoTime;
                    var dateEntry;
                    if (isAllDay) {
                        entry.timeOnly = "";
                        entry.dateOnly = new Date(utcEventDate.year(), utcEventDate.month(), utcEventDate.date());
                        dateEntry = new Date(utcEventDate.year(), utcEventDate.month(), utcEventDate.date());
                    }
                    else {
                        var localDate = moment.utc(entry.eventDateUtc).local();
                        entry.timeOnly = localDate.format(LogbookController.TimeFormat);
                        entry.dateOnly = localDate.clone().startOf('day').toDate();
                        dateEntry = localDate.toDate();
                    }
                    var shortText = entry.title;
                    if (shortText && shortText.length > 10)
                        shortText = shortText.substring(0, 10) + "...";
                    var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.title + "</p>";
                    associationEvents.push({
                        //title: "Event: " + shortText,
                        title: shortText,
                        start: dateEntry,
                        toolTipTitle: "Event",
                        fullDescription: fullDescription,
                        calendarEventObject: entry,
                        allDay: isAllDay
                    });
                });
                callback(associationEvents);
            }, function () {
                innerThis.isLoadingCalendarEvents = false;
            });
        };
        LogbookController.prototype.isUserAssociated = function (userId) {
            if (this.editEvent && this.editEvent.associatedUserIds)
                return _.contains(this.editEvent.associatedUserIds, userId);
            return false;
        };
        LogbookController.prototype.isDateInPast = function (date) {
            var momentDate = moment(date);
            var today = moment();
            return momentDate.isBefore(today, 'day') || momentDate.isSame(today, 'day');
        };
        LogbookController.prototype.onShouldSendChange = function () {
            // Don't allow the user to send remdiner e-mails for past dates
            if (this.editEvent.shouldSendNotification && this.isDateInPast(this.editEvent.dateOnly))
                this.editEvent.shouldSendNotification = false;
            else if (!this.editEvent.notificationEmailDaysBefore)
                this.editEvent.notificationEmailDaysBefore = 1;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user changes the "days before" email setting
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.onChangeEmailDaysBefore = function () {
            var notificationDate = moment(this.editEvent.dateOnly).subtract(this.editEvent.notificationEmailDaysBefore, 'day');
            var today = moment();
            this.showBadNotificationDateWarning = notificationDate.isBefore(today, 'day') || notificationDate.isSame(today, 'day');
            if (this.showBadNotificationDateWarning) {
                this.maxDaysBack = moment(this.editEvent.dateOnly).diff(today, 'day');
                this.editEvent.notificationEmailDaysBefore = this.maxDaysBack;
                var innerThis = this;
                this.$timeout(function () { innerThis.showBadNotificationDateWarning = false; }, 10000);
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Show the full calendar event edit modal
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.expandCalendarEventModel = function () {
            this.showExpandedCalendarEventModel = true;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Set the calendar event for us to edit
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.setEditEvent = function (eventObject, showDetails) {
            var _this = this;
            this.showExpandedCalendarEventModel = showDetails || false;
            this.editEvent = eventObject;
            // Clear this warning in case the user is clicking around quickly
            this.showBadNotificationDateWarning = false;
            if (this.editEvent) {
                // Simplify the UI logic by transforming this input
                if (this.residents)
                    _.each(this.residents, function (r) { return r.isAssociated = _this.isUserAssociated(r.userId); });
                this.editEvent.shouldSendNotification = this.editEvent.notificationEmailDaysBefore !== null;
                // Set focus on the title so it's user friendly and ng-escape needs an input focused
                // to work
                setTimeout(function () { $("#calendar-event-title").focus(); }, 10);
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Delete the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.deleteCalendarEvent = function (eventId) {
            var _this = this;
            if (!confirm("Are you sure you want to remove this event?"))
                return;
            this.isLoadingCalendarEvents = true;
            this.$http.delete("/api/CalendarEvent?eventId=" + eventId).then(function () {
                _this.isLoadingCalendarEvents = false;
                _this.editEvent = null;
                _this.onlyRefreshCalendarEvents = true;
                $('#log-calendar').fullCalendar('refetchEvents');
            }, function () {
                _this.isLoadingCalendarEvents = false;
                alert("Failed to delete the calendar event.");
            });
        };
        LogbookController.prototype.getDaysBeforeValue = function () {
            var daysBefore = null;
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
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Save the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.saveCalendarEvent = function () {
            var _this = this;
            if (!Ally.HtmlUtil2.isValidString(this.editEvent.title)) {
                alert("Please enter a title in the 'what' field");
                return;
            }
            // Ensure the user enters a 'days before' email setting
            if (this.editEvent.shouldSendNotification) {
                var daysBefore = this.getDaysBeforeValue();
                if (daysBefore === null) {
                    alert("Please enter a valid number for the 'days before' email send date");
                    return;
                }
            }
            // Build the list of the associated users
            if (this.residents) {
                var associatedUsers = _.filter(this.residents, function (r) { return r.isAssociated; });
                this.editEvent.associatedUserIds = _.map(associatedUsers, function (r) { return r.userId; });
            }
            var dateTimeString = "";
            if (typeof (this.editEvent.timeOnly) === "string" && this.editEvent.timeOnly.length > 1) {
                dateTimeString = moment(this.editEvent.dateOnly).format(LogbookController.DateFormat) + " " + this.editEvent.timeOnly;
                this.editEvent.eventDateUtc = moment(dateTimeString, LogbookController.DateFormat + " " + LogbookController.TimeFormat).utc().toDate();
            }
            else {
                dateTimeString = moment(this.editEvent.dateOnly).format(LogbookController.DateFormat) + " " + LogbookController.NoTime;
                this.editEvent.eventDateUtc = moment.utc(dateTimeString, LogbookController.DateFormat + " " + LogbookController.TimeFormat).toDate();
            }
            if (!this.editEvent.shouldSendNotification)
                this.editEvent.notificationEmailDaysBefore = null;
            var httpFunc;
            if (this.editEvent.eventId)
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;
            analytics.track("addCalendarEvent");
            this.isLoadingCalendarEvents = true;
            httpFunc("/api/CalendarEvent", this.editEvent).then(function () {
                _this.isLoadingCalendarEvents = false;
                _this.editEvent = null;
                _this.onlyRefreshCalendarEvents = true;
                $('#log-calendar').fullCalendar('refetchEvents');
            }, function (httpResponse) {
                _this.isLoadingCalendarEvents = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to save the calendar event: " + errorMessage);
            });
        };
        ;
        LogbookController.$inject = ["$scope", "$timeout", "$http", "$rootScope", "$q", "fellowResidents", "SiteInfo"];
        LogbookController.DateFormat = "YYYY-MM-DD";
        LogbookController.TimeFormat = "h:mma";
        LogbookController.NoTime = "12:37am";
        return LogbookController;
    }());
    Ally.LogbookController = LogbookController;
})(Ally || (Ally = {}));
CA.angularApp.component("logbookPage", {
    templateUrl: "/ngApp/chtn/member/logbook.html",
    controller: Ally.LogbookController
});

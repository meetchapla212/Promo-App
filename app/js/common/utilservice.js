angular.module('PromoApp')
    .service('Utils', function() {

        const DATE_FORMAT = "dddd, MMMM DD, hh:mm a";

        this.stripeStyle = function() {
            let style = {
                base: {
                    // Add your base input styles here. For example:
                    fontSize: '16px',
                    color: "#333333",
                    fontFamily: 'Lato',
                    textAlign: 'justify',
                    lineHeight: '28px',
                    '::placeholder': {
                        color: '#999999',
                        fontFamily: 'Lato'
                    }
                }
            };

            return style;
        };

        this.stripeInitElements = function() {
            return {
                fonts: [{
                    cssSrc: 'https://fonts.googleapis.com/css?family=Lato',
                }, ]
            };
        };
        this.showError = function(scope, message, title) {
            let notify = {
                type: 'error',
                title: title || 'Error',
                content: message,
                timeout: 5000 //time in ms
            };
            scope.$emit('notify', notify);
        };

        this.showSuccess = function(scope, message, title) {
            let notify = {
                type: 'success',
                title: title || 'Success',
                content: message,
                timeout: 5000 //time in ms
            };
            scope.$emit('notify', notify);
        };

        this.removeEventFromLocal = function(window, eventId) {
            cosnole.log('removeEventFromLocal');
            let events = window.localStorage.getItem("events");
            if (events) {
                events = JSON.parse(events);
                events = events.filter(e => e.event_id != eventId);
                window.localStorage.setItem("events", JSON.stringify(events));
            }
        };

        this.removeEventsFromLocal = function(window) {
            let events = window.localStorage.getItem("events");
            if (events) {
                window.localStorage.removeItem('events');
            }
        };

        this.getClaimUrl = function(eventId) {
            let base_url = window.location.origin;
            let claim_url = base_url + "/?claim=" + eventId;
            return claim_url;
        };

        this.getEditUrl = function(eventId) {
            let base_url = window.location.origin;
            let claim_url = base_url + "/?edit=" + eventId;
            return claim_url;
        };

        this.clone = function(object) {
            return JSON.parse(JSON.stringify(object));
        };

        this.applyChanges = ($scope) => {
            if (!$scope.$$phase) {
                $scope.$digest();
            }
        };

        this.mapQBEventToControllerEvent = (QBEvent) => {
            let data = {
                title: QBEvent.event_name || QBEvent.Event_Name,
                start: moment(QBEvent.start_date_time).format(DATE_FORMAT),
                category: QBEvent.category,
                location: [QBEvent.eventLocation[1], QBEvent.eventLocation[0]],
                end: moment(QBEvent.end_date_time).format(DATE_FORMAT),
                id: QBEvent._id,
                latitude: QBEvent.latitude,
                longitude: QBEvent.longitude,
                description: QBEvent.description,
                shareCounter: QBEvent.share_counter,
                event_image: QBEvent.event_image,
                user_id: QBEvent.user_id,
                event_type: QBEvent.event_type,
                invite_friends: QBEvent.invite_friends,
                address: QBEvent.address,
                sponsored_event: QBEvent.sponsored_event,
                phqEvent: QBEvent.isPHQ,
                phqEventId: QBEvent.PHQEventID,
                image_url: QBEvent.image_url,
                start_date_time_ms: QBEvent.start_date_time_ms,
                end_date_time_ms: QBEvent.end_date_time_ms,
                claimed_by: QBEvent.claimed_by,
                isHighlighted: QBEvent.highlighted,
                claimed_on: QBEvent.claimed_on,
                email: QBEvent.email,
                notifySubscribe: QBEvent.notify_subscribe,
                websiteUrl: QBEvent.websiteurl,
                phone: QBEvent.phone,
                ticketType: QBEvent.ticketType,
                paypalEmail: QBEvent.paypalEmail,
                ticketsCheckedIn: QBEvent.ticketsCheckedIn,
                tickets: (QBEvent.tickets) ? JSON.parse(QBEvent.tickets) : null,
                isdraft: QBEvent.isdraft,
                state: QBEvent.state,
                event_admin: [],
                timezone: QBEvent.timezone,
                admissionTicketType: QBEvent.admissionTicketType,
                venue_is: QBEvent.venue_is,
                streetAddress: QBEvent.streetAddress,
                address_state: QBEvent.address_state,
                city: QBEvent.city,
                country: QBEvent.country,
                country_code: QBEvent.country_code,
                zipcode: QBEvent.zipcode,
                guests: QBEvent.guests
            };

            if (QBEvent.event_admin) {
                let event_admin = [];
                try {
                    event_admin = JSON.parse(QBEvent.event_admin);
                } catch (e) {
                    console.log('Unable to parse event admin', QBEvent.event_admin);
                }
                data.event_admin = event_admin;
            }

            if (data.description) {
                data.shortDescription = data.description.length > 200 ? data.description.substring(0, 200) + '...' : data.description;
            } else {
                data.description = data.title;
            }


            data.expandBubble = false;
            if (data.title) {
                data.shortTitle = data.title.length > 20 ? data.title.substring(0, 20) + '...' : data.title;
            }
            data.showMarkerVisible = false;

            return data;
        };

        this.getStartAndDate = (date, time) => {
            let startDate = moment(date);
            let startTime = moment(time, 'hh:mma');
            startDate.hour(parseInt(startTime.hour(), 10));
            startDate.minute(startTime.minute());
            startDate.second(startTime.second());
            startDate.millisecond(startTime.millisecond());

            return startDate;
        };

        this.isFutureDateEvent = (date, timezone) => {
            // check if timezone is present in item
            let endDate = moment(date);
            let now = moment();
            if (timezone) {
                endDate = endDate.tz(timezone);
                now = now.tz(timezone);
            }

            if (endDate.isAfter(now)) {
                return true;
            }
            return false;
        };

        this.isPastDateEvent = (date, timezone) => {
            // check if timezone is present in item
            let endDate = moment(date);
            let now = moment();
            if (timezone) {
                endDate = endDate.tz(timezone);
                now = now.tz(timezone);
            }

            if (endDate.isBefore(now)) {
                return true;
            }
            return false;
        };

        this.dateRange = (item, startDate, endDate, dateFormat, columnName) => {
            if (!dateFormat) {
                dateFormat = "YYYY-MM-DDTHH:mm:SS:sssZ";
            }

            if (!columnName) {
                columnName = 'end';
            }
            let receivedDate = item[columnName];

            if (receivedDate) {
                if (dateFormat && dateFormat != 'ms') {
                    receivedDate = moment(receivedDate, dateFormat);
                } else {
                    receivedDate = moment(receivedDate);
                }
            }
            // check if timezone is present in item
            if ('timezone' in item && item.timezone) {
                if (startDate) {
                    startDate = startDate.tz(item.timezone);
                }
                if (endDate) {
                    endDate = endDate.tz(item.timezone);
                }

                if (receivedDate) {
                    receivedDate.tz(item.timezone);
                }
            }

            // Check if only start date
            if (startDate && !endDate) {

                if (dateFormat && dateFormat == 'ms') {
                    if (receivedDate > startDate) {
                        return true;
                    }
                } else if (receivedDate.isAfter(startDate)) {
                    return true;
                }

                return false;
            } else if (!startDate && endDate) {
                if (dateFormat && dateFormat == 'ms') {
                    if (receivedDate < endDate) {
                        return true;
                    }
                } else if (receivedDate.isBefore(endDate)) {
                    return true;
                }
                return false;
            } else if (!startDate && !endDate) {
                return true;
            } else {
                if (dateFormat && dateFormat == 'ms') {
                    if (receivedDate > startDate && receivedDate < endDate) {
                        return true;
                    }
                } else if (receivedDate.isAfter(startDate) && receivedDate.isBefore(endDate)) {
                    return true;
                }
                return false;
            }
        };

        this.detectMobile = () => {
            if (navigator.userAgent.match(/Android/i) ||
                navigator.userAgent.match(/webOS/i) ||
                navigator.userAgent.match(/iPhone/i) ||
                navigator.userAgent.match(/iPad/i) ||
                navigator.userAgent.match(/iPod/i) ||
                navigator.userAgent.match(/BlackBerry/i) ||
                navigator.userAgent.match(/Windows Phone/i)
            ) {
                return true;
            } else {
                return false;
            }
        };

        this.isMobile = () => {
            let isMobile = window.matchMedia("only screen and (max-width: 1024px)");
            return isMobile.matches;
        };
    });
angular.module('PromoApp')
    .service('eventsService', ['qbService', 'CacheFactory', '$window', 'authService', 'apiService', 'Utils', 'locationService', 'awsService', function(qbService, CacheFactory, $window, authService, apiService, Utils, locationService, awsService) {
        const className = 'Events';
        const CACHE_NAME = "eventAttendingCache";

        if (!CacheFactory.get(CACHE_NAME)) {
            eventAttendingCache = CacheFactory.createCache(CACHE_NAME, {
                deleteOnExpire: 'aggressive',
                recycleFreq: 60000
            });
        }

        var eventAttendingCache = CacheFactory.get(CACHE_NAME);


        // This function is to handle post process 
        this.postProcessEvents = (ev, mappedEvent) => {
            if (!ev.image_url) {
                ev.image_url = '../img/unnamed.png';
            }
            let promise = null;
            if (ev.event_image) {
                promise = this.getFileUrl({
                    id: ev._id,
                    field_name: 'event_image' //r.event_name
                });
            } else {
                promise = Promise.resolve(null);
            }

            return promise.then((imageUrl) => {
                if (imageUrl) {
                    ev.image_url = imageUrl;
                }
                if (mappedEvent) {
                    ev = Utils.mapQBEventToControllerEvent(ev);
                } else if ('tickets' in ev && ev.tickets) {
                    ev.tickets = JSON.parse(ev.tickets);
                }
                return Promise.resolve(ev);
            });

        };

        /**
         * className : model name
         * filter : filter for fetching list ex. {sort_asc: 'created_at'}
         */
        this.getEventDetails = (eventId, data) => {
            let token = authService.get('token');
            return apiService.getEventDetails(eventId, token, data)
                .then((response) => {
                    return response;
                });
        };
        /**
         * className : model name
         * filter : filter for fetching list ex. {sort_asc: 'created_at'}
         */
        this.getEvents = (filter) => {

            let token = authService.get('token');
            return apiService.getEvents(filter, token)
                .then((response) => {
                    return response;
                });
        };
        this.getEventsWithOutToken = (filter) => {

            return apiService.getEvents(filter)
                .then((response) => {
                    return response;
                });
        };

        this.getEmbededEvents = (filter) => {
            return apiService.getUserEvents(filter.user_id)
                .then((response) => {
                    return response;
                });
        };

        this.getUserEvents = (user_id) => {

            let token = authService.get('token');
            return apiService.getUserEvents(user_id, token)
                .then((response) => {
                    if (response && 'data' in response) {
                        return response.data;
                    }
                });
        };

        this.getEventsByStatus = (filter) => {

            let token = authService.get('token');
            return apiService.getEventsByStatus(filter, token)
                .then((response) => {
                    let events = [];
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            events = data;
                        }
                    }

                    return events;
                });
        };

        this.getRewardByStatus = (filter) => {

            let token = authService.get('token');
            return apiService.getRewardByStatus(filter, token)
                .then((response) => {
                    let rewards = [];
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            rewards = data.data;
                        }
                    }

                    return rewards;
                });
        };

        this.getEventPurchasedTickets = (filter) => {
            let token = authService.get('token');
            return apiService.getEventTickets(token, filter)
                .then((response) => {
                    let purchasedTickets = [];
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            purchasedTickets = data;
                        }
                    }

                    return purchasedTickets;
                });
        };

        this.addTicket = (id, data) => {
            let token = authService.get('token');
            return apiService.addTicket(id, data, token).then((response) => {
                if (response.status == 200) {
                    return response;
                }
            });
        };

        this.deleteEvent = (eventId, session) => {
            return qbService.getSession(session).then((res) => {
                return qbService.deleteById(className, eventId);
            });

        };

        this.allowToEdit = (eventToEdit, userId) => {
            if (eventToEdit) {
                if (eventToEdit._user_id == userId || eventToEdit.claimed_by == userId) {
                    return true;
                }
                try {
                    let admins = JSON.parse(eventToEdit.event_admin);
                    if (admins) {
                        for (let i = 0; i < admins.length; i++) {
                            if (ad[i].id == userId) {
                                return true;
                            }
                        }
                    }
                } catch (err) {
                    return true;
                }
            }
            return false;
        };

        this.editEvent = (id, data, session) => {
            return qbService.getCurrentSession().then((res) => {
                data._id = id;
                return qbService.updateData(className, data);
            });

        };


        this.claimedEvent = function(event_id, plan, token) {
            return new Promise((resolve, rejected) => {
                return apiService.claimedEvent(event_id, plan, token)
                    .then((response) => {
                        //return response;
                        resolve(response);
                    });
            });
        };

        this.freeClaimedEvent = function(event_id, token) {
            return apiService.freeClaimedEvent(event_id, token)
                .then((response) => {
                    if (response && 'data' in response) {
                        return response.data;
                    }
                });
        };

        this.claimEvent = function(event, user, plan) {
            console.log('event to be claimed', event);

            // Add to claimed event history
            let claimedEventHistoryData = {
                event_id: event.id,
                plan_id: plan.id,
            };
            if (event.title) {
                claimedEventHistoryData.event_title = event.title;
            }
            return qbService.getCurrentSession().then((res) => {
                    return qbService.createData("UserClaimedEventHistory", claimedEventHistoryData);
                }).then((res) => {
                    // Update in localstorage
                    let data = {
                        _id: event.id,
                        claimed_by: user.id,
                        claimed_on: moment().utc().valueOf(),
                        highlighted: plan.highlight,
                        push: { 'childReferences': res.event_id }
                    };
                    if ("permissions" in event) {
                        data.permissions = event.permissions;
                    }
                    return qbService.updateData(className, data);
                })
                .then(res => {
                    let events = $window.localStorage.getItem("events");
                    if (events) {
                        events = JSON.parse(events);
                        events.forEach(function(element) {
                            if (element.id == res._id) {
                                element.claimed_by = res.claimed_by;
                                element.claimed_on = res.claimed_on;
                                element.isHightlighted = res.hightlighted;
                            }
                        });
                        console.log('Inside eventsService', events);
                        $window.localStorage.setItem("events", JSON.stringify(events));
                    }
                    return Promise.resolve(res);
                });
        };

        this.getEventAttendingByUser = (userId) => {
            if (eventAttendingCache.get(userId)) {
                return Promise.resolve(eventAttendingCache.get(userId));
            } else {
                let token = authService.get('token');
                return this.getUserEventAttendingStatus(token, userId)
                    .then((response) => {
                        if (response && response.length > 0) {
                            let cacheEvents = {};
                            response.forEach((eventAttending) => {
                                cacheEvents[eventAttending._user_id] = eventAttending;
                            });
                            eventAttendingCache.put(userId, cacheEvents);
                            return Promise.resolve(cacheEvents);
                        }
                        return Promise.resolve(null);
                    });
            }
        };

        this.getEventAttendingByUserAndEvent = (userId, eventId, session) => {
            if (eventAttendingCache.get(userId)) {
                return Promise.resolve(eventAttendingCache.get(userId)[eventId]);
            } else {
                let filter = { user_id: userId, _parent_id: eventId };
                return this.getUserEventAttendingStatus(filter, session)
                    .then((response) => {
                        if (response && response.length > 0) {
                            let cacheEvents = {};
                            let eat = null;
                            response.forEach((eventAttending) => {
                                if (eventAttending) {
                                    cacheEvents[eventAttending._parent_id] = eventAttending;
                                    eat = eventAttending;
                                }
                            });
                            eventAttendingCache.put(userId, cacheEvents);
                            return Promise.resolve(eat);
                        }
                        return Promise.resolve(null);
                    });
            }
        };

        this.getUserEventAttendingStatus = (token, userId) => {
            return apiService.getInterestedEventsListById(token, userId).then((response) => {
                let UserEventAttending = [];
                if (response.status == 200) {
                    let data = response.data;

                    if (data.success) {
                        UserEventAttending = data.data;
                    }
                }
                return UserEventAttending;
            });
        };

        this.clearCacheByUserId = (userId) => {
            if (userId && eventAttendingCache.get(userId)) {
                console.log('Clearing cache by clearCacheByUserId');
                eventAttendingCache.remove(userId);
            }
        };

        this.updateUserEventAttendingStatus = (params) => {
            let token = authService.get('token');
            return apiService.goingUsersInEvent(token, params).then((response) => {
                return response;
            });
        };

        this.createUserEventAttendingStatus = (params) => {
            let token = authService.get('token');
            return apiService.goingUsersInEvent(token, params).then((response) => {
                return response;
            });
        };

        this.sortByStartDate = (events) => {
            let sortedEvnt = [];
            events.forEach(function(evnt) {
                if (evnt.start_date_time) {

                }
            }, this);
        };

        this.getFriends = (filter, session) => {
            alert(121);
            return qbService.getSession(session).then((res) => {
                return qbService.listTable('FollowUsers', filter);
            });

        };


        this.createEvent = (data, session) => {
            let token = authService.get('token');
            return apiService.eventCreated(token).then((response) => {
                return response;
            });

        };

        this.saveFeedback = (data) => {
            let token = authService.get('token');
            return apiService.saveFeedback(token, data).then((response) => {
                return response;
            });
        };

        this.uploadImg = (file, aws_config) => {


            return new Promise((resolve, rejected) => {
                let response = {
                    "status": false,
                    "file_url": ''
                };
                AWS.config.update({
                    accessKeyId: aws_config.access_key,
                    secretAccessKey: aws_config.secret_key
                });
                AWS.config.region = aws_config.region;
                var bucket = new AWS.S3({ params: { Bucket: aws_config.bucket } });

                if (file) {
                    var params = { Key: aws_config.path + '/' + file.name, ContentType: file.type, Body: file, ACL: "public-read" };

                    bucket.putObject(params, function(err, data) {
                        if (err) {
                            // There Was An Error With Your S3 Config
                            console.log(err.message);
                            response.status = false;
                        } else {
                            // Success!
                            response.status = true;
                            response.file_url = aws_config.img_show_url + '/' + aws_config.path + '/' + file.name;
                        }
                        resolve(response);
                    });

                }
            });

        };
        this.filterEventById = (events, id) => {
            return events.filter(e => e.id === id);
        };

        // This method is used to get Users Going with events
        this.goingEvents = (user_id, expandEvents) => {
            let filter = {
                user_id: user_id,
                type_going: { in: 'May be,Going' }
            };
            let events = [];
            let going = [];
            return qbService.listTable('GoingUsersInEvent', filter)
                .then((response) => {
                    console.log("GoingUsersInEvent rows", response);
                    if (expandEvents && response && response.length > 0) {
                        let set = new Set();
                        for (let goingEvent of response) {
                            if (!set.has(goingEvent._parent_id)) {
                                going.push(goingEvent);
                                set.add(goingEvent._parent_id);
                            }
                        }

                        if (Array.from(set).length > 0) {
                            let eventsFilter = {
                                "_id": {
                                    "in": Array.from(set)
                                }
                            };
                            return this.getEvents(eventsFilter, true);
                        }
                    }
                    return Promise.resolve(events);
                })
                .then((eventsResponse) => {
                    if (eventsResponse && eventsResponse.length > 0) {
                        // Put each event in respective tickets
                        for (let ev of going) {
                            // Get event
                            let event = this.filterEventById(eventsResponse, ev._parent_id);
                            if (event && event.length > 0) {
                                event[0].going = ev;
                                events.push(event[0]);
                            }
                        }
                    }
                    return Promise.resolve(events);
                });
        };

        this.getUserTickets = () => {
            let token = authService.get('token');
            return apiService.getUserTickets(token)
                .then((response) => {
                    return response;
                });
        };

        this.getUpcomingEvent = () => {
            let token = authService.get('token');
            return apiService.getUpcomingEvent(token)
                .then((response) => {
                    return response;
                });
        };

        this.getPastEvent = () => {
            let token = authService.get('token');
            return apiService.getPastEvent(token)
                .then((response) => {
                    return response;
                });
        };

        // This method is used to get user tickets with events
        this.getUserTickets_old = (user_id, expandEvents, event_id) => {
            console.log('Inside getUserTickets', user_id, event_id);
            let filter = { "attendee": user_id, 'sort_desc': 'created_at' };
            if (event_id) {
                filter.event_id = event_id;
            }
            let userTickets = [];
            return qbService.listTable('UserTickets', filter)
                .then((userTicketsResponse) => {
                    console.log("UserTickets rows", userTicketsResponse);
                    let set = new Set();
                    for (let ticket of userTicketsResponse) {
                        if (ticket.tickets) {
                            ticket.tickets = JSON.parse(ticket.tickets);
                        }
                        userTickets.push(ticket);
                        if (!set.has(ticket.event_id)) {
                            set.add(ticket.event_id);
                        }
                    }

                    if (Array.from(set).length > 0 && expandEvents) {
                        let eventsFilter = {
                            "_id": {
                                "in": Array.from(set)
                            }
                        };
                        return this.getEvents(eventsFilter, true);
                    }

                    return Promise.resolve([]);
                })
                .then((eventsResponse) => {
                    if (eventsResponse && eventsResponse.length > 0) {
                        // Put each event in respective tickets
                        for (let ticket of userTickets) {
                            // Get event
                            let event = this.filterEventById(eventsResponse, ticket.event_id);
                            if (event && event.length > 0) {
                                ticket.event = event[0];
                            }
                        }
                    }
                    return Promise.resolve(userTickets);
                });
        };

        this.getAllPaidEventsCount = () => {

            let token = authService.get('token');
            let paidEventsCount = 0;
            return apiService.getActiveTicketingEvents(token)
                .then((response) => {
                    if (response && 'data' in response && response.data) {
                        paidEventsCount = response.data.paid_event;
                    }
                    return paidEventsCount;
                });
        };

        // This method returns number of active ticketing events
        this.getActiveTicketingEvents = () => {

            let token = authService.get('token');
            let activeTicketingEvents = 0;
            return apiService.getActiveTicketingEvents(token)
                .then((response) => {
                    if (response && 'data' in response && response.data) {
                        activeTicketingEvents = response.data.paid_event + response.data.claimed_event;
                    }
                    return activeTicketingEvents;
                });


            // Get method give current active ticketing events user has created
            // Get current user
            /*let events = [];
            let user = authService.getUser();
            if(user){
                // Get events which has events with tickets enabled
                let now = moment.utc().valueOf();
                let promises=[];
                promises.push(this.getEvents( {
                    ticketType: {ne: null},
                    user_id: user.id,
                    end_date_time_ms: {
                        gte: now
                    }
                },true));
                
                promises.push(this.getEvents({
                    ticketType: {ne: null},
                    claimed_by: user.id,
                    end_date_time_ms: {
                        gte: now
                    }
                },true));
                
                return Promise.all(promises)
                .then((response)=>{
                    if(response){
                        let uniqueEvents = [];
                        for(let r of response){
                            for(let e of r){
                                if(!uniqueEvents.includes(e.id)){
                                    events.push(e);
                                    uniqueEvents.push(e.id);
                                }
                            }
                        }
                    }
                    return events;
                });

            }else{
                return Promise.resolve([]);
            }*/
        };

        this.getEventsTickets = (event_ids) => {
            let eventsFilter = {
                "event_id": {
                    "in": event_ids
                }
            };
            return qbService.listTable('UserTickets', eventsFilter)
                .then((userTicketsResponse) => {
                    console.log("UserTickets rows", userTicketsResponse);
                    return Promise.resolve(userTicketsResponse);
                });
        };

        // Update event in local storage 
        this.updateEventInCache = (event) => {
            let events = $window.localStorage.getItem("events");
            if (events && event) {
                events = JSON.parse(events);
                // Check if event is present
                for (let cachedEvent of events) {
                    if (cachedEvent.event_id === event.event_id) {
                        cachedEvent = Object.assign(cachedEvent, event);
                    }
                }
                $window.localStorage.setItem("events", JSON.stringify(events));
            }
        };

        // This function is used to update location of event
        this.updateLocationOfEvent = (event) => {

            // Check if location is not present then get location
            if (!('address' in event && event.address)) {
                locationService.getAddressByLatLong(event.latitude, event.longitude)
                    .then((address) => {
                        if (address) {
                            event.address = address.text;



                            if ('address' in address && address.address.city) {
                                event.city = address.address.city;
                            }

                            if ('address' in address && address.address.state) {
                                event.state = address.address.state;
                            }

                            if ('address' in address && address.address.country) {
                                event.country = address.address.country;
                            }


                            this.updateEventInCache(event);
                            // Also update address in QB
                            let data = {
                                address: address.text
                            };
                            if ('address' in address && address.address) {
                                data = Object.assign(data, address.address);
                            }
                            if ('country_code' in address && address.country_code) {
                                data.country_code = address.country_code;
                            }
                            let token = authService.get('token');
                            data.event_id = event.event_id;
                            return awsService.post(`/event/updateAddress`, data, token);
                        } else {
                            return Promise.resolve();
                        }
                    })
                    .then(() => {
                        return Promise.resolve();
                    });
            }
            return Promise.resolve();
        };


        this.getUserEventDD = () => {
            let token = authService.get('token');
            return apiService.getUserEventDD(token)
                .then((response) => {
                    let userEvents = response.data;
                    let UserEventDD = [];
                    if (userEvents && userEvents.length > 0) {
                        angular.forEach(userEvents, function(value) {
                            let ele = {
                                'id': value.event_id,
                                'name': value.event_name,
                                'start_date_time': value.start_date_time,
                                'end_date_time': value.end_date_time,
                                'timezone': value.timezone,
                            };
                            this.push(ele);
                        }, UserEventDD);
                    }
                    return UserEventDD;

                });
        };



        this.socialRewardShare = (data) => {
            let token = authService.get('token');
            return apiService.socialRewardShare(token, data).then((response) => {
                return response;
            });
        };

        this.shareEvent = (event_id) => {
            let token = authService.get('token');
            return apiService.shareEvent(token, event_id).then((response) => {
                return response;
            });
        };

        this.socialRewardVisit = (data) => {
            let token = null;
            if (authService.get('token')) {
                token = authService.get('token');
            }
            return apiService.socialRewardVisit(data, token).then((response) => {
                return response;
            });
        };


        this.deleteTicket = (id) => {
            let token = authService.get('token');
            return apiService.deleteTicket(token, id)
                .then((response) => {
                    return response;
                });
        };

        this.getRewardUserAnalytics = (rewardId) => {

            let token = authService.get('token');
            return apiService.getRewardUserAnalytics(rewardId, token)
                .then((response) => {
                    let events = [];
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            events = data.data;
                        }
                    }

                    return events;
                });
        };

        this.getRewardById = (rewardId) => {

            let token = authService.get('token');
            return apiService.getRewardById(rewardId, token)
                .then((response) => {
                    let events = [];
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            events = data.data[0];
                        }
                    }
                    return events;
                });
        };

        this.refundTicketById = (ticketOrderId) => {
            let token = authService.get('token');
            return apiService.refundTicket(ticketOrderId, token)
                .then((response) => {
                    return response;
                });
        };

        this.organiserAnalytics = (rewardId) => {

            let token = authService.get('token');
            return apiService.organiserAnalytics(rewardId, token)
                .then((response) => {
                    let events = [];
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            events = data;
                        }
                    }
                    return events;
                });
        };

        this.cancelTicket = (ticketId, cancelReason) => {
            let token = authService.get('token');
            return apiService.cancelTicket(token, ticketId, cancelReason)
                .then((response) => {
                    if (response && 'data' in response && response.data) {
                        return response.data;
                    }
                });
        };


        this.eventPayoutChange = (bank_id, event_id) => {
            let token = authService.get('token');
            return apiService.eventPayoutChange(token, bank_id, event_id)
                .then((response) => {
                    if (response && 'data' in response) {
                        return response.data;
                    }
                });
        };


        this.getReferalLinkByEventId = (id) => {
            let token = authService.get('token');
            return apiService.getReferalLinkByEventId(id, token).then((response) => {
                if (response && 'data' in response) {
                    return response.data;
                }
            });
        };


        this.updateImageOfEvent = (event) => {

            // Check if location is not present then get location
            return apiService.updateImageOfEvent(event.event_id).then((response) => {
                if (response && 'data' in response) {
                    event.event_image = response.data.event_image;
                    this.updateEventInCache(event);
                    return response.data.event_image;
                }
            });
        };

        this.getExistingSeatPlan = (id) => {
            let token = authService.get('token');
            return apiService.getExistingSeatPlan(id, token).then((response) => {
                if (response && 'data' in response) {
                    return response.data;
                }
            });
        };

        this.deleteSeatPlan = (id) => {
            let token = authService.get('token');
            return apiService.deleteSeatPlan(id, token).then((response) => {
                if (response && 'data' in response) {
                    return response.data;
                }
            });
        };

        this.inviteAdministrator = (data, event_id) => {
            let token = authService.get('token');
            return apiService.inviteAdministrator(token, data, event_id).then((response) => {
                if (response && 'data' in response) {
                    return response.data;
                }
            });
        };

        this.eventAdministratorRequest = (data) => {
            return apiService.eventAdministratorRequest(data).then((response) => {
                if (response && 'data' in response) {
                    return response.data;
                }
            });
        };

        this.createEventAdministrator = (data) => {
            return apiService.createEventAdministrator(data).then((response) => {
                if (response && 'data' in response) {
                    return response.data;
                }
            });
        };

    }]);
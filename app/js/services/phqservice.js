angular.module('PromoApp')
    .service('phqservice', ['$q', '$http', '$filter', 'qbService', 'config', 'Utils', function($q, $http, $filter, qbService, config, Utils) {
        const dateFormat = "YYYY-MM-D";
        const phq_dateFormat = "YYYY-MM-DTHH:mm:ss";
        const MAX_NO_OF_PAGES_FROM_PHQ = config.MAX_NO_OF_PAGES_FROM_PHQ;
        const EVENTS_PER_PAGE = 10;
        const DATE_FORMAT = "dddd, MMMM DD, hh:mm a";
        const EVENTS_PER_PAGE_QB = 100;

        // This method should get non-promoted events by filter
        this.getNonPromotedPromoEvents = (categories, startDate, endDate, locations) => {
            // This method should return promise always
            return qbService.initQBApp().then((result) => {

                let filter = {
                    isPHQ: false
                };

                if (categories && categories.length > 0) {
                    let categories_all = categories.join();
                    filter.category = { in: categories_all };
                }

                if (locations && locations.length > 0) {
                    let latitude = locations[0];
                    let longitude = locations[1];
                    filter.eventLocation = { near: longitude + "," + latitude + ";30000" };
                }

                if (startDate) {
                    let start_date = moment.utc(startDate);
                    // Check if start date is less than now then adjust it so that expired events are not returned
                    let now = moment.utc().valueOf();
                    let start_milliseconds = (start_date).valueOf();
                    if (start_milliseconds < now) {
                        filter.end_date_time_ms = { gte: now };
                    } else {
                        filter.end_date_time_ms = { gte: start_milliseconds };
                    }
                }

                if (endDate) {
                    let end_date = moment.utc(endDate); // This is added so that it searches till end of day
                    end_date.set({ hour: 23, minute: 59, second: 59 });
                    let end_millseconds = (end_date).valueOf();
                    if ('end_date_time_ms' in filter) {
                        filter.end_date_time_ms.lte = end_millseconds;
                    } else {
                        filter.end_date_time_ms = { lte: end_millseconds };
                    }
                }

                // NOTE: We have to make sure expired events are not returned when no dates are specified
                if (!startDate && !endDate) {
                    let start_date = moment.utc();
                    let start_milliseconds = (start_date).valueOf();
                    filter.end_date_time_ms = { gte: start_milliseconds };
                }
                filter._parent_id = null;
                return qbService.listTable('Events', filter);
            }).then((data) => {
                //checking if filtered data exists in quickblox or not
                if (data && data.length > 0) {
                    data = data.map(QBEvent => {
                        return this.mapQBEventToControllerEvent(QBEvent);
                    });
                    return Promise.resolve(data);
                } else {
                    // getting data from phq if data doesn't exist in quickblox
                    return Promise.resolve([]);
                }
            }).catch(error => {
                console.log(error);
            });
        };
        // Get the event details
        this.getEventById = (eventId) => {
            return qbService.initQBApp().then((result) => {
                let filter = { _id: eventId };
                return qbService.listTable('Events', filter);
            }).then(response => {
                let event = response[0];
                return Promise.resolve(this.mapQBEventToControllerEvent(event));
            });

        };

        this.getEventImage = (event) => {
            if (event.event_image) {
                return qbService.getFileUrl('Events', {
                        id: event._id,
                        field_name: 'event_image' //r.title
                    })
                    .then(res => {
                        event.event_image = res;
                        return Promise.resolve(event);
                    });
            }
            return Promise.resolve(event);
        };

        this.getAllEventsFromQB = (categories, startDate, endDate, locations) => {
            let filter = {
                'sort_desc': 'start_date_time_ms'
            };
            if (categories && categories.length > 0) {
                let categories_all = categories.join();
                filter.category = { in: categories_all };
            }

            if (locations && locations.length > 0) {
                let latitude = locations[0];
                let longitude = locations[1];
                filter.eventLocation = { near: longitude + "," + latitude + ";30000" };
            }

            if (startDate) {
                let start_date = moment.utc(startDate);
                // Check if start date is less than now then adjust it so that expired events are not returned
                let now = moment.utc().valueOf();
                let start_milliseconds = (start_date).valueOf();
                if (start_milliseconds < now) {
                    filter.end_date_time_ms = { gte: now };
                } else {
                    filter.end_date_time_ms = { gte: start_milliseconds };
                }
            }

            if (endDate) {

                let end_date = moment.utc(endDate); // This is added so that it searches till end of day
                end_date.set({ hour: 23, minute: 59, second: 59 });
                let end_millseconds = (end_date).valueOf();
                if ('end_date_time_ms' in filter) {
                    filter.end_date_time_ms.lte = end_millseconds;
                } else {
                    filter.end_date_time_ms = { lte: end_millseconds };
                }
            }

            // NOTE: We have to make sure expired events are not returned when no dates are specified
            if (!startDate && !endDate) {
                let start_date = moment.utc();
                let start_milliseconds = (start_date).valueOf();
                filter.end_date_time_ms = { gte: start_milliseconds };
            }

            return qbService.listTable('Events', filter)
                .then((data) => {
                    if (data && data.length > 0) {
                        let promises = [];
                        for (let e of data) {
                            promises.push(this.getEventImage(e));
                        }
                        return Promise.all(promises);
                    }
                    return Promise.resolve(data);
                })
                .then((data) => {
                    if (data) {
                        data = data.map(e => this.mapQBEventToControllerEvent(e));
                    }
                    return Promise.resolve(data);
                })
                .catch((err) => {
                    return Promise.resolve([]);
                });
        };

        // This method should be called by controller to get events
        this.getAllEvents = (categories, startDate, endDate, name, location, background, index, zoneId) => {
            if (startDate) {
                startDate = startDate.format(dateFormat);
            }
            if (endDate) {
                endDate = endDate.format(dateFormat);
            }

            let allEvents = [];
            let res_data = {};
            return this.getEvents(categories, startDate, endDate, name, location, background, index, zoneId)
                .then((response) => {
                    let nonPromotedPromoEvents = response.data;
                    // add all returned events
                    if (nonPromotedPromoEvents && nonPromotedPromoEvents.length > 0) {
                        nonPromotedPromoEvents.forEach((e) => {
                            e.locations = [e.latitude, e.longitude];
                            allEvents.push(e);
                        });
                    }
                    if (background) {
                        res_data = {
                            'events': allEvents,
                            'scraped_event_count': response.scraped_event_count,
                            'scraping_event_count': response.scraping_event_count
                        };

                        return Promise.resolve(res_data);
                    } else {
                        return Promise.resolve(allEvents);
                    }

                })
                .catch((err) => {
                    console.log(err);
                    return Promise.resolve(allEvents);
                });
        };

        this.mapQBEventToControllerEvent = (QBEvent) => {
            return Utils.mapQBEventToControllerEvent(QBEvent);
        };

        // adding data to quickblox from phq
        this.dataToQB = function(response) {
            let url = config.AWS_BASE_URL + '/events';
            let phq_data = response;

            if (phq_data && phq_data.length > 0) {
                return $http({
                        method: 'POST',
                        url: url,
                        data: phq_data,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        json: true
                    }).then(response => {
                        let responses = [];
                        if (response && response.data) {
                            responses = response.data.map(e => this.mapQBEventToControllerEvent(e));
                        }
                        return Promise.resolve(responses);
                    })
                    .catch((err) => {
                        console.log('Err from AWS post service', err);
                        return Promise.resolve(phq_data);
                    });
            } else {
                return Promise.resolve([]);
            }
        };

        this.getEventsFromPHQByOffset = (url, offset) => {
            if (offset) {
                url = url + "&offset=" + offset;
            }
            return $http({
                    method: 'GET',
                    url: url,
                    headers: {
                        "Accept": 'application/json',
                        "Authorization": 'Bearer ' + config.PHQ_KEY
                    }
                }).then((response) => {
                    if (response && response.status == 200) {
                        return Promise.resolve(response.data.results);
                    } else {
                        return Promise.resolve([]);
                    }
                })
                .catch((err) => {
                    console.log('Got event while fetching from PHQ:', err);
                    return Promise.resolve([]);
                });
        };

        this.getEventsFromPHQByPage = (url, pageno, finalEvents) => {
            return $http({
                    method: 'GET',
                    url: url,
                    headers: {
                        "Accept": 'application/json',
                        "Authorization": 'Bearer ' + config.PHQ_KEY
                    }
                }).then((response) => {
                    if (response && response.status == 200) {
                        finalEvents = finalEvents.concat(response.data.results);
                        if (response.data.next && pageno < MAX_NO_OF_PAGES_FROM_PHQ) {
                            pageno = pageno + 1;
                            return this.getEventsFromPHQByPage(response.data.next, pageno, finalEvents);
                        } else {
                            return Promise.resolve(finalEvents);
                        }
                    } else {
                        return Promise.resolve(finalEvents);
                    }
                })
                .catch((err) => {
                    console.log('Got event while fetching from PHQ:', err);
                    return Promise.resolve(finalEvents);
                });
        };

        // This method is used to hard-refresh the events
        this.refreshEvents = (categories, startDate, endDate, name, locations) => {

            if (startDate) {
                startDate = startDate.format(dateFormat);
            }
            if (endDate) {
                endDate = endDate.format(dateFormat);
            }
            let allEvents = [];
            return this.getEventsFromPHQParallely(categories, startDate, endDate, name, locations)
                .then((eventFromPhQ) => {
                    if (eventFromPhQ && eventFromPhQ.length > 0) {
                        allEvents = eventFromPhQ;
                    }
                    return this.getNonPromotedPromoEvents(categories, startDate, endDate, location);
                })
                .then((nonPromotedPromoEvents) => {
                    // add all returned events
                    if (nonPromotedPromoEvents && nonPromotedPromoEvents.length > 0) {
                        nonPromotedPromoEvents.forEach((e) => {
                            allEvents.push(e);
                        });
                    }
                    return Promise.resolve(allEvents);
                })
                .catch((err) => {
                    console.log(err);
                    return Promise.resolve(allEvents);
                });
        };

        this.getEventsCountFromPHQ = (categories, startDate, endDate, locations) => {
            let url = config.PHQ_BASE_URL + "/events/count/?";
            let parameters = this.createParameterForPHQ(categories, startDate, endDate, locations);
            let andFilter = '&';
            url = url + parameters.join(andFilter);

            return $http({
                    method: 'GET',
                    url: url,
                    headers: {
                        "Accept": 'application/json',
                        "Authorization": 'Bearer ' + config.PHQ_KEY
                    }
                })
                .then((response) => {
                    if (response && response.status == 200) {
                        return Promise.resolve(response.data.count);
                    } else {
                        return Promise.resolve(0);
                    }
                })
                .catch((err) => {
                    console.log('Got event while fetching from PHQ:', err);
                    return Promise.resolve(0);
                });
        };

        this.createParameterForPHQ = (categories, startDate, endDate, locations) => {
            let parameters = ['sort=start'];
            if (categories && categories.length > 0) {
                let c = categories.join();
                parameters.push('category=' + c);
            }
            if (locations && locations.length > 0) {
                let c = locations.join();
                parameters.push('within=30km@' + c);
            }

            if (startDate) {
                let start_in_msec = moment(startDate, dateFormat).utc().valueOf();
                let now = moment.utc().valueOf();
                // Compare if it is less than now
                if (start_in_msec < now) {
                    // end should be greater than now
                    parameters.push('end.gte=' + moment.utc().format(dateFormat));
                } else {
                    parameters.push('end.gte=' + startDate);
                }
            } else {
                // end should be greater than now
                parameters.push('end.gte=' + moment.utc().format(dateFormat));
            }

            if (endDate) {
                // Make sure we append 23:59:59
                let endDateObject = moment.utc(endDate, dateFormat);
                endDateObject.hours(23);
                endDateObject.minutes(59);
                endDateObject.seconds(59);
                parameters.push('end.lte=' + endDateObject.format(phq_dateFormat));
            }
            return parameters;
        };

        //get events on the basis of filters
        this.getEventsFromPHQParallely = (categories, startDate, endDate, locations) => {

            // First get the count

            return this.getEventsCountFromPHQ(categories, startDate, endDate, locations)
                .then((eventCount) => {

                    // Calculate number of event
                    if (eventCount > 0) {
                        let numberOfPages = eventCount / EVENTS_PER_PAGE;
                        // This is done if event count is 12 then pages are 2
                        if (eventCount % EVENTS_PER_PAGE > 0) {
                            numberOfPages = numberOfPages + 1;
                        }

                        // This is done so that we don't exceed the total limit of PHQ
                        if (numberOfPages > MAX_NO_OF_PAGES_FROM_PHQ) {
                            numberOfPages = MAX_NO_OF_PAGES_FROM_PHQ;
                        }

                        let promises = [];
                        let url = config.PHQ_BASE_URL + "/events/?";
                        let parameters = this.createParameterForPHQ(categories, startDate, endDate, locations);
                        let andFilter = '&';
                        url = url + parameters.join(andFilter);

                        for (let i = 0; i < numberOfPages; i++) {
                            promises.push(this.getEventsFromPHQByOffset(url, i * EVENTS_PER_PAGE));
                        }

                        return Promise.all(promises)
                            .then((responseEvents) => {
                                // concat all results
                                let finalEvents = [];
                                if (responseEvents && responseEvents.length > 0) {
                                    for (let e of responseEvents) {
                                        if (e && e.length > 0) {
                                            finalEvents = finalEvents.concat(e);
                                        }
                                    }
                                }
                                if (finalEvents.length > 0) {
                                    /** we are commenting this for handling no description events **/
                                    // finalEvents = finalEvents.filter(e => e.description && e.description.length > 0);
                                    return this.dataToQB(finalEvents);
                                } else {
                                    return Promise.resolve([]);
                                }
                            })
                            .catch((err) => {
                                console.log(err);
                                return Promise.resolve([]);
                            });
                    } else {
                        // Resolve that no events are returned
                        return Promise.resolve([]);
                    }
                });
        };

        this.addPHQConditionToFilter = (filter) => {
            if (filter) {
                filter.isPHQ = true;
            } else {
                filter = {
                    isPHQ: true
                };
            }
            return filter;
        };

        this.filterPhqPromoEvent = (filter) => {
            // Add is phq true
            filter = this.addPHQConditionToFilter(filter);
            return qbService.getCurrentSession().then(res => {
                return qbService.listTable('Events', filter);
            });
        };

        this.createParameterForQB = (categories, startDate, endDate, locations) => {
            let filter = {
                'sort_asc': 'start_date_time_ms'
            };

            if (categories && categories.length > 0) {
                let categories_all = categories.join();
                filter.category = { in: categories_all };
            }

            if (locations && locations.length > 0) {
                let latitude = locations[0];
                let longitude = locations[1];
                filter.eventLocation = { near: longitude + "," + latitude + ";30000" };
            }

            if (startDate) {
                let start_date = moment.utc(startDate);
                // Check if start date is less than now then adjust it so that expired events are not returned
                let now = moment.utc().valueOf();
                let start_milliseconds = (start_date).valueOf();
                if (start_milliseconds < now) {
                    filter.end_date_time_ms = { gte: now };
                } else {
                    filter.end_date_time_ms = { gte: start_milliseconds };
                }
            }

            if (endDate) {
                let end_date = moment.utc(endDate); // This is added so that it searches till end of day
                end_date.set({ hour: 23, minute: 59, second: 59 });
                let end_millseconds = (end_date).valueOf();
                if ('end_date_time_ms' in filter) {
                    filter.end_date_time_ms.lte = end_millseconds;
                } else {
                    filter.end_date_time_ms = { lte: end_millseconds };
                }
            }

            // NOTE: We have to make sure expired events are not returned when no dates are specified
            if (!startDate && !endDate) {
                let start_date = moment.utc();
                let start_milliseconds = (start_date).valueOf();
                filter.end_date_time_ms = { gte: start_milliseconds };
            }

            //NOTE: Do not return draft events
            filter.isdraft = { ne: true };
            filter.state = { ne: 'inactive' };

            return filter;
        };

        this.getEventsCountFromQB = (categories, startDate, endDate, locations) => {
            let filter = this.createParameterForQB(categories, startDate, endDate, locations);
            filter.count = 1;
            return qbService.listTable('Events', filter);
        };

        this.getEventsFromQbParallely = (categories, startDate, endDate, locations) => {

            // First get the count

            return this.getEventsCountFromQB(categories, startDate, endDate, locations)
                .then((response) => {
                    let eventCount = response.count;

                    // Calculate number of event
                    if (eventCount > 0) {
                        let numberOfPages = 1;
                        if (eventCount > EVENTS_PER_PAGE_QB) {
                            numberOfPages = Math.floor(eventCount / EVENTS_PER_PAGE_QB);
                            // This is done if event count is 12 then pages are 2
                            if (eventCount % EVENTS_PER_PAGE_QB > 0) {
                                numberOfPages = numberOfPages + 1;
                            }
                        }

                        let promises = [];
                        let filter = this.createParameterForQB(categories, startDate, endDate, locations);
                        for (let i = 0; i < numberOfPages; i++) {
                            // Clone the filter and then pass
                            let clonedFilters = JSON.parse(JSON.stringify(filter));
                            if (i != 0) {
                                clonedFilters.skip = i * EVENTS_PER_PAGE_QB;
                            }
                            promises.push(qbService.listTable('Events', clonedFilters));
                        }

                        return Promise.all(promises)
                            .then((responseEvents) => {
                                // concat all results
                                let finalEvents = [];
                                if (responseEvents && responseEvents.length > 0) {
                                    for (let e of responseEvents) {
                                        if (e && e.length > 0) {
                                            finalEvents = finalEvents.concat(e);
                                        }
                                    }
                                }
                                return Promise.resolve(finalEvents);

                            })
                            .catch((err) => {
                                return Promise.resolve([]);
                            });
                    } else {
                        // Resolve that no events are returned
                        return Promise.resolve([]);
                    }
                });
        };

        this.getEvents = (categories, startDate, endDate, name, location, background, index, zoneId) => {
            let url = config.BACKEND_API_ENDPOINT + "/event/getSearchEvent";
            if (background) {
                url = url + '?background=1&index=' + index;
            }
            let headers = {
                'Content-Type': 'application/json'
            };
            let search_params = {
                startDate: startDate, //startDate,
                endDate: endDate, //endDate,
                event_name: name,
                location: location,
                categories: categories,
            };
            if (zoneId) {
                search_params.zone_id = zoneId;
            }
            var cancel = $q.defer();
            var request = {
                method: 'POST',
                url: url,
                header: headers,
                data: { search_params: search_params },
                json: true
            };

            return $http(request).then(response => {
                return Promise.resolve(response.data);
            }).catch((err) => {
                //this console is for error identify
                return Promise.resolve([]);
            });
        };

        this.getEventsOld = (categories, startDate, endDate, name, location) => {
            let url = config.BACKEND_API_ENDPOINT + "/event/search";
            let headers = {
                'Content-Type': 'application/json'
            };

            let search_params = {
                startDate: startDate, //startDate,
                endDate: endDate, //endDate,
                event_name: name,
                location: location,
                categories: categories,
            };

            return $http({
                    method: 'POST',
                    url: url,
                    header: headers,
                    data: { search_params: search_params },
                    json: true
                }).then(response => {
                    return Promise.resolve(response.data.data);
                })
                .catch((err) => {
                    return Promise.resolve([]);
                });
        };
    }]);
const awsRequestHelper = require('./common/awsRequestHelper');
const moment = require('moment');
const QB = require('./common/qbmanager');
const QBManager = new QB();
const dateFormat = "YYYY-MM-D";
const DATE_FORMAT = "dddd, MMMM DD, hh:mm a";
//const MAX_NO_OF_PAGES_FROM_PHQ = config.MAX_NO_OF_PAGES_FROM_PHQ;
const EVENTS_PER_PAGE_QB = 100;
const ITEMS_PER_PAGE = 10;
const rp = require('request-promise');
const post = require('./post');
let allowed_categories = ["concerts", "festivals", "performing-arts", "community", "sports", "politics", "performing arts"];
// This function is used to create parameters need for QB filters
const createParameterForQB = (categories, startDate, endDate, locations) => {
    let filter = {
        'sort_asc': 'start_date_time_ms'
    };

    if (categories && categories.length > 0) {
        let categories_all = categories.join();
        filter.category = { in: categories_all };
    }

    if (locations && locations.length > 0) {
        console.log("PHQ table locations", locations);
        let latitude = locations[0];
        let longitude = locations[1];
        filter.eventLocation = { near: longitude + "," + latitude + ";30000" };
    }

    if (startDate) {
        let start_date = moment.utc(startDate);
        console.log(start_date);
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
        console.log(end_date);
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

// This function is used to get event count from QB
const getEventsCountFromQB = async (body) => {
    let filter = createParameterForQB(body.categories, body.startDate, body.endDate, body.location);
    filter.count = 1;
    return await QBManager.listTable('Events', filter);
};

// This function is used to get event on end date of QB
const getEventsMaxDateFromQB = async (body) => {
    let filter = createParameterForQB(body.categories, body.endDate, body.endDate, body.location);
    filter.count = 1;
    return await QBManager.listTable('Events', filter);
};

// This function is used to post process events coming from QB
const postProcessEvents = async (events) => {

    let finalEvents = [];
    if (events && events.length > 0) {
        console.log('postProcessEvents', events.length);
        for (let ev of events) {
            //console.log('Trying to get image',ev.event_name,ev.image_url,ev.event_image);
            if (!ev.image_url && ev.event_image) {

                ev.image_url = await QBManager.getFileUrl('Events', {
                    id: ev._id,
                    field_name: 'event_image' //r.event_name
                });
                console.log('Got image,', ev.image_url);
            }
            finalEvents.push(mapQBEventToControllerEvent(ev));
        }
    }

    return finalEvents
};
// This function is used to get event from QB
const getEventsFromQbParallely = async (body) => {

    try {
        // First get the count
        let promiseOfTotalEventCount = getEventsCountFromQB(body);
        let promiseOfMaxEventStartDate = getEventsMaxDateFromQB(body);

        let maxEventStartDate = await promiseOfMaxEventStartDate;
        let response = await promiseOfTotalEventCount;
        let eventCount = response.count;
        console.log('Got count from qb', eventCount);
        console.log('Got maxEventStartDate from qb', maxEventStartDate);
        // Calculate number of event
        if (eventCount > 5 && maxEventStartDate.count > 0) {
            let numberOfPages = 1;
            if (eventCount > EVENTS_PER_PAGE_QB) {
                numberOfPages = Math.floor(eventCount / EVENTS_PER_PAGE_QB);
                // This is done if event count is 12 then pages are 2
                if (eventCount % EVENTS_PER_PAGE_QB > 0) {
                    numberOfPages = numberOfPages + 1;
                }
            }
            console.log('Number of pages', numberOfPages);

            let promises = [];
            let filter = createParameterForQB(body.categories, body.startDate, body.endDate, body.location);
            for (let i = 0; i < numberOfPages; i++) {
                // Clone the filter and then pass
                let clonedFilters = JSON.parse(JSON.stringify(filter));
                if (i != 0) {
                    clonedFilters.skip = i * EVENTS_PER_PAGE_QB;
                }
                promises.push(QBManager.listTable('Events', clonedFilters));
            }

            let responseEvents = await Promise.all(promises);

            console.log('responseEvents parallel', responseEvents.length);
            // concat all results
            let finalEvents = [];
            if (responseEvents && responseEvents.length > 0) {
                for (let e of responseEvents) {
                    if (e && e.length > 0) {
                        finalEvents.push(...await postProcessEvents(e));
                    }
                }
            }
            console.log('finalEvents parallel', finalEvents);
            return finalEvents;

        }

    } catch (error) {
        console.error("error : ", error);
    }
    return [];
};

// This function gets event from GPL
const getEventsPageFromGPL = async (url, page) => {
    console.log('getEvents', url, page);
    url += '&page_no=' + page;
    let options = {
        method: 'GET',
        uri: url
    };
    let response = await rp(options);
    console.log('Got response', response);
    if (response) {
        response = JSON.parse(response);
        let finalResponse = {
            total: response.total || 0,
            events: []
        }
        if ('results' in response && response.results && response.results.length > 0) {
            // Map each event as per Add event lambda
            let events = [];
            for (let event of response.results) {
                let qbEvent = {
                    id: event.id,
                    category: (event.category ? event.category.toLowerCase() : ''),
                    description: event.description,
                    title: event.title,
                    location: [event.location[0], event.location[1]],
                    start: event.startDate,
                    end: event.endDate,
                    entities: {
                        venues: [{ name: (event.address || '') }]
                    },
                    image: event.image
                }

                events.push(qbEvent);
            }
            if (events && events.length > 0) {
                let session = await QBManager.getCurrentSession();
                let event = {
                    session: session,
                    body: JSON.stringify(events)
                }
                let response = await post.handler(event);
                console.log(response);
                if (response && 'body' in response && response.body) {
                    let body = JSON.parse(response.body);
                    if (body) {
                        finalResponse.events = body.map(e => mapQBEventToControllerEvent(e));
                    }
                }
            }
        }

        return finalResponse;
    }
    return null;
};
// This function is used to get event from GPL
const getEventsFromGPL = async (body) => {
    console.log('Inside getEventsFromGPL');
    try {
        let startDate = moment.utc(body.startDate).valueOf();
        let endDate = moment.utc(body.endDate).valueOf();
        let url = `${process.env.GPL_BASE_URL}/events?items_per_page=${ITEMS_PER_PAGE}&start=${startDate}&end=${endDate}&within=30&lat=${body.location[0]}&long=${body.location[1]}&api_key=${process.env.GPL_API_KEY}&category=${body.categories.join()}`;

        // Get the first page
        let response = await getEventsPageFromGPL(url, 0);
        let finalEvents = [];
        if (response && 'total' in response && response.total > 0) {
            let numberOfPages = 0;
            if ('events' in response && response.events && response.events.length > 0) {
                finalEvents.push(...response.events);
            }
            // This is done since we have already got page 1
            response.total = response.total - ITEMS_PER_PAGE;
            if (response.total > ITEMS_PER_PAGE) {
                numberOfPages = Math.floor(response.total / ITEMS_PER_PAGE);
                // This is done if event count is 12 then pages are 2
                if (response.total % ITEMS_PER_PAGE > 0) {
                    numberOfPages = numberOfPages + 1;
                }
            }
            console.log('Number of pages', numberOfPages);

            // Make parallel call to get all events
            let promises = [];
            for (let i = 0; i < numberOfPages; i++) {
                promises.push(getEventsPageFromGPL(url, i));
            }

            let responseEvents = await Promise.all(promises);

            console.log('responseEvents parallel', responseEvents);
            // concat all results
            if (responseEvents && responseEvents.length > 0) {
                for (let e of responseEvents) {
                    if ('events' in e && e.events && e.events.length > 0) {
                        finalEvents.push(...e.events);
                    }
                }
            }
            console.log('finalEvents parallel', finalEvents.length);
            return finalEvents;
        }
    } catch (error) {
        console.error("error : ", error);
    }
    return [];
}


// This function is used to map event
const mapQBEventToControllerEvent = (QBEvent) => {
    let data = {
        title: QBEvent.event_name || QBEvent.Event_Name,
        start: moment(QBEvent.start_date_time).format(DATE_FORMAT),
        category: QBEvent.category || 'concerts',
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
        event_admin: []
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

// This function get promo events from QB
const getPromoEvents = async (body) => {
    try {
        let filter = createParameterForQB(body.categories, body.startDate, body.endDate, body.location);
        filter = Object.assign({ isPHQ: { ne: true } }, filter);
        console.log('Sending following filters to QB for not promoted:', JSON.stringify(filter));

        let data = await QBManager.listTable('Events', filter);
        //checking if filtered data exists in quickblox or not
        if (data && data.length > 0) {
            data = data.map(QBEvent => {
                return mapQBEventToControllerEvent(QBEvent);
            });
            return data;
        }
    } catch (error) {
        console.error("error : ", error);
    }
    return [];
};
// This is the main function called by APIs
module.exports.handler = async function (event, context, callback) {
    console.log('Got event', JSON.stringify(event));

    let body = {
        categories: ["concerts", "festivals", "performing-arts", "community", "sports", "politics"],
        startDate: "2019-09-28",
        endDate: "2019-10-5",
        location: [25.7616798, -80.19179020000001]
    };
    if (event.body) {
        body = JSON.parse(event.body);
    }

    // Get events from QB
    let events = await getEventsFromQbParallely(body);
    console.log('qbEvents', events.length);

    if (!(events && events.length > 5)) {
        // getting data from phq if data doesn't exist in quickblox
        console.log("getting data from GPL APIs");
        let gplEventsPromise = getEventsFromGPL(body);
        let promoEventsPromise = getPromoEvents(body);

        let gplEvents = await gplEventsPromise;
        if (gplEvents && gplEvents.length > 0) {
            events.push(...gplEvents);
        }
        let promoEvents = await promoEventsPromise;
        if (promoEvents && promoEvents.length > 0) {
            events.push(...promoEvents);
        }

    }

    // Remove duplicates if any
    let finalEvents = [];
    if (events && events.length) {
        let uniqueEvents = [];
        for (let event of events) {
            if (!(event.id in uniqueEvents) && allowed_categories.includes(event.category)) {
                if (event.category === 'performing arts') {
                    event.category = 'performing-arts';
                }
                finalEvents.push(event);
                uniqueEvents.push(event.id);
            }
        }
    }
    console.log('finalEvents', finalEvents.length);
    return awsRequestHelper.respondWithJsonBody(200, finalEvents);
}
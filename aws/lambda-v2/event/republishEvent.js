const awsRequestHelper = require("../../lambda/common/awsRequestHelper");
const request = require('request');
const MDB = require("../common/mysqlmanager");
const utils = require('../common/utils');
const MDBObject = new MDB();
const moment = require('moment');
const momentTz = require('moment-timezone');
const dateFormatDB = "YYYY-MM-DD HH:mm:ss";
const SaleDateFormatDB = "YYYY-MM-DD";
const _ = require('lodash');
const { errorMessages, successMessages } = require("../common/constants");

//Remove html tag from description
let strip_html_tags = (str) => {
    if ((str === null) || (str === '')) {
        return false;
    } else {
        var string = str.toString();
        return string.replace(/<[^>]*>/g, '');
    }
};

//generate dynamic link for event
const generateEventDynamicLink = (event) => {
    if (event.event_description) {
        event.event_description = strip_html_tags(event.event_description);
    }

    return new Promise((resolve, reject) => {
        let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
        request({
            url: `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyC5Bis-UR8qn16xDukoGHJkIMa8Q8nv7XI`,
            method: 'POST',
            json: true,
            body: {
                "dynamicLinkInfo": {
                    "domainUriPrefix": "https://thepromoapp.page.link",
                    "link": `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`,
                    "androidInfo": {
                        "androidPackageName": "com.thepromoapp.promo",
                        "androidFallbackLink": "https://play.google.com/store/apps/details?id=com.thepromoapp.promo"
                    },
                    "iosInfo": {
                        "iosBundleId": "com.thepromoapp.promo",
                        "iosCustomScheme": "promoapp",
                        "iosFallbackLink": "https://apps.apple.com/in/app/the-promo-app/id1075964954",
                        "iosIpadFallbackLink": "https://apps.apple.com/in/app/the-promo-app/id1075964954",
                        "iosIpadBundleId": "com.thepromoapp.promo"
                    },
                    "socialMetaTagInfo": {
                        "socialTitle": event.event_name,
                        "socialDescription": event.event_description,
                        "socialImageLink": event.event_image
                    }
                }
            }
        }, function (error, response) {
            if (error) {
                return reject(error);
            } else {
                if (response && response.statusCode == 200) {
                    return resolve(response.body)
                } else {
                    console.log('Error on Request :', response.body.error.message)
                    return reject(response.body.error.message);
                }
            }
        });
    })
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        event.body = JSON.parse(event.body);
        let user = await utils.verifyUser(event.headers.Authorization);
        let eventId = event.body.event_id;
        var whereQry = { event_id: eventId, _user_id: user['id'] };
        var fieldsObj = "*";
        return MDBObject.getData("event_master", fieldsObj, whereQry).then(async (data) => {
            if (data.length > 0) {

                let apiData = JSON.parse(JSON.stringify(data[0]));
                whereQry = { _event_id: apiData.event_id };
                
                delete apiData.event_id;
                delete apiData.date_created;
                delete apiData.date_modified;

                let eventTickets = [];
                let current_date_time = new Date(Date.now());
                let start_date;
                let end_date;
                
                apiData.parent_event_id = eventId;
                
                if(event.body && event.body.event_name){
                    apiData.event_name = event.body.event_name;
                } else {
                    apiData.event_name = "Copy of "+apiData.event_name;
                }

                apiData.status = 'active';
                apiData.isPHQ = 0;
                apiData.claimed_by = 0;
                apiData.is_draft = 1;

                if(event.body){
                    if (event.body.timezone && event.body.timezone != '') {
                        apiData.timezone = event.body.timezone;
                    }
                    if (event.body.description && event.body.description != '') {
                        apiData.description = event.body.description;
                    }
                    if (event.body.start_date_time && event.body.end_date_time) {
                        apiData.start_date_time = event.body.start_date_time;
                        apiData.end_date_time = event.body.end_date_time;
                    }
                }

                if (event.body && event.body.start_date_time && event.body.end_date_time) {
                    apiData.start_date_time = event.body.start_date_time;
                    apiData.end_date_time = event.body.end_date_time;                
                } else{
    
                    start_date = new Date(apiData.start_date_time);
                    end_date  = new Date(apiData.end_date_time);
                    let UTCFullYear = current_date_time.getUTCFullYear();
                    let UTCMonth = current_date_time.getUTCMonth();
                    let UTCDate = current_date_time.getUTCDate();
                    
                    apiData.start_date_time = moment(new Date(Date.UTC(
                        UTCFullYear, UTCMonth, UTCDate,
                        start_date.getUTCHours(), start_date.getUTCMinutes(), start_date.getUTCSeconds()
                    ))).format(dateFormatDB);
    
                    apiData.end_date_time = moment(new Date(Date.UTC(
                        UTCFullYear, UTCMonth, UTCDate + 2,
                        end_date.getUTCHours(), end_date.getUTCMinutes(), end_date.getUTCSeconds()
                    ))).format(dateFormatDB);
                }

                start_date = new Date(apiData.start_date_time);
                end_date  = new Date(apiData.end_date_time);
                
                if (apiData.timezone && apiData.timezone != '') {
                    apiData.start_date_utc = momentTz.tz(apiData.start_date_time, dateFormatDB, apiData.timezone).utc().format(dateFormatDB);
                    apiData.end_date_utc = momentTz.tz(apiData.end_date_time, dateFormatDB, apiData.timezone).utc().format(dateFormatDB);
                }
                
                return MDBObject.dataInsert("event_master", apiData).then(async (data) => {
                    let dataObj = {
                        event_id: data.insertId,
                        event_name: apiData.event_name,
                        event_image: apiData.event_image,
                    }
                    let eventDynamicLinkResult = await generateEventDynamicLink(dataObj);
                    if (eventDynamicLinkResult && ('shortLink' in eventDynamicLinkResult)) {
                        await MDBObject.dataUpdate("event_master", { "dynamic_link": eventDynamicLinkResult.shortLink }, { event_id: data.insertId });
                    }

                    let layoutDetails = await MDBObject.getData('seat_layout_master', '*', whereQry);
                    if (layoutDetails && layoutDetails.length > 0) {
                        let seatlayoutData = JSON.parse(JSON.stringify(layoutDetails[0]));
                        let seatingPlan = {
                            _event_id: data.insertId,
                            _user_id: user.id,
                            front_layout_file: seatlayoutData.front_layout_file,
                            back_layout_file: seatlayoutData.back_layout_file,
                            layout_thumbnail_url: seatlayoutData.layout_thumbnail_url,
                            venue_map_name: seatlayoutData.venue_map_name
                        }
                        if (seatlayoutData.total_seating_capacity) {
                            seatingPlan.total_seating_capacity = seatlayoutData.total_seating_capacity;
                        }
                        if (seatlayoutData.tiers_assigned_seats) {
                            seatingPlan.tiers_assigned_seats = seatlayoutData.tiers_assigned_seats;
                        }
                        if ('is_draft' in seatlayoutData) {
                            seatingPlan.is_draft = seatlayoutData.is_draft
                        }

                        let layoutData = await MDBObject.dataInsert("seat_layout_master", seatingPlan);
                        if (layoutData) {
                            let layoutId = JSON.parse(JSON.stringify(layoutData.insertId));
                            let seat_tiers = await MDBObject.getData('seat_tier_master', '*', { _layout_id: seatlayoutData.layout_id });
                            if (seat_tiers && seat_tiers.length > 0) {
                                await Promise.all(seat_tiers.map(async (tier) => {
                                    let tierData = {
                                        _layout_id: layoutId,
                                        name: tier.name,
                                        color: tier.color,
                                        seating_capacity: tier.seating_capacity,
                                        tier_array_no: tier.tier_array_no
                                    };
                                    let newTierData = await MDBObject.dataInsert("seat_tier_master", tierData);
                                    let tier_id = JSON.parse(JSON.stringify(newTierData.insertId));
                                    MDBObject.getData("event_tickets", fieldsObj, { _tier_id: tier.tier_id }).then(async (tickets) => {
                                        if (tickets && tickets.length > 0) {
                                            eventTickets = tickets;
                                            await Promise.all(eventTickets.map(async ticketDetails => {
                                                delete ticketDetails.ticket_id;
                                                delete ticketDetails.date_modified;
                                                delete ticketDetails.date_created;
                                                ticketDetails.sale_start_date = momentTz.tz(start_date, SaleDateFormatDB, apiData.timezone).utc().format(SaleDateFormatDB);
                                                ticketDetails.sale_end_date = momentTz.tz(end_date, SaleDateFormatDB, apiData.timezone).utc().format(SaleDateFormatDB);
                                                ticketDetails._tier_id = tier_id;
                                                ticketDetails._event_id = data.insertId;
                                                ticketDetails.remaining_qty = ticketDetails.quantity;
                                                await MDBObject.dataInsert("event_tickets", ticketDetails);
                                                // return ticketDetails;
                                            }));
                                        }
                                    })
                                }))
                            }
                        }
                    } else {
                        MDBObject.getData("event_tickets", fieldsObj, whereQry).then(async (tickets) => {
                            if (tickets && tickets.length > 0) {
                                eventTickets = tickets;
                                await Promise.all(eventTickets.map(async ticketDetails => {
                                    delete ticketDetails.ticket_id;
                                    delete ticketDetails.date_modified;
                                    delete ticketDetails.date_created;
                                    ticketDetails.sale_start_date = momentTz.tz(start_date, SaleDateFormatDB, apiData.timezone).utc().format(SaleDateFormatDB);
                                    ticketDetails.sale_end_date = momentTz.tz(end_date, SaleDateFormatDB, apiData.timezone).utc().format(SaleDateFormatDB);
                                    ticketDetails._event_id = data.insertId;
                                    ticketDetails.remaining_qty = ticketDetails.quantity;
                                    await MDBObject.dataInsert("event_tickets", ticketDetails);
                                    // return ticketDetails;
                                }));
                            }
                        }).catch((error) => {
                            console.error("error : ", error);
                            return awsRequestHelper.respondWithJsonBody(500, response);
                        });
                    }
                    response = {
                        success: true,
                        message: successMessages.REPUBLISH_EVENT_CREATED,
                        event_id: data.insertId
                    }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }).catch((error) => {
                    console.error("error : ", error);
                    return awsRequestHelper.respondWithJsonBody(500, response);
                });
            } else {
                response = { success: false, message: errorMessages.NO_EVENTS_FOUND }
            }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch((error) => {
            console.error("error : ", error);
            return awsRequestHelper.respondWithJsonBody(500, response);
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
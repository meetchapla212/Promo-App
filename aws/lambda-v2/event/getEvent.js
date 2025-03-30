const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const Joi = require("joi");
const utils = require("./../common/utils");
const moment = require("moment");
const request = require("request");
// const md5 = require("md5");
const {
    eventAccessTypes,
    eventPrivacyTypes,
    dynamicLinks,
    privateMessage,
    successMessages,
    errorMessages
} = require("../common/constants");

//Remove html tag from description
let strip_html_tags = (str) => {
    if (str === null || str === "") {
        return false;
    } else {
        var string = str.toString();
        return string.replace(/<[^>]*>/g, "");
    }
};

//generate dynamic link for event
const generateEventDynamicLink = (event) => {
    if (event.event_description) {
        event.event_description = strip_html_tags(event.event_description);
    }

    return new Promise((resolve, reject) => {
        let event_name = event.event_name.replace(/\s+/g, "-").toLowerCase();
        request({
            url: `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyC5Bis-UR8qn16xDukoGHJkIMa8Q8nv7XI`,
            method: "POST",
            json: true,
            body: {
                dynamicLinkInfo: {
                    domainUriPrefix: dynamicLinks.domainUriPrefix,
                    link: `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`,
                    androidInfo: {
                        androidPackageName: dynamicLinks.androidPackageName,
                        androidFallbackLink: dynamicLinks.androidFallbackLink,
                    },
                    iosInfo: {
                        iosBundleId: dynamicLinks.iosBundleId,
                        iosCustomScheme: dynamicLinks.iosCustomScheme,
                        iosFallbackLink: dynamicLinks.iosFallbackLink,
                        iosIpadFallbackLink: dynamicLinks.iosIpadFallbackLink,
                        iosIpadBundleId: dynamicLinks.iosIpadBundleId
                    },
                    socialMetaTagInfo: {
                        socialTitle: event.event_name,
                        socialDescription: event.event_description,
                        socialImageLink: event.event_image
                    }
                }
            }
        }, function (error, response) {
            if (error) {
                console.error("error : ", error);
                return reject(error);
            } else {
                if (response && response.statusCode == 200) {
                    console.log("Dynamic Link :", response.body);
                    return resolve(response.body);
                } else {
                    console.log("Error on Request :", response.body.error.message);
                    return reject(response.body.error.message);
                }
            }
        });
    })
}

// joi validation
const validate = async (body) => {
    const schema = Joi.object().keys({
        password: Joi.string().optional(),
        passwordToken: Joi.string().optional(),
    });
    return await Joi.validate(body, schema, { abortEarly: false });
};

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let eventId = event.pathParameters.event_id;
        var whereQry = { event_id: eventId };

        return MDBObject.getData("event_master", "*", whereQry).then(async (data) => {
            if (data.length > 0) {
                var eventDetails = data[0];
                var minEventDetails = {};
                let user;
                try {
                    user = await utils.verifyJWT(event.headers.Authorization);
                } catch (e) {

                }

                let administrator = await MDBObject.runQuery("SELECT event_administrator.administrator_id,event_administrator._user_id as user_id,user_master.username,user_master.first_name,user_master.last_name, user_master.profile_pic,user_master.email FROM event_administrator JOIN user_master ON user_master.user_id = event_administrator._user_id  WHERE event_administrator._event_id = " + eventId);
                eventDetails.event_admin = JSON.stringify(administrator);

                let userDetails = await MDBObject.getData("user_master", "*", { user_id: eventDetails._user_id });
                if (userDetails.length > 0) {
                    delete userDetails[0].password;
                    eventDetails.organizer_details = userDetails[0];
                } else {
                    eventDetails.organizer_details = {};
                }

                // user is admin if id of current logged in user is same as administrator user_id
                const isAdmin = user && user.id == eventDetails._user_id;
                const { privacy_type, event_access_type } = eventDetails;
                // check private event conditions
                if (!isAdmin && (privacy_type && privacy_type == eventPrivacyTypes.PRIVATE)) {
                    // for event_access_type 1 (LINK), do nothing since user got here using a link

                    // minimum event details we can show even in case of private event
                    minEventDetails = {
                        event_id: eventId,
                        event_name: eventDetails.event_name,
                        address: eventDetails.address,
                        start_date_time: eventDetails.start_date_time,
                        end_date_time: eventDetails.end_date_time,
                        event_admin: eventDetails.event_admin,
                        event_image: eventDetails.event_image,
                        city: eventDetails.city,
                        address_state: eventDetails.address_state,
                        country: eventDetails.country,
                    };

                    if (userDetails.length > 0) {
                        minEventDetails.organizer_details = {
                            first_name: userDetails[0].first_name,
                            last_name: userDetails[0].last_name,
                            username: userDetails[0].username,
                        };
                    } else {
                        minEventDetails.organizer_details = {};
                    }

                    if (event_access_type == eventAccessTypes.INVITE_ONLY) {
                        // only logged in users can access
                        const { queryStringParameters } = event;
                        let invite_id;
                        if (queryStringParameters) {
                            invite_id = queryStringParameters.invite_id;
                        }
                        if (user && !invite_id) {
                            // check if invitation exists in isInvited table
                            const [isInvited] = await MDBObject.getData("private_event_invitations", "email", { email: user.email, event_id: eventId });
                            if (!isInvited) {
                                return awsRequestHelper.respondWithJsonBody(200, {
                                    success: true,
                                    data: {
                                        ...minEventDetails,
                                        privateEventMessage: privateMessage.NOT_INVITED
                                    },
                                    message: errorMessages.EMAIL_NOT_INVITED_TO_THIS_EVENT
                                });
                            }
                        } else {
                            if (invite_id) {
                                const [invite] = await MDBObject.getData("private_event_invitations", "email", { invite_id });
                                if (invite) {
                                    eventDetails.invitedUserEmail = invite.email;
                                } else {
                                    return awsRequestHelper.respondWithJsonBody(200, {
                                        success: true,
                                        data: {
                                            ...minEventDetails,
                                            privateEventMessage: privateMessage.INVITE_INVALID_OR_EXPIRED
                                        },
                                        message: errorMessages.INVITE_LINK_INVALID_OR_EXPIRED
                                    });
                                }
                            } else {
                                return awsRequestHelper.respondWithJsonBody(200, {
                                    success: true,
                                    data: {
                                        ...minEventDetails,
                                        privateEventMessage: privateMessage.LOGIN_REQUIRED
                                    },
                                    message: errorMessages.LOGIN_TO_VIEW_EVENT
                                });
                            }
                        }
                    } else if (event_access_type == eventAccessTypes.PASSWORD) {
                        let password;
                        let passwordToken;
                        if (event && event.queryStringParameters) {
                            password = event.queryStringParameters.password;
                            passwordToken = event.queryStringParameters.passwordToken;
                        }
                        await validate({ password, passwordToken });

                        // return little data and prompt for password
                        if (!password && !passwordToken) {
                            return awsRequestHelper.respondWithJsonBody(200, {
                                success: true,
                                data: {
                                    ...minEventDetails,
                                    privateEventMessage: privateMessage.PASSWORD_REQUIRED
                                },
                                message: errorMessages.PASSWORD_REQUIRED_TO_VIEW_EVENT,
                            });
                        }

                        // passwordToken is sent to user if they provide a correct password.
                        // this is valid for 30 minutes, after which, the user must request another
                        let skipPasswordCheck = false;
                        if (passwordToken) {
                            const eventData = utils.verifyJWT(passwordToken);
                            if (eventData.event_id !== eventId && !password) {
                                return awsRequestHelper.respondWithJsonBody(422, {
                                    success: true,
                                    data: {
                                        ...minEventDetails,
                                        privateEventMessage: privateMessage.PASSWORD_REQUIRED
                                    },
                                    message: errorMessages.INCORRECT_PASSWORD_TOKEN,
                                });
                            }
                            eventDetails.passwordToken = passwordToken;
                            skipPasswordCheck = true;
                        }
                        // unsafe compare. This comparison should ideally be done on the database side
                        if (!skipPasswordCheck) {
                            // if (md5(password) == eventDetails.password) {
                            if (password == eventDetails.password) {
                                // generate passwordToken and set value in eventData
                                // passwordToken expires in 30 mins
                                const passwordExpiry = new Date().getTime() + 1800000;
                                eventDetails.passwordToken = utils.createJWT({ event_id: eventId }, passwordExpiry);
                                // delete password from eventDetails
                                delete eventDetails.password;
                            } else {
                                // passwords did not match, return error
                                return awsRequestHelper.respondWithJsonBody(422, { ...response, message: errorMessages.INCORRECT_PASSWORD });
                            }
                        }
                    }
                }

                if (isAdmin) {
                    eventDetails.private_event_invitations = await MDBObject.getData("private_event_invitations", "email", {
                        event_id: eventDetails.event_id
                    });
                }
                let startDate = new Date(eventDetails.date_modified);
                let endDate = new Date('2021-05-07');
                if (!eventDetails.dynamic_link || startDate < endDate) {
                    let dataObj = {
                        event_id: eventDetails.event_id,
                        event_name: eventDetails.event_name,
                        event_image: eventDetails.event_image,
                        event_description: eventDetails.description.substring(0, 100),
                    };

                    let eventDynamicLinkResult = await generateEventDynamicLink(dataObj);
                    if (eventDynamicLinkResult && "shortLink" in eventDynamicLinkResult) {
                        eventDetails["dynamic_link"] = eventDynamicLinkResult.shortLink;
                        await MDBObject.dataUpdate("event_master", { dynamic_link: eventDynamicLinkResult.shortLink }, { event_id: eventDetails.event_id });
                    }
                }
                if (eventDetails._zone_id && eventDetails._zone_id != "") {
                    eventDetails.zone_details = await MDBObject.getData("zone_master", "*", { zone_id: eventDetails._zone_id }).then(resZone => {
                        if (resZone.length > 0) {
                            return resZone[0];
                        } else {
                            return {};
                        }
                    });
                } else {
                    eventDetails.zone_details = {};
                }
                // delete eventDetails.guests;
                delete eventDetails.tickets;
                let EventTickets = await MDBObject.getData("event_tickets", "*", { _event_id: eventDetails.event_id });
                let eventGuest = await MDBObject.runQuery("SELECT guest_users.*,user_master.profile_pic,user_master.username,user_master.first_name,user_master.last_name,user_master.mobile_number FROM guest_users left join user_master on(guest_users._user_id = user_master.user_id or guest_users._user_id = 0) WHERE guest_users._event_id = " + eventDetails.event_id + "  AND guest_users.is_deleted = 0 AND user_master.is_deleted = 0 group by guest_id");
                eventDetails.tickets_list = EventTickets;
                let ticketCountQuery = `SELECT SUM(quantity) as total_tickets , SUM(remaining_qty) as remaining_tickets ,(SUM(quantity) - SUM(remaining_qty)) as sold_tickets FROM event_tickets WHERE _event_id = ${eventId} AND is_deleted = 0`;
                eventDetails.sold_count = 0;
                await MDBObject.runQuery(ticketCountQuery).then(ticketsCounts => {
                    eventDetails.sold_count = ticketsCounts[0].sold_tickets ? ticketsCounts[0].sold_tickets * 1 : 0;
                });
                eventDetails.guests = eventGuest;
                let rewardGetQuery = `SELECT * FROM reward_master WHERE _event_id = ${eventId} AND is_draft = 0 AND (status = 'active' OR status = 'completed' )`;
                let rewardDetails = await MDBObject.runQuery(rewardGetQuery);
                if (rewardDetails.length > 0) {
                    eventDetails.reward_details = rewardDetails[0];
                    eventDetails.reward_details.start_date_ms = moment(eventDetails.reward_details.start_date).format("X");
                    eventDetails.reward_details.end_date_ms = moment(eventDetails.reward_details.end_date).format("X");
                } else {
                    eventDetails.reward_details = {};
                }

                let checkoutFormQuery = `SELECT COUNT(*) as totalCount FROM event_checkout_form WHERE _event_id = ${eventId} AND is_deleted = 0`;
                let checkoutForm = await MDBObject.runQuery(checkoutFormQuery);
                if (checkoutForm && checkoutForm[0].totalCount) {
                    eventDetails.is_checkout_form = true;
                } else {
                    eventDetails.is_checkout_form = false;
                }

                if (event.headers.Authorization) {
                    let user = await utils.verifyJWT(event.headers.Authorization);
                    if (user && user.id) {
                        let event_name = eventDetails.event_name.replace(/\s+/g, "-").toLowerCase();
                        eventDetails.event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${eventId}?ref=${user.id}`;
                    } else {
                        eventDetails.event_url = "";
                    }
                }

                //get event seating layout details
                eventDetails.layout_details = {};
                var fieldsObj = "layout_id, _event_id, _user_id, front_layout_file, back_layout_file, layout_thumbnail_url, is_draft, venue_map_name, total_seating_capacity, tiers_assigned_seats";
                var whereQry = { _event_id: eventId };
                await MDBObject.getData("seat_layout_master", fieldsObj, whereQry).then(async (seatingPlanDetails) => {
                    if (seatingPlanDetails.length > 0) {
                        eventDetails.layout_details = seatingPlanDetails[0];
                        eventDetails.layout_details.total_sold_tier_seats = 0;
                        eventDetails.layout_details.tiers = [];
                        //get seating layout tier details
                        let fieldsObj = "seat_tier_master.tier_id, seat_tier_master._layout_id, seat_tier_master.name, seat_tier_master.color, seat_tier_master.seating_capacity, seat_tier_master.tier_array_no";
                        let sitePlanTires = await MDBObject.getJoinedData("seat_layout_master", "seat_tier_master", "layout_id", "_layout_id", fieldsObj, { layout_id: eventDetails.layout_details.layout_id });
                        if (sitePlanTires.length > 0) {

                            var getTierTicketsQuery = { _event_id: eventId };
                            var layoutAllTickets = await MDBObject.getData("event_tickets", "*", getTierTicketsQuery);

                            var layoutAllReservedSeats = await MDBObject.runQuery(`SELECT user_ticket_details._tier_id, user_ticket_details._ticket_id, user_ticket_details._seat_id FROM user_ticket_details JOIN user_tickets ON user_ticket_details._purchased_ticket_id = user_tickets.id AND user_tickets.event_status = 'approved' WHERE user_ticket_details._layout_id = ${eventDetails.layout_details.layout_id} AND user_ticket_details.is_deleted = 0 AND user_ticket_details.status = 'active'`);

                            var getTierHoldSeatsQuery = { _layout_id: eventDetails.layout_details.layout_id, is_deleted: 0 };
                            var layoutAllHoldSeats = await MDBObject.getData("seat_holding_master", "_tier_id, _ticket_id, _seat_id", getTierHoldSeatsQuery, "AND");

                            await Promise.all(sitePlanTires.map((tire) => {
                                var tierTickets = layoutAllTickets.filter((ticket) => ticket._tier_id === tire.tier_id);
                                tire["tickets"] = tierTickets;

                                var tierReservedSeats = layoutAllReservedSeats.filter((seat) => seat._tier_id === tire.tier_id);
                                eventDetails.layout_details.total_sold_tier_seats = eventDetails.layout_details.total_sold_tier_seats * 1 + tierReservedSeats.length;
                                tire["reserved_seats"] = tierReservedSeats;

                                var tierHoldSeats = layoutAllHoldSeats.filter((seat) => seat._tier_id === tire.tier_id);
                                tire["hold_seats"] = tierHoldSeats;

                                return tire;
                            })).then((tireDetails) => {
                                eventDetails.layout_details.tiers = tireDetails;
                            });
                        }
                    }
                });
                response = { success: true, message: successMessages.SUCCESS_EVENT_LIST, data: eventDetails };
            } else {
                response = { success: false, message: errorMessages.NO_EVENTS_FOUND };
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
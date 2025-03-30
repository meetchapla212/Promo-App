const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require("joi");
const MDB = require("./../common/mysqlmanager");
const utils = require("../common/utils");
const MDBObject = new MDB();
const AWSManager = require("../common/awsmanager");
const dateFormat = "ddd, MMMM D, YYYY [at] hh:mm A";
const moment = require("moment");
const momentTz = require("moment-timezone");
const dateFormatDB = "YYYY-MM-DD HH:mm:ss";
const fs = require("fs");
const _ = require("lodash");
const { v4: uuidv4 } = require("uuid");
const { updateUserInvitations } = require("./updateUserInvitations");
// const md5 = require("md5");
// let emailToken = uuidv4();
const FILE_PATH = __filename;
const {
    errorMessages,
    stringMessages,
    successMessages,
    emailAndPushNotiTitles,
} = require("../common/constants");

const categoryDisplayName = {
    concerts: "Concerts",
    festivals: "Festivals",
    "programing-arts": "Performing arts",
    "performing-arts": "Performing arts",
    community: "Community",
    sports: "Sports",
    politics: "Rally",
};

const validate = function (body) {
    const schema = Joi.object().keys({
        is_draft: Joi,
        description: Joi.string().allow(""),
        event_type: Joi.string().allow(""),
        event_image: Joi.string().allow(""),
        address: Joi.string().allow(""),
        sponsored_event: Joi,
        isPHQ: Joi,
        guest: Joi.string().allow(""),
        start_date_time: Joi.string().allow(""),
        end_date_time: Joi.string().allow(""),
        longitude: Joi.allow(""),
        latitude: Joi.allow(""),
        category: Joi.string().allow(""),
        event_name: Joi.string().allow(""),
        phone: Joi.allow(""),
        email: Joi.string().allow(""),
        ticket_type: Joi.string().allow(""),
        state: Joi.string().allow(""),
        admission_ticket_type: Joi.allow(""),
        timezone: Joi.string().allow(""),
        venue_is: Joi.string().allow(""),
        street_address: Joi.string().allow(""),
        address_state: Joi.string().allow(""),
        city: Joi.string().allow(""),
        country_code: Joi.string().allow(""),
        country: Joi.string().allow(""),
        zipcode: Joi.string().allow(""),
        privacy_type: Joi.number().optional(),
        event_access_type: Joi.number().optional(),
        // event_access_type: Joi.number().when("privacy_type", {
        //     is: Joi.equal(2),
        //     then: Joi.required(),
        //     otherwise: Joi.optional(),
        // }),
        password: Joi.string().optional(),
        // password: Joi.string().when("event_access_type", {
        //     is: Joi.equal(3),
        //     then: Joi.required(),
        //     otherwise: Joi.optional(),
        // }),
        private_invitation_list: Joi.array().items(Joi.string()).optional(),
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
            allowUnknown: true,
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
};

const deleteGuest = async function (guestid) {
    let guestIdArray = guestid.split(",");
    guestIdArray.forEach(async (guest_id) => {
        var dataObj = { is_deleted: 1 };
        var whereQry = { guest_id: guest_id };
        await MDBObject.dataUpdate("guest_users", dataObj, whereQry);
    });
};

const deleteTickets = async function (ticketsId) {
    let guestIdArray = ticketsId.split(",");
    guestIdArray.forEach(async (tickets_id) => {
        var dataObj = { is_deleted: 1 };
        var whereQry = { ticket_id: tickets_id };
        await MDBObject.dataUpdate("event_tickets", dataObj, whereQry);
    });
};
const deleteAdmin = async function (adminId) {
    let adminArray = adminId.split(",");
    adminArray.forEach(async (admin_id) => {
        await MDBObject.runQuery("DELETE FROM event_administrator WHERE administrator_id = " + admin_id);
    });
};

// a very unoptimised function
const sendMailToPrivateEventGuest = async function (event, guest, event_id, eventTickets, user, address) {
    if (guest.email && guest.email !== "") {
        event = await MDBObject.getData("event_master", "*", { event_id: event_id }).then((dataEvent) => {
            return dataEvent[0];
        });
        let event_name = event.event_name.replace(/\s+/g, "-").toLowerCase();
        // $scope.rewardUrl = base_url + "/eventdetails/" + event_name + '/' + $scope.event_details.event_id + "?ref=" + $scope.userDetails.user_id;
        let tmpl = fs.readFileSync("./lambda/emailtemplates/invite-attendee-to-private-event.html", "utf8");
        let mailSubject = emailAndPushNotiTitles.YOU_ARE_NOT_INVITED_TO + event.event_name;
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event_id}?invite_id=${guest.invite_id}`;

        let googleUrl = "https://maps.google.com/?ll=" + event.latitude + "," + event.longitude;
        let image_url = event.event_image;
        let ticketPrice = "FREE";
        if (event.ticket_type && event.ticket_type === "paid") {
            if (eventTickets) {
                let tickets = eventTickets;
                tickets = tickets.filter((t) => !t.status || t.status == "active");
                tickets = tickets.sort((a, b) => {
                    if ("price" in a && "price" in b) {
                        return a.price - b.price;
                    } else if ("price" in a) {
                        return -1;
                    } else if ("price" in b) {
                        return 1;
                    } else {
                        return -1;
                    }
                });
                ticketPrice = "$" + tickets[0].price;
            }
        }

        let showBtn = 0;
        if (event.ticket_type == "free") {
            if (eventTickets && eventTickets.length > 0) {
                showBtn = 1;
            } else {
                showBtn = 0;
            }
        } else {
            showBtn = 1;
        }

        let guestEmailerName = guest.email.split("@");
        let templateVars = {
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            encodedEventUrl: encodeURIComponent(event_url),
            name: utils.toTitleCase(guest.name ? guest.name : guestEmailerName[0]),
            buyTicketUrl: `${process.env.UI_BASE_URL}/ticket_type?ev=${event_id}`,
            longitude: event.longitude,
            latitude: event.latitude,
            title: event.event_name,
            category: categoryDisplayName[event.category],
            categoryImg: `${process.env.UI_BASE_URL}/img/${event.category}.png`,
            startDate: moment(event.start_date_time).format(dateFormat),
            endDate: moment(event.end_date_time).format(dateFormat),
            googleUrl: googleUrl,
            image_url: image_url,
            ticketType: event.ticket_type,
            ticketPrice: ticketPrice,
            org_name: utils.toTitleCase(
                user.first_name && user.last_name ? user.first_name + " " + user.last_name : user.username
            ),
            address: address,
            showBtn: showBtn,
            mailtosubject: encodeURIComponent(mailSubject),
        };
        let body = _.template(tmpl)(templateVars);
        return await AWSManager.sendEmail([guest.email], body, mailSubject);
    }
};

const sendMailToGuest = async function (event, guest, event_id, eventTickets, user, address) {
    if (guest.email && guest.email !== "") {

        event = await MDBObject.getData("event_master", "event_name, latitude, longitude, event_image, ticket_type, start_date_time, end_date_time, category", { event_id: event_id }).then((dataEvent) => {
            return dataEvent[0];
        });
        let event_name = event.event_name.replace(/\s+/g, "-").toLowerCase();
        let tmpl = fs.readFileSync("./lambda/emailtemplates/invite-attendee-free-without-tickets.html", "utf8");
        let mailSubject = emailAndPushNotiTitles.YOU_ARE_NOT_INVITED_TO + event.event_name;
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event_id}`;

        let googleUrl = "https://maps.google.com/?ll=" + event.latitude + "," + event.longitude;
        let image_url = event.event_image;
        let ticketPrice = "FREE";

        if (event.ticket_type && event.ticket_type === "paid") {
            if (eventTickets) {
                let tickets = eventTickets;
                tickets = tickets.filter((t) => !t.status || t.status == "active");
                tickets = tickets.sort((a, b) => {
                    if ("price" in a && "price" in b) {
                        return a.price - b.price;
                    } else if ("price" in a) {
                        return -1;
                    } else if ("price" in b) {
                        return 1;
                    } else {
                        return -1;
                    }
                });
                ticketPrice = "$" + tickets[0].price;
            }
        }

        let showBtn = 0;
        if (event.ticket_type == "free") {
            if (eventTickets && eventTickets.length > 0) {
                showBtn = 1;
            } else {
                showBtn = 0;
            }
        } else {
            showBtn = 1;
        }

        let guestEmailerName = guest.email.split("@");
        let templateVars = {
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            encodedEventUrl: encodeURIComponent(event_url),
            name: utils.toTitleCase(guest.name ? guest.name : guestEmailerName[0]),
            buyTicketUrl: `${process.env.UI_BASE_URL}/ticket_type?ev=${event_id}`,
            longitude: event.longitude,
            latitude: event.latitude,
            title: event.event_name,
            category: categoryDisplayName[event.category],
            categoryImg: `${process.env.UI_BASE_URL}/img/${event.category}.png`,
            startDate: moment(event.start_date_time).format(dateFormat),
            endDate: moment(event.end_date_time).format(dateFormat),
            googleUrl: googleUrl,
            image_url: image_url,
            ticketType: event.ticket_type,
            ticketPrice: ticketPrice,
            org_name: utils.toTitleCase(user.first_name && user.last_name ? user.first_name + " " + user.last_name : user.username),
            address: address,
            showBtn: showBtn,
            mailtosubject: encodeURIComponent(mailSubject),
        };
        let body = _.template(tmpl)(templateVars);
        return await AWSManager.sendEmail([guest.email], body, mailSubject);
    }
};

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await MDBObject.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
};

const notifyOrganiserOnEventUpdate = async (user, event) => {
    var userDeviceTokenData = await getUserDeviceToken(event._user_id);
    let eventUpdateTime = moment().format("YYYY-MM-DD HH:mm:ss");
    var userName = utils.toTitleCase(user.first_name && user.last_name ? user.first_name + " " + user.last_name : user.username);
    let EVENT_HAS_BEEN_MODIFIED_AT_BY = emailAndPushNotiTitles.EVENT_HAS_BEEN_MODIFIED_AT_BY;
    EVENT_HAS_BEEN_MODIFIED_AT_BY = EVENT_HAS_BEEN_MODIFIED_AT_BY
        .replace("<eventName>", event.event_name)
        .replace("<eventUpdateTime>", eventUpdateTime)
        .replace("<userName>", userName);

    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.EVENT_DETAILS_ARE_CHANGED,
            body: EVENT_HAS_BEEN_MODIFIED_AT_BY,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM,
            },
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: user.user_id,
        _event_id: event.event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({
            messageFrom: stringMessages.PROMO_TEAM,
        }),
        notify_user_id: event._user_id,
        notify_text: EVENT_HAS_BEEN_MODIFIED_AT_BY,
    };

    return await MDBObject.dataInsert("user_notification", saveObj);
};

//notify interested users and Users Who Bought Ticket For Event whenever the event details are changed and saved
const notifyUsersOnEventUpdate = async (event, user, userId) => {
    var userDeviceTokenData = await getUserDeviceToken(userId);
    let EVENT_HAS_BEEN_MODIFIED = emailAndPushNotiTitles.EVENT_HAS_BEEN_MODIFIED;
    EVENT_HAS_BEEN_MODIFIED = EVENT_HAS_BEEN_MODIFIED.replace('<eventName>', event.event_name);

    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.EVENT_DETAILS_ARE_CHANGED,
            body: EVENT_HAS_BEEN_MODIFIED,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM,
            },
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: user.user_id,
        _event_id: event.event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({
            messageFrom: stringMessages.PROMO_TEAM,
        }),
        notify_user_id: userId,
        notify_text: EVENT_HAS_BEEN_MODIFIED,
    };

    return await MDBObject.dataInsert("user_notification", saveObj);
};

const getEventUsersTickets = async (eventId) => {
    return new Promise(async (resolve, reject) => {
        let sqlQry = "SELECT user_id FROM user_tickets WHERE event_id = " + eventId + " AND user_tickets.event_status = 'approved' AND user_tickets.status = 'active'  group by user_tickets.user_id";
        let userTicket = await MDBObject.runQuery(sqlQry);
        return resolve(userTicket);
    });
};

async function getUserDetails(userId) {
    return new Promise(async (resolve, reject) => {
        let sqlQry = "SELECT email, is_email_verified, first_name, last_name, username FROM user_master WHERE user_id = " + userId + " ";
        let userDetails = await MDBObject.runQuery(sqlQry);
        return resolve(userDetails);
    });
}

const notifyUsersWhoBoughtTicketForEventOnEventUpdate = async (event, user) => {
    if (user.email && user.email !== "" && user.is_email_verified && user.is_email_verified == 1) {
        let tmpl = fs.readFileSync("./lambda/emailtemplates/notify_user_who_bought_ticket_on_event_update.html", "utf8");
        let mailSubject = emailAndPushNotiTitles.EVENT_DETAILS_CHANGED + event.event_name;
        let event_name = event.event_name.replace(/\s+/g, "-").toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        let templateVars = Object.assign({
            eventUrl: event_url,
            base_url: process.env.UI_BASE_URL,
            event_name: event.event_name,
            attendee_username: utils.toTitleCase(user.first_name && user.last_name ? user.first_name + " " + user.last_name : user.username),
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([user.email], mailBody, mailSubject);
    }
};

const notifyUsersWhoInterestedForEventOnEventUpdate = async (event, user) => {
    if (user.email && user.email !== "" && user.is_email_verified && user.is_email_verified == 1) {
        let tmpl = fs.readFileSync("./lambda/emailtemplates/notify_interested_users_on_event_update.html", "utf8");
        let mailSubject = emailAndPushNotiTitles.EVENT_DETAILS_CHANGED + event.event_name;
        let event_name = event.event_name.replace(/\s+/g, "-").toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        let templateVars = Object.assign({
            eventUrl: event_url,
            base_url: process.env.UI_BASE_URL,
            event_name: event.event_name,
            attendee_username: utils.toTitleCase(user.first_name && user.last_name ? user.first_name + " " + user.last_name : user.username),
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([user.email], mailBody, mailSubject);
    }
};

//------------------------------------------
//notify organiser on event create
const notifyOrganiserOnEventCreate = async (organiser, eventId, eventName) => {
    var organiserName = utils.toTitleCase(organiser.first_name && organiser.last_name ? organiser.first_name + " " + organiser.last_name : organiser.username);
    if (organiser.email && organiser.email !== "") {
        let tmpl = fs.readFileSync("./lambda/emailtemplates/notify_organiser_on_event_create.html", "utf8");
        let EVENT_CREATED_NAME = emailAndPushNotiTitles.EVENT_CREATED_NAME;
        EVENT_CREATED_NAME = EVENT_CREATED_NAME.replace('<eventName>', eventName)
        let mailSubject = EVENT_CREATED_NAME;
        let event_name = eventName.replace(/\s+/g, "-").toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${eventId}`;
        let manage_event_url = `${process.env.UI_BASE_URL}/manageevent#liveevents`;

        let templateVars = {
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            organiser_username: organiserName,
            event_name: eventName,
            manageEventUrl: manage_event_url,
        };
        let body = _.template(tmpl)(templateVars);
        return await AWSManager.sendEmail([organiser.email], body, mailSubject);
    }
};

//notify organiser on create event by push notification
const notifyOrganiserOnAddEventByPushNotification = async (organiser, eventId, eventName) => {
    var userDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    var organiserName = utils.toTitleCase(organiser.first_name && organiser.last_name ? organiser.first_name + " " + organiser.last_name : organiser.username);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.EVENT_CREATED,
            body: `Event ${eventName} created by ${organiserName}`,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM,
            },
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: organiser.user_id,
        _event_id: eventId,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({
            messageFrom: stringMessages.PROMO_TEAM,
        }),
        notify_user_id: organiser.user_id,
        notify_text: `Event ${eventName} created by ${organiserName}`,
    };

    return await MDBObject.dataInsert("user_notification", saveObj);
};

//When an organizer you follow creates an event
const notifyOrganiserFollowersOnEventCreate = async (organiser, followerId, eventId, eventName) => {
    var userDeviceTokenData = await getUserDeviceToken(followerId);
    var organiserName = utils.toTitleCase(organiser.first_name && organiser.last_name ? organiser.first_name + " " + organiser.last_name : organiser.username);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.EVENT_CREATED,
            body: `Event ${eventName} created by ${organiserName}`,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM,
            },
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: organiser.user_id,
        _event_id: eventId,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({
            messageFrom: stringMessages.PROMO_TEAM,
        }),
        notify_user_id: followerId,
        notify_text: `Event ${eventName} created by ${organiserName}`,
    };

    return await MDBObject.dataInsert("user_notification", saveObj);
};

module.exports.handler = async function (event, context, callback) {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };

    try {
        let eventId = event.pathParameters.event_id;
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);

        var loggedUserDetails = {};
        await MDBObject.getData("user_master", "user_id, username, first_name, last_name, email", { user_id: user.id }).then((result) => {
            loggedUserDetails = result[0];
            return loggedUserDetails;
        });

        // let QueryEvent = `(SELECT event_id FROM event_master WHERE event_id = ${eventId} AND _user_id = ${user.id} AND is_deleted = 0 ) UNION ALL (SELECT event_master.event_id FROM event_administrator JOIN event_master ON event_administrator._event_id = event_master.event_id WHERE event_administrator._event_id = ${eventId} AND event_administrator._user_id = ${user.id} AND event_master.is_deleted = 0 ) `;
        // let eventuser = await MDBObject.runQuery(QueryEvent);
        // if (!eventuser || eventuser.length <= 0) {
        //     response.message = errorMessages.YOU_CAN_NOT_EDIT_THIS_EVENT;
        //     return awsRequestHelper.respondWithJsonBody(200, response);
        // }

        let apiData = JSON.parse(event.body);
        if (apiData.deleted_user && apiData.deleted_user != "") {
            await deleteGuest(apiData.deleted_user);
        }
        delete apiData.deleted_user;
        if (apiData.deleted_tickets && apiData.deleted_tickets != "") {
            await deleteTickets(apiData.deleted_tickets);
        }
        delete apiData.deleted_tickets;
        if (apiData.deleted_admin && apiData.deleted_admin != "") {
            await deleteAdmin(apiData.deleted_admin);
        }
        delete apiData.deleted_admin;
        await validate(apiData);

        if (apiData.event_admin && apiData.event_admin.length > 0) {
            apiData.event_admin = JSON.stringify(apiData.event_admin);
        } else {
            apiData.event_admin = "";
        }
        // apiData._user_id = user['id'];

        let address = [];
        let eventTickets = [];
        let guestUsers = [];
        if (apiData.street_address) {
            address.push(apiData.street_address);
        }
        if (apiData.address_state) {
            address.push(apiData.address_state);
        }
        if (apiData.city) {
            address.push(apiData.city);
        }
        if (apiData.country) {
            address.push(apiData.country);
        }
        if (apiData.zipcode) {
            address.push(apiData.zipcode);
        }
        if (typeof apiData.longitude == "string") {
            apiData.longitude = parseFloat(apiData.longitude);
        }
        if (typeof apiData.latitude == "string") {
            apiData.latitude = parseFloat(apiData.latitude);
        }

        const { private_invitation_list } = apiData;
        delete apiData.private_invitation_list;
        // hash password before storing
        // if (apiData.password) apiData.password = md5(apiData.password);
        if (apiData.password) apiData.password = apiData.password;

        apiData.address = `${address.join(", ")}`;
        if (apiData.address == "") {
            delete apiData.address;
        }
        if (apiData.latitude) {
            apiData.event_location = JSON.stringify([apiData.latitude, apiData.longitude]);
        }
        if (apiData.tickets) {
            eventTickets = apiData.tickets;
            delete apiData.tickets;
        }
        if (apiData.guest_user && apiData.guest_user.length > 0) {
            guestUsers = apiData.guest_user;
            delete apiData.guest_user;
        }
        if (apiData.timezone && apiData.timezone != "") {
            apiData.end_date_utc = momentTz.tz(apiData.end_date_time, dateFormatDB, apiData.timezone).utc().format(dateFormatDB);
            apiData.start_date_utc = momentTz.tz(apiData.start_date_time, dateFormatDB, apiData.timezone).utc().format(dateFormatDB);
        }
        var whereQry = { event_id: eventId, _user_id: user["id"] };
        
        var dataContainer = {};

        // await MDBObject.getData("event_master", "_user_id, is_draft, event_name, event_id", whereQry).then(async (eventDetails) => {
        let eventQuery = `(SELECT event_master.* 
                FROM event_master
                WHERE event_master.event_id = ${eventId} AND _user_id = ${user.id} AND is_deleted = 0)
                UNION ALL 
                (SELECT event_master.*
                    FROM event_administrator
                    JOIN event_master ON event_administrator._event_id = event_master.event_id
                    WHERE event_master.event_id = ${eventId} AND event_administrator._user_id = ${user.id} AND event_master.is_deleted = 0
                )`;

        await MDBObject.runQuery(eventQuery).then(async (eventDetails) => {
            if (eventDetails.length > 0) {
                dataContainer["event_details"] = eventDetails[0];
            } else {
                response.message = "You can not edit this event";
                return awsRequestHelper.respondWithJsonBody(200, response);
            }

            if (eventDetails[0].status == "cancel") {
                await MDBObject.dataUpdate("event_master", { status: "active" }, { event_id: eventId });
            }
        });

        //event published
        if (apiData.is_draft === false && dataContainer.event_details && dataContainer.event_details.is_draft == 1) {
            //send mail to organiser on event create
            await notifyOrganiserOnEventCreate(loggedUserDetails, eventId, dataContainer.event_details.event_name);

            //send push notification to organiser and save push notification
            await notifyOrganiserOnAddEventByPushNotification(loggedUserDetails, eventId, dataContainer.event_details.event_name);

            //When an organizer you follow creates an event
            let organiserFollowers = await MDBObject.getData("follow_users", "_user_id", { follow_user_id: user.id, is_deleted: 0 });
            await Promise.all(
                organiserFollowers.map(async (organiserFollower) => {
                    var followerId = organiserFollower._user_id;
                    await notifyOrganiserFollowersOnEventCreate(loggedUserDetails, followerId, eventId, dataContainer.event_details.event_name);
                })
            );
        }

        return MDBObject.dataUpdate("event_master", apiData, whereQry).then(async (data) => {
            if (apiData.event_admin && apiData.event_admin != "") {
                let adminEvent = JSON.parse(apiData.event_admin);
                await Promise.all(
                    adminEvent.map(async (eventAdmin) => {
                        await MDBObject.getData("event_administrator", "administrator_id", {
                            _event_id: eventId,
                            _user_id: eventAdmin.user_id
                        }).then(async (res) => {
                            if (res.length <= 0) {
                                await MDBObject.dataInsert("event_administrator", {
                                    _event_id: eventId,
                                    _user_id: eventAdmin.user_id
                                });
                            }
                        });
                        // await MDBObject.dataInsert('event_administrator', { _event_id: eventId, _user_id: eventAdmin.user_id })
                    })
                );
            }
            if (eventTickets.length > 0) {
                await Promise.all(
                    eventTickets.map(async (ticketDetails) => {
                        ticketDetails._event_id = eventId;
                        ticketDetails.currency_code = stringMessages.USD;
                        let uuidGenerate = uuidv4();
                        ticketDetails.ticket_group_id = uuidGenerate;
                        if (ticketDetails.tier_details && ticketDetails.tier_details.length > 0) {
                            let tier_details = ticketDetails.tier_details;
                            delete ticketDetails.tier_details;
                            let ticketInfo = ticketDetails;
                            await Promise.all(
                                tier_details.map(async (tierDetails) => {
                                    ticketInfo.price = tierDetails.price;
                                    ticketInfo._tier_id = tierDetails._tier_id;
                                    ticketInfo.quantity = tierDetails.quantity;
                                    // ticketInfo.remaining_qty = tierDetails.quantity;

                                    if (tierDetails.ticket_id) {
                                        let ticketCountQuery = `SELECT quantity, remaining_qty FROM event_tickets WHERE ticket_id = ${tierDetails.ticket_id}`;
                                        let ticketCount = await MDBObject.runQuery(ticketCountQuery);
                                        if (ticketCount && ticketCount[0]) {
                                            ticketCount = JSON.parse(JSON.stringify(ticketCount[0]));
                                            ticketInfo.remaining_qty = ticketCount.remaining_qty - ticketCount.quantity + tierDetails.quantity;
                                        } else {
                                            delete ticketInfo.remaining_qty;
                                        }

                                        // delete ticketInfo.remaining_qty;
                                        return await MDBObject.dataUpdate("event_tickets", ticketInfo, { ticket_id: tierDetails.ticket_id });
                                    } else {
                                        ticketInfo.remaining_qty = tierDetails.quantity;
                                        return await MDBObject.dataInsert("event_tickets", ticketInfo);
                                    }
                                })
                            ).then((res) => {
                                return true;
                            });
                        } else {
                            // ticketDetails.remaining_qty = ticketDetails.quantity;
                            if (ticketDetails.ticket_id) {
                                let ticketCountQuery = `SELECT quantity, remaining_qty FROM event_tickets WHERE ticket_id = ${ticketDetails.ticket_id}`;
                                let ticketCount = await MDBObject.runQuery(ticketCountQuery);
                                if (ticketCount && ticketCount[0]) {
                                    ticketCount = JSON.parse(JSON.stringify(ticketCount[0]));
                                    ticketDetails.remaining_qty = ticketCount.remaining_qty - ticketCount.quantity + ticketDetails.quantity;
                                } else {
                                    delete ticketDetails.remaining_qty;
                                }

                                // delete ticketDetails.remaining_qty;
                                return await MDBObject.dataUpdate("event_tickets", ticketDetails, { ticket_id: ticketDetails.ticket_id });
                            } else {
                                ticketDetails.remaining_qty = ticketDetails.quantity;
                                return await MDBObject.dataInsert("event_tickets", ticketDetails);
                            }
                        }
                    })
                ).then((data) => {
                    // console.log(data);
                });
            }
            if (guestUsers.length > 0) {
                await Promise.all(
                    guestUsers.map(async (guestUserDetails) => {
                        if ("group" in guestUserDetails) {
                            var groupData = guestUserDetails.group;
                            var groupObj = {
                                group_name: groupData.group_name,
                                _user_id: user.id,
                            };

                            var groupSaveResponse = await MDBObject.dataInsert("user_group", groupObj);
                            var groupId = groupSaveResponse.insertId;

                            if (groupData.members && groupData.members.length > 0) {
                                await Promise.all(
                                    groupData.members.map(async (member) => {
                                        var memberObj = {
                                            _group_id: groupId,
                                            email: member.email,
                                            type: member.type,
                                            name: member.name,
                                            _event_id: eventId,
                                        };

                                        if ("user_id" in member) {
                                            memberObj["user_id"] = member.user_id;
                                        }
                                        return memberObj;
                                    })
                                ).then(async (allMemberDetails) => {
                                    await MDBObject.bulkInsert("guest_users", allMemberDetails);
                                    return allMemberDetails;
                                }).then(async (allMemberDetails) => {
                                    return await Promise.all(
                                        allMemberDetails.map(async (member) => {
                                            return await sendMailToGuest(apiData, member, eventId, eventTickets, loggedUserDetails, apiData.address);
                                        })
                                    );
                                });
                            }
                        } else {
                            var guestDetails = {};
                            let guestEmailAddress = guestUserDetails.email;
                            let existGuestData = await MDBObject.getData("guest_users", "guest_id", {
                                _event_id: eventId,
                                email: guestEmailAddress,
                            });

                            if (existGuestData.length <= 0) {
                                if (guestUserDetails.user_id) {
                                    guestDetails._user_id = guestUserDetails.user_id;
                                    delete guestUserDetails.user_id;
                                }
                                if ("group_id" in guestUserDetails) {
                                    guestDetails._group_id = guestUserDetails.group_id;
                                    delete guestUserDetails.group_id;
                                }

                                guestDetails.email = guestUserDetails.email;
                                guestDetails.type = guestUserDetails.type.toLowerCase();
                                guestDetails._event_id = eventId;

                                await MDBObject.dataInsert("guest_users", guestDetails);
                                return await sendMailToGuest(apiData, guestUserDetails, eventId, eventTickets, loggedUserDetails, apiData.address);
                            } else {
                                var guestId = existGuestData[0].guest_id;
                                if ("group_id" in guestUserDetails) {
                                    guestDetails._group_id = guestUserDetails.group_id;
                                    delete guestUserDetails.group_id;
                                }

                                var whereQry = { guest_id: guestId };
                                return await MDBObject.dataUpdate("guest_users", guestDetails, whereQry);
                            }
                        }
                    })
                ).then((data) => {
                    // console.log(data);
                }).catch((error) => {
                    console.error("error : ", error);
                });
            }

            if (private_invitation_list) {
                const userList = await updateUserInvitations({
                    event_id: eventId,
                    email_list: private_invitation_list,
                });
                userList.forEach((user) => {
                    sendMailToPrivateEventGuest(
                        apiData,
                        user,
                        eventId,
                        eventTickets,
                        loggedUserDetails,
                        apiData.address
                    );
                });
            }

            if (apiData.is_draft == 0) {
                //send push notification to organiser on event update
                if (dataContainer.event_details) {
                    await notifyOrganiserOnEventUpdate(loggedUserDetails, dataContainer.event_details);
                }

                //When the events for which the user has already bought tickets, have changed
                var usersEventTicketsList = await getEventUsersTickets(eventId);
                await Promise.all(
                    usersEventTicketsList.map(async (user_ticket) => {
                        var userDetails = await getUserDetails(user_ticket.user_id);
                        if (userDetails.length > 0 && dataContainer.event_details) {
                            await notifyUsersOnEventUpdate(dataContainer.event_details, loggedUserDetails, user_ticket.user_id);
                            await notifyUsersWhoBoughtTicketForEventOnEventUpdate(dataContainer.event_details, userDetails[0]);
                        }
                    })
                );

                //notify interested users whenever the event details are changed and saved
                //When the events for which the user has tagged as "Going" / "Interested", have changed - the organiser has modified the event
                let getEventInterestedUsersQuery = "SELECT user_id FROM going_users_in_event where event_id = " + eventId + " AND (type_going = 'Going' OR type_going = 'May be')";
                await MDBObject.runQuery(getEventInterestedUsersQuery).then(async (interestedUsers) => {
                    await Promise.all(
                        interestedUsers.map(async (interestedUser) => {
                            var userDetails = await getUserDetails(interestedUser.user_id);
                            if (userDetails.length > 0 && dataContainer.event_details) {
                                if(interestedUser.user_id != user.id){
                                    await notifyUsersOnEventUpdate(dataContainer.event_details, loggedUserDetails, interestedUser.user_id);
                                }
                                await notifyUsersWhoInterestedForEventOnEventUpdate(dataContainer.event_details, userDetails[0]);
                            }
                        })
                    );
                });
            }

            response = { success: true, message: successMessages.EVENT_UPDATED };
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
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const utils = require("../common/utils");
const Joi = require("joi");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const moment = require("moment");
const QRCode = require("qrcode");
const fs = require("fs");
const AWS = require("aws-sdk");
const S3 = new AWS.S3();
const BUCKET_IMAGE = "promoappdata" + process.env.API_PREFIX;
const AWSManager = require("../common/awsmanager");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const saveTicketAttendeeDetails = require("../tickets/saveTicketAttendeeDetails");
const {
    errorMessages,
    stringMessages,
    successMessages,
    emailAndPushNotiTitles
} = require("../common/constants");

const categoryDisplayName = {
    concerts: "Concerts",
    festivals: "Festivals",
    "programing-arts": "Performing arts",
    "performing-arts": "Performing arts",
    community: "Community",
    sports: "Sports",
    politics: "Rally"
};

const validate = function (body) {
    const schema = Joi.object().keys({
        event_id: Joi.number().required(),
        ticketDetails: Joi.array().required()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
            allowUnknown: true
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
}

const createJWT = (parsedBody) => {
    return jwt.sign(JSON.stringify(parsedBody), process.env.SHARED_SECRET);
};

const generateQR = async (parsedBody, token, ticket_id) => {
    let key = `${parsedBody.event_id}/${parsedBody.attendee}/${ticket_id}.png`;
    try {
        let qrCode = await QRCode.toDataURL(token);
        const base64Data = new Buffer(qrCode.replace(/^data:image\/\w+;base64,/, ""), "base64");
        const type = qrCode.split(";")[0].split("/")[1];
        let params = {
            Body: base64Data,
            Bucket: BUCKET_IMAGE,
            ACL: "public-read",
            ContentEncoding: "base64",
            ContentType: `image/${type}`,
            Key: key
        };
        await S3.putObject(params).promise();
        return `https://s3.${process.env.REGION}.amazonaws.com/${BUCKET_IMAGE}/${key}`;
    } catch (error) {
        console.error("error : ", error);
    }
};

const notifyOrganiser = async (notifyData, event, notifyOrganiser, user, orderId) => {
    if (notifyOrganiser.email && notifyOrganiser.email !== "" && notifyOrganiser.is_email_verified && notifyOrganiser.is_email_verified == 1) {
        notifyData.tickets.map((ticket) => {
            ticket["amount_paid"] = ((ticket.price * ticket.quantity).toFixed(2)) * 1
            return ticket;
        })

        var totalTicketsQty = notifyData.tickets.reduce((totalQuantity, ticket) => {
            return totalQuantity + (ticket.quantity * 1);
        }, 0);

        let tmpl = fs.readFileSync("./lambda/emailtemplates/organiser-notified-when-attendee-buys-ticket.html", "utf8");
        let mailSubject = `Ticket Purchase for ${event.event_name}`;
        let event_name = event.event_name.replace(/\s+/g, "-").toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            eventName: event.event_name,
            organiserName: utils.toTitleCase((notifyOrganiser.first_name && notifyOrganiser.last_name) ? notifyOrganiser.first_name + " " + notifyOrganiser.last_name : notifyOrganiser.username),
            attendeeName: utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + " " + user.last_name : user.username),
            attendee_email: user.email,
            booking_date_time: moment().format("llll"),
            manage_order_link: `${process.env.UI_BASE_URL}/manageeventlist?ev=${event.event_id}`,
            order_link: `${process.env.UI_BASE_URL}/manageeventlist?ev=${event.event_id}`,
            user_tickets: notifyData.tickets,
            total_quantity: totalTicketsQty,
            total_amount: parseFloat(notifyData.total_amount).toFixed(2),
            order_id: orderId,
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([notifyOrganiser.email], mailBody, mailSubject);
    }
};

const notifyUser = async (event, notifyAttendee, organiser, notifyData, orderId, QRCodes) => {
    if (notifyAttendee.email && notifyAttendee.email !== "" && notifyAttendee.is_email_verified && notifyAttendee.is_email_verified == 1) {
        let address = [];
        if (event.street_address) {
            address.push(event.street_address);
        }
        if (event.address_state) {
            address.push(event.address_state);
        }
        if (event.city) {
            address.push(event.city);
        }
        if (event.country) {
            address.push(event.country);
        }
        if (event.zipcode) {
            address.push(event.zipcode);
        }
        var event_address = (address = `${address.join(", ")}`);

        notifyData.tickets.map((ticket) => {
            ticket["amount_paid"] = (ticket.price * ticket.quantity).toFixed(2) * 1;
            return ticket;
        });

        var totalTicketsQty = notifyData.tickets.reduce((totalQuantity, ticket) => {
            return totalQuantity + (ticket.quantity * 1);
        }, 0);

        let eventLocation = "https://maps.google.com/?ll=" + event.latitude + "," + event.longitude;

        let organiserWebsiteUrl = (organiser && organiser.url) ? organiser.url : "";
        let organiserWebsiteLogo = (organiser && organiser.logo) ? organiser.logo : "";

        let tmpl = fs.readFileSync("./lambda/emailtemplates/notify_widget_user_when_ticket_purchase.html", "utf8");
        let mailSubject = `Ticket Purchase for ${event.event_name}`;
        let event_name = event.event_name.replace(/\s+/g, "-").toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            encodedEventUrl: encodeURIComponent(event_url),
            event_name: event.event_name,
            event_category: categoryDisplayName[event.category],
            categoryImg: `${process.env.UI_BASE_URL}/img/${event.category}.png`,
            organiser_chat_link: `${process.env.UI_BASE_URL}/chat.html?userId=${organiser.quickblox_id}`,
            view_tickets_link: `${process.env.UI_BASE_URL}/tickets`,
            event_image: event.event_image,
            event_start_date: moment(event.start_date_time).format("llll"),
            event_end_date: moment(event.end_date_time).format("llll"),
            event_location: eventLocation,
            event_address: event_address,
            attendee_name: utils.toTitleCase((notifyAttendee.first_name && notifyAttendee.last_name) ? notifyAttendee.first_name + " " + notifyAttendee.last_name : notifyAttendee.username),
            organiser_name: utils.toTitleCase((organiser.first_name && organiser.last_name) ? organiser.first_name + " " + organiser.last_name : organiser.username),
            booking_date_time: moment().format("llll"),
            user_tickets: notifyData.tickets,
            total_quantity: totalTicketsQty,
            total_amount: parseFloat(notifyData.total_amount).toFixed(2),
            order_id: orderId,
            QRCodes: QRCodes,
            organiserWebsiteUrl,
            organiserWebsiteLogo,
            mailtosubject: encodeURIComponent(`Ticket purchased for ${event.event_name}`)
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([notifyAttendee.email], mailBody, mailSubject);
    }
};

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await MDBObject.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
}

const notifyOrganiserByPushNotification = async (organiserId, eventName, attendee, totalQty) => {
    var organiserDeviceTokenData = await getUserDeviceToken(organiserId);
    if (organiserDeviceTokenData.length > 0) {
        var { token } = organiserDeviceTokenData[0];
        let attendeeName = utils.toTitleCase((attendee.first_name && attendee.last_name) ? attendee.first_name + " " + attendee.last_name : attendee.username);
        var message = {
            title: "Ticket purchased",
            body: `${attendeeName} has bought ${totalQty} tickets for  ${eventName}`,
            payload: { messageFrom: stringMessages.PROMO_TEAM }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.ORGANISER_DEVICE_ID_NOT_FOUND });
    }
};

const savePushNotification = async (data) => {
    var dataObj = {
        _user_id: data._user_id,
        _event_id: data._event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify(data.payload_data),
        notify_user_id: data.notify_user_id,
        notify_text: data.notify_text
    };

    return await MDBObject.dataInsert("user_notification", dataObj).then(async (notificationSaveResponse) => {
        return Promise.resolve(notificationSaveResponse);
    }).catch((error) => {
        console.error("error : ", error);
        return Promise.reject(error);
    });
};

//When a buyer has bought tickets for your event 
const notifyOrganiserForRemainingQtyOfTicketCategory = async (event, organiser, attendee, eventTicket) => {
    var organiserDeviceTokenData = await getUserDeviceToken(organiser.user_id);

    let TICKETS_REMAINING_FOR_YOUR_EVENT = emailAndPushNotiTitles.TICKETS_REMAINING_FOR_YOUR_EVENT;
    TICKETS_REMAINING_FOR_YOUR_EVENT = TICKETS_REMAINING_FOR_YOUR_EVENT
        .replace("<remainingQty>", eventTicket.remaining_qty)
        .replace("<eventName>", event.event_name)
        .replace("<ticketName>", eventTicket.ticket_name);

    if (organiserDeviceTokenData.length > 0) {
        var { token } = organiserDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.BUYER_BOUGHT_TICKET,
            body: TICKETS_REMAINING_FOR_YOUR_EVENT,
            payload: { messageFrom: stringMessages.PROMO_TEAM }
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: attendee.user_id,
        _event_id: event.event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({ messageFrom: stringMessages.PROMO_TEAM }),
        notify_user_id: organiser.user_id,
        notify_text: TICKETS_REMAINING_FOR_YOUR_EVENT
    };

    return await MDBObject.dataInsert("user_notification", saveObj);
};

//When a buyer bought tickets for your event - selecting the “AbsorbFees” option
const notifyOrganiserOnPaidTicketBoughtByAttendee = async (event, organiser, attendee, eventTicket, puchasedTicketInfo) => {
    var organiserDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    let attendeeName = utils.toTitleCase((attendee.first_name && attendee.last_name) ? attendee.first_name + " " + attendee.last_name : attendee.username)

    let ATTENDEE_BOUGHT_INCLUDING_TICKETS_FESS = emailAndPushNotiTitles.ATTENDEE_BOUGHT_INCLUDING_TICKETS_FESS;
    ATTENDEE_BOUGHT_INCLUDING_TICKETS_FESS = ATTENDEE_BOUGHT_INCLUDING_TICKETS_FESS
        .replace("<attendeeName>", attendeeName)
        .replace("<ticketQty>", puchasedTicketInfo.ticket_qty)
        .replace("<eventName>", event.event_name)

    if (organiserDeviceTokenData.length > 0) {
        var { token } = organiserDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.BUYER_BOUGHT_TICKET_SELECTING_ABSORB_FEES_OPTION,
            body: ATTENDEE_BOUGHT_INCLUDING_TICKETS_FESS,
            payload: { messageFrom: stringMessages.PROMO_TEAM }
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: attendee.user_id,
        _event_id: event.event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({ messageFrom: stringMessages.PROMO_TEAM }),
        notify_user_id: organiser.user_id,
        notify_text: ATTENDEE_BOUGHT_INCLUDING_TICKETS_FESS
    }

    return await MDBObject.dataInsert("user_notification", saveObj);
}

//When a buyer bought tickets for your event - deselecting the “Absorb Fees” option 
const notifyOrganiserOnFreeTicketBoughtByAttendee = async (event, organiser, attendee, eventTicket, puchasedTicketInfo) => {
    var organiserDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    let attendeeName = utils.toTitleCase((attendee.first_name && attendee.last_name) ? attendee.first_name + ' ' + attendee.last_name : attendee.username)

    let ATTENDEE_BOUGHT_EXCLUDING_TICKETS_FESS = emailAndPushNotiTitles.ATTENDEE_BOUGHT_EXCLUDING_TICKETS_FESS;
    ATTENDEE_BOUGHT_EXCLUDING_TICKETS_FESS = ATTENDEE_BOUGHT_EXCLUDING_TICKETS_FESS
        .replace("<attendeeName>", attendeeName)
        .replace("<ticketQty>", puchasedTicketInfo.ticket_qty)
        .replace("<eventName>", event.event_name)

    if (organiserDeviceTokenData.length > 0) {
        var { token } = organiserDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.BUYER_BOUGHT_TICKET_DESELECTING_ABSORB_FEES_OPTION,
            body: ATTENDEE_BOUGHT_EXCLUDING_TICKETS_FESS,
            payload: { messageFrom: stringMessages.PROMO_TEAM }
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: attendee.user_id,
        _event_id: event.event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({ messageFrom: stringMessages.PROMO_TEAM }),
        notify_user_id: organiser.user_id,
        notify_text: ATTENDEE_BOUGHT_EXCLUDING_TICKETS_FESS
    }

    return await MDBObject.dataInsert("user_notification", saveObj);
}

//When tickets are sold out for your event
const notifyOrganiserOnAllTicketSoldForCategory = async (event, organiser, attendee, eventTicket) => {
    var organiserDeviceTokenData = await getUserDeviceToken(organiser.user_id);

    let ALL_TICKETS_SOLD_OUT_FOR_EVENT = emailAndPushNotiTitles.ALL_TICKETS_SOLD_OUT_FOR_EVENT;
    ALL_TICKETS_SOLD_OUT_FOR_EVENT = ALL_TICKETS_SOLD_OUT_FOR_EVENT
        .replace("<ticketName>", eventTicket.ticket_name)
        .replace("<eventName>", event.event_name);

    if (organiserDeviceTokenData.length > 0) {
        var { token } = organiserDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.ALL_TICKETS_SOLD_OUT,
            body: ALL_TICKETS_SOLD_OUT_FOR_EVENT,
            payload: { messageFrom: stringMessages.PROMO_TEAM }
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: attendee.user_id,
        _event_id: event.event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({ messageFrom: stringMessages.PROMO_TEAM }),
        notify_user_id: organiser.user_id,
        notify_text: ALL_TICKETS_SOLD_OUT_FOR_EVENT
    }

    return await MDBObject.dataInsert("user_notification", saveObj);
}

//notify organiser on attendee transaction failed
const notifyOrganiserOnAttendeeTransactionFailded = async (event, organiser, attendee) => {
    let attendeeName = utils.toTitleCase((attendee.first_name && attendee.last_name) ? attendee.first_name + " " + attendee.last_name : attendee.username);
    let organiserName = utils.toTitleCase((organiser.first_name && organiser.last_name) ? organiser.first_name + " " + organiser.last_name : organiser.username);
    if (organiser.email && organiser.email !== "") {
        let tmpl = fs.readFileSync("./lambda/emailtemplates/notify_organiser_on_attendee_payment_failed.html", "utf8");
        let mailSubject = emailAndPushNotiTitles.ATTENDEE_TRANSACTION_FAILED_FOR_YOUR_EVENT + event.event_name;
        let event_name = event.event_name.replace(/\s+/g, "-").toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            eventName: event.event_name,
            attendeeName: attendeeName,
            organiserName: organiserName
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([organiser.email], mailBody, mailSubject);
    }
}

//When the organizer receives payment for an event 
const notifyOrganiserOnPaymentReceives = async (event, organiser, attendee, paymentAmount) => {
    var organiserDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    var eventConductedDate = moment(event.start_date_time).format("MMM DD YYYY hh:mm a");
    var eventVenue = event.address;

    let PAYMENT_RECEIVED_FOR_AMOUNT_FOR_THE_EVENT = emailAndPushNotiTitles.PAYMENT_RECEIVED_FOR_AMOUNT_FOR_THE_EVENT;
    PAYMENT_RECEIVED_FOR_AMOUNT_FOR_THE_EVENT = PAYMENT_RECEIVED_FOR_AMOUNT_FOR_THE_EVENT
        .replace("<paymentAmount>", paymentAmount)
        .replace("<eventName>", event.event_name)
        .replace("<eventConductedDate>", eventConductedDate)
        .replace("<eventVenue>", eventVenue);

    if (organiserDeviceTokenData.length > 0) {
        var { token } = organiserDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.PAYMENT_RECEIVED,
            body: PAYMENT_RECEIVED_FOR_AMOUNT_FOR_THE_EVENT,
            payload: { messageFrom: stringMessages.PROMO_TEAM }
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: attendee.user_id,
        _event_id: event.event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({ messageFrom: stringMessages.PROMO_TEAM }),
        notify_user_id: organiser.user_id,
        notify_text: PAYMENT_RECEIVED_FOR_AMOUNT_FOR_THE_EVENT
    }

    return await MDBObject.dataInsert("user_notification", saveObj);
}

//Only limited tickets available for your event, <event name>. 
const notifyInterestedUserOnLimitedTicketsAvailable = async (event, attendee, interestedUserId) => {
    var userDeviceTokenData = await getUserDeviceToken(interestedUserId);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.LIMITED_TICKETS_AVAILABLE,
            body: emailAndPushNotiTitles.LIMITED_TICKETS_AVAILABLE_FOR_YOUR_EVENT + event.event_name,
            payload: { messageFrom: stringMessages.PROMO_TEAM }
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: attendee.user_id,
        _event_id: event.event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({ messageFrom: stringMessages.PROMO_TEAM }),
        notify_user_id: interestedUserId,
        notify_text: emailAndPushNotiTitles.LIMITED_TICKETS_AVAILABLE_FOR_YOUR_EVENT + event.event_name
    }

    return await MDBObject.dataInsert("user_notification", saveObj);
}

//When all of the tickets for your event are sold out notify organiser
const notifyOrganiserOnAllTicketsSoldOut = async (event, organiser) => {
    let organiserName = utils.toTitleCase((organiser.first_name && organiser.last_name) ? organiser.first_name + " " + organiser.last_name : organiser.username);
    if (organiser.email && organiser.email !== "") {
        let tmpl = fs.readFileSync("./lambda/emailtemplates/notify_organiser_when_all_tickets_sold_out_for_event.html", "utf8");
        let mailSubject = emailAndPushNotiTitles.ALL_TICKETS_SOLD_OUT_FOR_EVENT + event.event_name;
        let event_name = event.event_name.replace(/\s+/g, "-").toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            eventName: event.event_name,
            organiserName: organiserName
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([organiser.email], mailBody, mailSubject);
    }
}



function zeroPad(num) {
    return num.toString().padStart(6, "0");
}
const createCustomer = async function (apiData) {
    return stripe.customers.create({
        description: apiData.description,
        metadata: { user: apiData.user_id },
        source: apiData.token
    });
}

const getCustomerGetwayDetails = async function (user_id) {
    return new Promise(async (resolve, reject) => {
        let sqlQry = "SELECT stripe_customer_id FROM user_master WHERE user_id = " + user_id + " ";
        let userDetails = await MDBObject.runQuery(sqlQry);
        return resolve(userDetails);
    })
}
const crateStripeCharge = async function (customerID, totalAmountPay, source, event_name) {
    console.log('stripe------- ', totalAmountPay);

    console.log('stripe calculation ======', ((totalAmountPay * 1) * 100))


    let stripeCharge = await stripe.charges.create(
        {
            customer: customerID,
            amount: Math.round(totalAmountPay * 100),
            currency: 'usd',
            source: source,
            description: `Purchase ticket of ${event_name} event`,
        });
    console.log('stripeCharge', stripeCharge);
    return stripeCharge;
}
const getTicketDetails = async function (ticketArray) {
    return await Promise.all(
        ticketArray.map(async mapData => {
            return await MDBObject.getData('event_tickets', '*', { ticket_id: mapData.ticket_id }).then(queryResponse => {
                return queryResponse[0];
            })
        })
    ).then(responseTicket => {
        return responseTicket;
    })
}


const getEventTicketsQuantity = async (eventId) => {
    let getEventTicketStatusQuery = `SELECT _event_id,  sum(quantity) as total_tickets , sum(remaining_qty) as total_remaining_tickets FROM event_tickets WHERE _event_id = ${eventId}`;
    let eventTicketQuantityStatus = await MDBObject.runQuery(getEventTicketStatusQuery);
    return eventTicketQuantityStatus;
}

const calculateEventTicketGoal = async (eventId, container) => {
    return new Promise(async (resolve, reject) => {
        var eventTicketQuantityStatus = await getEventTicketsQuantity(eventId);
        if (eventTicketQuantityStatus.length > 0) {
            var numberOfPercentOfTotalTicket = 20;
            var twentyPercntOfTotalTickets = (numberOfPercentOfTotalTicket * (eventTicketQuantityStatus[0].total_tickets / 100));
            container.total_tickets = eventTicketQuantityStatus[0].total_tickets * 1;
            container.before_purchase_remaining_ticket = eventTicketQuantityStatus[0].total_remaining_tickets * 1;
            container.twenty_prcnt_of_total_tickets = twentyPercntOfTotalTickets;
        } else {
            container.total_tickets = 0;
            container.before_purchase_remaining_ticket = 0;
            container.twenty_prcnt_of_total_tickets = 0;
        }

        return resolve(container);
    })
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        let requestData = JSON.parse(event.body);
        apiData = apiData.ticketDetails;
        let ticketException = 0;
        let ticketExceptionResponse = {};
        let ticket_id = '';
        let detailFormId = "";
        let QRCodeInfo = [];
        let exicutionMap = 0;
        let eventOrgDetails = {};
        let eventAttendeeDetails = {};
        let eventDetails = {};
        let ticketsNotify = [];
        let ticketsDetails = [];
        await MDBObject.getData("event_master", "*", { event_id: requestData.event_id }).then(eventData => {
            eventDetails = eventData[0];
            return eventDetails;
        })
        await MDBObject.getData("user_master", "user_id, first_name, last_name, username, email", { user_id: eventDetails._user_id }).then(result => {
            eventOrgDetails = result[0];
            return eventOrgDetails;
        })

        await MDBObject.getData("user_master", "user_id, first_name, last_name, username", { user_id: user.id }).then(result => {
            eventAttendeeDetails = result[0];
            return eventAttendeeDetails;
        })

        var eventTicketStatusContainer = {};
        await calculateEventTicketGoal(requestData.event_id, eventTicketStatusContainer);

        ticketsDetails = await getTicketDetails(apiData);
        let dataToinsertuser = {};
        dataToinsertuser.user_id = user['id'];
        dataToinsertuser.attendee = user['username'];
        dataToinsertuser.event_id = requestData.event_id;
        dataToinsertuser.ticket_qty = 0;
        dataToinsertuser.total_amount = 0;
        let stripeFee = process.env.STRIPE_FEE;
        let promoAppFee = process.env.PROMOAPP_FEE;
        let totalPrice = 0;
        let totalQty = 0;
        let stripePaymentResponse = "";
        let stripe_fee = 0;
        let service_fee = 0;
        let ticket_price = 0;
        let total_discount = 0;
        let is_absorb = 0;
        for (let index = 0; index < apiData.length; index++) {

            await Promise.all(ticketsDetails.map(async (item, i) => {
                console.log(item.ticket_id + "<" + apiData[index].ticket_id);
                if (item.ticket_id == apiData[index].ticket_id) {

                    if (!apiData[index]["ticket_qty"]) {
                        apiData[index]["ticket_qty"] = 1;
                    }
                    totalQty = totalQty + apiData[index].ticket_qty;

                    // add ticekt price with donation amount 
                    if (item.ticket_type === "donation" && 'amount' in apiData[index] && apiData[index].amount > 0) {
                        var ticketPrice = apiData[index].amount * 1;
                        totalQty = totalQty + 1 - apiData[index]["ticket_qty"];
                        apiData[index]["ticket_qty"] = 1;
                    } else {
                        var ticketPrice = (item.price * 1) * (apiData[index].ticket_qty * 1);
                    }

                    if (item.remaining_qty < apiData[index].ticket_qty) {
                        ticketException = 1;
                        ticketExceptionResponse = {
                            success: false,
                            message: errorMessages.INSUFFICIENT_TICKETS,
                            remaining_tickets: item.remaining_qty,
                            ticket_name: item.ticket_name
                        };
                    }
                    // add ticekt price with donation amount 
                    if (item.ticket_type === "donation" && 'amount' in apiData[index] && apiData[index].amount > 0) {
                        var ticketPrice = apiData[index].amount * 1;
                        apiData[index]["ticket_qty"] = 1;
                    } else {
                        var ticketPrice = (item.price * 1) * (apiData[index].ticket_qty * 1);
                    }
                    ticket_price = ticket_price + ticketPrice;
                    let stripeValue = 0;
                    let promoAppValue = 0;
                    if (item.is_absorb == 0) {
                        is_absorb = 1;
                        stripeValue = (ticketPrice * 1) * ((stripeFee * 1) / 100);
                        stripe_fee = stripe_fee + stripeValue;
                        promoAppValue = promoAppFee > 0 ? (ticketPrice * 1) * ((promoAppFee * 1) / 100) : 0;
                        service_fee = service_fee + promoAppValue;
                        totalPrice = (totalPrice * 1) + (promoAppValue + stripeValue + ticketPrice);
                    } else {
                        stripeValue = (ticketPrice * 1) * ((stripeFee * 1) / 100);
                        stripe_fee = stripe_fee + stripeValue;
                        promoAppValue = promoAppFee > 0 ? (ticketPrice * 1) * ((promoAppFee * 1) / 100) : 0;
                        service_fee = service_fee + promoAppValue;
                        totalPrice = (totalPrice * 1) + (ticketPrice);
                    }
                    apiData[index].price = item.price;
                    apiData[index].name = item.ticket_name;
                }
            }));
        }

        if (ticketException > 0) {
            return awsRequestHelper.respondWithJsonBody(200, ticketExceptionResponse);
        }

        if (totalPrice > 0) {
            let customerID = '';
            let source = requestData.token != '' ? requestData.token : requestData.card;
            await getCustomerGetwayDetails(user.id).then(async customerGetwayDetails => {
                if (customerGetwayDetails && customerGetwayDetails.length > 0 && customerGetwayDetails[0].stripe_customer_id != "") {
                    customerID = customerGetwayDetails[0].stripe_customer_id;
                    if (requestData.token != '') {
                        return await stripe.customers.update(customerID, {
                            source: requestData.token,
                        }).then(response => {
                            source = response.default_source;
                            console.log('response ====== ', response)
                        });
                    }
                } else {
                    let customerIdResponse = await createCustomer(requestData);
                    console.log("customerIdResponse: ", customerIdResponse);
                    if (customerIdResponse) {
                        customerID = customerIdResponse.id;
                        source = customerIdResponse.default_source;
                    }
                }
            });

            if (is_absorb == 1) {
                totalPrice = totalPrice + 0.49;
            }
            stripePaymentResponse = await crateStripeCharge(customerID, totalPrice.toFixed(2), source, eventDetails.event_name).then(async stripeResponse => {
                //When the organizer receives payment for an event 
                await notifyOrganiserOnPaymentReceives(eventDetails, eventOrgDetails, eventAttendeeDetails, totalPrice.toFixed(2));
                return stripeResponse;
            }).catch(async (error) => {
                console.error("error : ", error);
                //notify organiser on user transaction failed
                await notifyOrganiserOnAttendeeTransactionFailded(eventDetails, eventOrgDetails, eventAttendeeDetails);
                throw new Error(error)
            })
        }

        if(requestData.discount_code_id){
            let discountDetails = await MDBObject.getData("promo_codes", "*", {id: requestData.discount_code_id}).then(discountData =>{
                return discountData[0]
            })
            if(discountDetails.discount_type == "percent"){
                discount = totalPrice * discountDetails.discount_value * 0.01;
                total_discount = totalPrice > discount ? (total_discount + discount) : (total_discount + totalPrice);
                totalPrice = totalPrice > discount ? (totalPrice - discount) : 0;
    
            }else{
                total_discount = totalPrice > discountDetails.discount_value ? total_discount + discountDetails.discount_value : total_discount + totalPrice;
                totalPrice = totalPrice > discountDetails.discount_value ? totalPrice - discountDetails.discount_value : 0;
            }
        }

        dataToinsertuser.user_id = user['id'];
        dataToinsertuser.attendee = user['username'];
        dataToinsertuser.event_id = requestData.event_id;
        dataToinsertuser._discount_code_id = requestData.discount_code_id ? requestData.discount_code_id : '';
        dataToinsertuser.ticket_qty = totalQty;
        dataToinsertuser.total_amount = totalPrice;
        dataToinsertuser.total_discount = total_discount.toFixed(2);
        dataToinsertuser.ticket_price = ticket_price;
        dataToinsertuser.payout_amount = totalPrice > 0 ? (totalPrice - stripe_fee - 0.49).toFixed(2) : 0;
        dataToinsertuser.stripe_fee = totalPrice > 0 ? (stripe_fee + 0.49).toFixed(2) : 0;
        dataToinsertuser.service_fee = totalPrice > 0 ? service_fee : 0;

        dataToinsertuser.ticket_details_status = totalPrice > 0 ? 'paid' : 'free';
        dataToinsertuser.txn_id = stripePaymentResponse && 'balance_transaction' in stripePaymentResponse ? stripePaymentResponse.balance_transaction : '';
        dataToinsertuser.charge_id = stripePaymentResponse && 'id' in stripePaymentResponse ? stripePaymentResponse.id : '';

        if (requestData && requestData.device_type) {
            dataToinsertuser.device_type = requestData.device_type;
        }

        await MDBObject.dataInsert("user_tickets", dataToinsertuser).then(async (data) => {
            userTicketId = data.insertId;
            ticket_id = data.insertId;
            return data;
        });

        if (requestData.formDetails && requestData.formDetails.length == 1) {
            detailFormId = await saveTicketAttendeeDetails.handler(requestData.formDetails[0], requestData.event_id, ticket_id);
        }

        return Promise.all(
            await apiData.map(async (apiDataLoop, index) => {
                apiDataLoop.user_id = user['id'];
                apiDataLoop.attendee = user['username'];
                apiDataLoop._ticket_id = apiDataLoop.ticket_id;
                delete apiDataLoop.ticket_id;

                if (('layout_id' in requestData) && ('tier_id' in apiDataLoop) && ('seats' in apiDataLoop)) {
                    let tierSeats = apiDataLoop.seats;
                    let allSeats = tierSeats.map(seat => {
                        seat = "'" + seat + "'"
                        return seat;
                    }).join(",");

                    let removeUserHoldSeatsQuery = "DELETE FROM seat_holding_master WHERE _seat_id IN (" + allSeats + ") and _tier_id = " + apiDataLoop.tier_id + " and _layout_id = " + requestData.layout_id + "";
                    await MDBObject.runQuery(removeUserHoldSeatsQuery);
                }

                let ticketDetailsNotify = {
                    quantity: apiDataLoop.ticket_qty,
                    price: apiDataLoop.price,
                    type: apiDataLoop.name
                }

                ticketsNotify.push(ticketDetailsNotify);
                let ticketInfo = await MDBObject.getData('event_tickets', '*', { ticket_id: apiDataLoop._ticket_id }).then(tckRes => {
                    return tckRes[0];
                })
                if(requestData.formDetails && requestData.formDetails.length > 1){
                    apiDataLoop.detailFormId = await saveTicketAttendeeDetails.handler(requestData.formDetails[index], requestData.event_id, ticket_id);
                  }

                for (let index = 0; index < apiDataLoop.ticket_qty; index++) {
                    let details_json = {
                        _purchased_ticket_id: ticket_id,
                        _ticket_id: apiDataLoop._ticket_id,
                        _detail_form_id : detailFormId.insertId ? detailFormId.insertId : apiDataLoop.detailFormId.insertId,
                        _discount_code_id: apiDataLoop.discount_code_id ? apiDataLoop.discount_code_id : '',
                        qty: 1,
                        price: ticketInfo.price,
                        discount: apiDataLoop.discount ? apiDataLoop.discount : '',
                        payment_status: ticketInfo.ticket_type
                    }
                    
                    if (ticketInfo.ticket_type === "donation" && 'amount' in apiDataLoop && apiDataLoop.amount > 0) {
                        details_json["price"] = apiDataLoop.amount;
                    }

                    if (('layout_id' in requestData) && ('tier_id' in apiDataLoop) && ('seats' in apiDataLoop)) {
                        details_json["_layout_id"] = requestData.layout_id;
                        details_json["_tier_id"] = apiDataLoop.tier_id;
                        details_json["_seat_id"] = apiDataLoop.seats[index];
                    }
                    details_json.ticket_details_status = (details_json.price && details_json.price > 0) ? 'paid' : 'free';
                    await MDBObject.dataInsert("user_ticket_details", details_json).then(async (data) => {
                        let qrtext = {
                            id: dataToinsertuser.event_id,
                            attendee: dataToinsertuser.attendee,
                            ticket: userTicketId,
                            details: data.insertId,
                            event_ticket: apiDataLoop._ticket_id
                        };

                        if (('layout_id' in requestData) && ('tier_id' in apiDataLoop) && ('seats' in apiDataLoop)) {
                            qrtext["tier"] = apiDataLoop.tier_id;
                            qrtext["seat"] = apiDataLoop.seats[index];
                        }

                        let token = await createJWT(qrtext);
                        const QRCodeLink = await generateQR(dataToinsertuser, token, userTicketId + "-" + data.insertId);

                        QRCodeInfo.push({
                            ticket_name: `${apiDataLoop.name} ${index + 1}`,
                            QRCode: QRCodeLink
                        })

                        let updateTicketQuery = "UPDATE event_tickets SET remaining_qty = remaining_qty - 1 WHERE ticket_id = " + apiDataLoop._ticket_id;
                        await MDBObject.runQuery(updateTicketQuery);

                        if (QRCodeLink) {
                            await MDBObject.dataUpdate("user_ticket_details", { qrcode: QRCodeLink }, { details_id: data.insertId });
                        }
                        return token;
                    })
                }
            })
        ).then(async res => {
            let notifyData = {};
            notifyData.total_amount = totalPrice;
            notifyData.tickets = ticketsNotify;
            //notify to attendee by sending mail and device push notification
            await notifyUser(eventDetails, eventAttendeeDetails, eventOrgDetails, notifyData, ticket_id, QRCodeInfo);

            //notify to organiser by sending mail and device push notification
            await notifyOrganiser(notifyData, eventDetails, eventOrgDetails, user, ticket_id);
            await notifyOrganiserByPushNotification(eventOrgDetails.user_id, eventDetails.event_name, eventAttendeeDetails, totalQty);
            let attendeeName = utils.toTitleCase((eventAttendeeDetails.first_name && eventAttendeeDetails.last_name) ? eventAttendeeDetails.first_name + ' ' + eventAttendeeDetails.last_name : eventAttendeeDetails.username);
            let orgSaveObj = {
                _user_id: eventAttendeeDetails.user_id,
                _event_id: eventDetails.event_id,
                notify_type: stringMessages.DATA,
                payload_data: { messageFrom: stringMessages.PROMO_TEAM },
                notify_user_id: eventOrgDetails.user_id,
                notify_text: `${attendeeName} has bought ${totalQty} tickets for  ${eventDetails.event_name}`,
            };
            await savePushNotification(orgSaveObj);

            var allEventTicketDetails = await Promise.all(
                apiData.map(async (mapData) => {
                    return await MDBObject.getData("event_tickets", "ticket_id, remaining_qty, ticket_name, is_absorb", {
                        ticket_id: mapData._ticket_id
                    }).then(queryResponse => {
                        if (queryResponse.length > 0) {
                            return queryResponse[0];
                        }
                    });
                })
            );

            await Promise.all(
                allEventTicketDetails.map(async (event_ticket) => {
                    let puchasedTicketInfo = apiData.find(item => item._ticket_id == event_ticket.ticket_id);
                    if (event_ticket.remaining_qty == 0) {
                        //When tickets are sold out for your event
                        await notifyOrganiserOnAllTicketSoldForCategory(eventDetails, eventOrgDetails, eventAttendeeDetails, event_ticket);
                    }

                    //When a buyer has bought tickets for your event
                    await notifyOrganiserForRemainingQtyOfTicketCategory(eventDetails, eventOrgDetails, eventAttendeeDetails, event_ticket);

                    if (event_ticket.is_absorb == 1) {
                        //When a buyer bought tickets for your event - selecting the “AbsorbFees” option
                        await notifyOrganiserOnPaidTicketBoughtByAttendee(eventDetails, eventOrgDetails, eventAttendeeDetails, event_ticket, puchasedTicketInfo);
                    } else {
                        //When a buyer bought tickets for your event - deselecting the “Absorb Fees” option
                        await notifyOrganiserOnFreeTicketBoughtByAttendee(eventDetails, eventOrgDetails, eventAttendeeDetails, event_ticket, puchasedTicketInfo);
                    }
                })
            );

            //When tickets are about to be sold out for an event in which you have shown interest
            var eventTicketQuantityStatus = await getEventTicketsQuantity(requestData.event_id);
            if (eventTicketQuantityStatus.length > 0) {
                var after_purchase_remaining_ticket = eventTicketQuantityStatus[0].total_remaining_tickets * 1;
                if (after_purchase_remaining_ticket > 0) {
                    if (eventTicketStatusContainer.before_purchase_remaining_ticket > eventTicketStatusContainer.twenty_prcnt_of_total_tickets &&
                        after_purchase_remaining_ticket <= eventTicketStatusContainer.twenty_prcnt_of_total_tickets) {
                        var getInterestedUserQuery = `SELECT user_id FROM going_users_in_event WHERE going_users_in_event.user_id NOT IN (select user_tickets.user_id from user_tickets where event_id = ${requestData.event_id} )
                            AND going_users_in_event.event_id=${requestData.event_id} AND (type_going = 'May be' OR type_going = 'Going')  AND is_deleted = '0'`;
                        let eventInterestedUserList = await MDBObject.runQuery(getInterestedUserQuery);
                        if (eventInterestedUserList.length > 0) {
                            await Promise.all(
                                eventInterestedUserList.map(async (interestedUser) => {
                                    var interestedUserId = interestedUser.user_id;
                                    return await notifyInterestedUserOnLimitedTicketsAvailable(
                                        eventDetails,
                                        eventAttendeeDetails,
                                        interestedUserId
                                    );
                                })
                            );
                        }
                    }
                }
            }

            //When all of the tickets for your event are sold out notify organiser
            var eventTicketQuantityStatus = await getEventTicketsQuantity(requestData.event_id);
            if (eventTicketQuantityStatus.length > 0) {
                var eventRemainingTickets = eventTicketQuantityStatus[0].total_remaining_tickets * 1;
                if (eventRemainingTickets === 0) {
                    await notifyOrganiserOnAllTicketsSoldOut(eventDetails, eventOrgDetails);
                }
            }

            response = {
                success: true,
                id: ticket_id,
                message: successMessages.TICKETS_PURCHASED
            };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch(error => {
            console.error("error : ", error);
            return error
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
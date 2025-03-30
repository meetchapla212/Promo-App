const AWS = require("aws-sdk");
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const ses = new AWS.SES();
const Joi = require("joi");
const FROM_EMAIL = process.env.FROM || "";
const MAIL_SUBJECT = "Your Ticket for ";
const moment = require("moment");
const DBM = require("../common/mysqlmanager");
const DBManager = new DBM();
const _ = require("lodash"),
    fs = require("fs");
const { errorMessages } = require("../common/constants");
const dateFormat = "ddd, MMMM D, YYYY [at] hh:mm A";

let categoryDisplayName = {
    concerts: "Concerts",
    festivals: "Festivals",
    "programing-arts": "Performing arts",
    "performing-arts": "Performing arts",
    community: "Community",
    sports: "Sports",
    politics: "Rally"
};

const validate = async body => {
    const schema = Joi.object().keys({
        approved_by: Joi.string(),
        txn_id: Joi.string()
    });

    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
        }, function (error, value) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            } else {
                resolve(value);
            }
        });
    });
};

//get eventID to check whether it is present or not
const getTicketFromDB = function (id) {
    const whereQueryTicket = { id: id };
    return DBManager.getData("user_tickets", "*", whereQueryTicket).then(data => {
        return data;
    });
};

//Retreive useremail through id
const getUserEmail = function (username) {
    let whereQueryUser = { username: username };
    return DBManager.getData("user_master", "user_id, first_name, last_name, username, email, is_email_verified", whereQueryUser).then(data => {
        return data[0];
    });
};

//Send Email to attendee
// const sendEmail = async (newRow, toEmail, events, fullName, userTicket) => {
const sendEmail = async (newRow, userInfo, events, userTicket) => {
    console.log("url", newRow);

    let startDate = moment.utc(events.start_date_time_ms).format(dateFormat);
    let endDate = moment.utc(events.end_date_time_ms).format(dateFormat);
    let purchased_on = moment.utc(newRow.purchased_on).format(dateFormat);
    let googleUrl = "https://maps.google.com/?ll=" + events.latitude + "," + events.longitude;

    let tmpl = fs.readFileSync("./lambda/emailtemplates/tickets.html", "utf8");

    console.log("userTicket", userTicket);
    let userticket = userTicket;

    // Check if event_image then get image from QB
    let image_url = events.image_url;
    if ("event_image" in events && events.event_image) {
        image_url = events.event_image;
    }

    console.log("Image url", image_url);
    let event_url = `${process.env.UI_BASE_URL}/eventdetails/${events._id}`;
    let templateVars = {
        base_url: process.env.UI_BASE_URL,
        name: utils.toTitleCase((userInfo.first_name && userInfo.last_name) ? userInfo.first_name + ' ' + userInfo.last_name : userInfo.username),
        userTicket: userticket,
        totalQuantity: newRow.ticket_qty,
        qrcode: newRow.qrcode,
        eventName: events.event_name,
        category: categoryDisplayName[events.category],
        categoryImg: `${process.env.UI_BASE_URL}/img/${events.category}.png`,
        startDate: startDate,
        endDate: endDate,
        purchasedOn: purchased_on,
        mapUrl: googleUrl,
        eventUrl: event_url,
        encodedEventUrl: encodeURIComponent(event_url),
        logo: `${process.env.UI_BASE_URL}/img/pink-logo.png`,
        image_url: image_url,
        mailtosubject: encodeURIComponent(
            `You are invited to ${events.event_name}`
        )
    };

    if (events.address) {
        templateVars.address = events.address;
    }

    console.log("email params: ", templateVars);

    let body = _.template(tmpl)(templateVars);

    if (userInfo.email && userInfo.email !== '' && userInfo.is_email_verified && userInfo.is_email_verified == 1) {
        let eParams = {
            Destination: {
                /* required */
                ToAddresses: [userInfo.email]
            },
            Message: {
                Body: {
                    Html: {
                        Charset: "UTF-8",
                        Data: body
                    }
                },
                Subject: {
                    Data: MAIL_SUBJECT + `${events.event_name}`
                }
            },
            Source: FROM_EMAIL
        };

        console.log("===SENDING EMAIL===", eParams);

        await ses.sendEmail(eParams).promise();
    }
};

//get eventName from eventid
const getEvents = function (id) {
    const whereQueryEvent = { event_id: id };
    return DBManager.getData("event_master", "*", whereQueryEvent).then(data => {
        return data[0];
    });
};

//Update event_Status
const updateStatus = async function (id, status, parsedBody, user) {
    console.log("in updtae");
    return new Promise((resolve, reject) => {
        const params = {
            event_status: status,
            approved_by: user.user_id,
            approved_on: moment.utc().valueOf()
        };

        if ("txn_id" in parsedBody && parsedBody.txn_id) {
            params.txn_id = parsedBody.txn_id;
        }
        console.log("params", params);
        var whereQueryUpdateTicket = { id: id };
        resolve();
        DBManager.dataUpdate("user_tickets", params, whereQueryUpdateTicket);
    });
};

exports.handler = async function (event, context, callback) {
    console.log("Got event", JSON.stringify(event));
    try {
        let id = event.pathParameters.id || {};

        if (!id) {
            awsRequestHelper.callbackRespondWithSimpleMessage(
                callback,
                400,
                "Id is missing in path parameters"
            );
            return;
        }

        let postbody = JSON.parse(event.body || "{}");
        console.log("getting body", postbody);

        //validate body
        let parsedBody = await validate(postbody);

        const params = {
            login: process.env.QB_LOGIN,
            password: process.env.QB_PASSWORD
        };
        //Check ticket_id is valid or not
        let ticket = await getTicketFromDB(id);
        console.log("getting ticketid", ticket);

        if (ticket && ticket.length > 0 && "id" in ticket[0] && "event_status" in ticket[0] && "event_id" in ticket[0]) {
            console.log("Event status", ticket[0].event_status);
            if (ticket[0].event_status === null || ticket[0].event_status === "pending") {
                let userTicket = [];
                if (!ticket[0].tickets) {
                    userTicket = [];
                } else {
                    userTicket = [{
                        type: ticket[0].ticket_qty,
                        price: ticket[0].total_amount
                    }];
                }

                //get user Email
                let userInfo = await getUserEmail(ticket[0].attendee);
                if (userInfo) {

                    //get eventName from events table by id
                    let events = await getEvents(ticket[0].event_id);
                    if (events) {
                        await sendEmail(ticket[0], userInfo, events, userTicket);
                        await updateStatus(ticket[0].id, "approved", parsedBody, userInfo);
                        awsRequestHelper.callbackRespondWithCodeOnly(callback, 204);
                    }
                }
            } else {
                awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, errorMessages.EVENT_STATUS_IS_COMPLETE);
            }
        } else {
            awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, errorMessages.INVALID_TICKETID);
        }
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error.name == "ValidationError") {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
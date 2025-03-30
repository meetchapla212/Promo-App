const QB = require('quickblox');
const AWS = require('aws-sdk');
const awsRequestHelper = require('./common/awsRequestHelper');
const className = 'UserTickets';
const ses = new AWS.SES();
const Joi = require('joi');
const FROM_EMAIL = process.env.FROM || '';
const MAIL_SUBJECT = 'Your Ticket for ';
const moment = require('moment');
const dateFormat = "ddd, MMMM D, YYYY [at] hh:mm A";
const _ = require('lodash'),
    fs = require('fs');
const { errorMessages } = require('../lambda-v2/common/constants');

const CREDENTIALS = {
    appId: process.env.QB_APP_ID,
    authKey: process.env.QB_AUTH_KEY,
    authSecret: process.env.QB_AUTH_SECRET
};

let categoryDisplayName = {
    "concerts":"Concerts",
    "festivals":"Festivals",
    "programing-arts":"Performing arts",
    "performing-arts":"Performing arts",
    "community":"Community",
    "sports":"Sports",
    "politics":"Rally"
};

const validate = async (body) => {
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

QB.init(CREDENTIALS.appId, CREDENTIALS.authKey, CREDENTIALS.authSecret);

const session = function (params) {
    return new Promise((resolve, reject) => {
        QB.createSession(params, function (error, result) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            }

            if (result) {
                resolve(result);
            }
        });
    });

};

//get eventID to check whether it is present or not
const getTicketFromQB = function (id) {
    const filter = { _id: id };
    return new Promise((resolve, reject) => {
        QB.data.list(className, filter, function (error, result) {
            console.log("filter", filter);
            if (error) {
                console.error("error : ", error);
                resolve([]);
            } else {
                resolve(result.items);
            }
        });
    });
};

//Retreive useremail through id
const getUserEmail = function (Id) {
    return new Promise((resolve, reject) => {
        const params = { filter: { field: 'id', param: 'in', value: [Id] } };
        QB.users.listUsers(params, function (error, result) {
            if (result) {
                resolve(result.items);
            } else {
                console.error("error : ", error);
                reject(error);
            }
        });
    })
}

//Send Email to attendee
const sendEmail = async (newRow, toEmail, events, fullName) => {
    console.log("url", newRow);

    let startDate = moment.utc(events[0].start_date_time_ms).format(dateFormat);
    let endDate = moment.utc(events[0].end_date_time_ms).format(dateFormat);
    let purchased_on = moment.utc(newRow.purchased_on).format(dateFormat);
    let googleUrl = "https://maps.google.com/?ll=" + events[0].latitude + "," + events[0].longitude;

    let tmpl = fs.readFileSync('./lambda/emailtemplates/tickets.html', 'utf8');

    let userticket = JSON.parse(newRow.tickets);

    // Check if event_image then get image from QB
    let image_url = events[0].image_url;
    if('event_image' in events[0] && events[0].event_image){
        image_url = QB.data.fileUrl('Events', {
            id: newRow.event_id,
            field_name: 'event_image' //r.event_name
        });
    }

    console.log('Image url',image_url);
    let event_url = `${process.env.UI_BASE_URL}/eventdetails/${events[0]._id}`;
    let templateVars = {
        base_url: process.env.UI_BASE_URL,
        name: fullName,
        userTicket: userticket,
        totalQuantity: userticket.map(q => (q.price * q.quantity)).reduce((sum, a) => sum + a),
        qrcode: newRow.qrcode,
        eventName: events[0].event_name,
        category: categoryDisplayName[events[0].category],
        categoryImg: `${process.env.UI_BASE_URL}/img/${events[0].category}.png`,
        startDate: startDate,
        endDate: endDate,
        purchasedOn: purchased_on,
        mapUrl: googleUrl,
        eventUrl: event_url,
        encodedEventUrl: encodeURIComponent(event_url),
        logo: `${process.env.UI_BASE_URL}/img/pink-logo.png`,
        image_url: image_url,
        mailtosubject: encodeURIComponent(`You are invited to ${events[0].event_name}`)
    };

    if(events[0].address){
        templateVars.address = events[0].address;
    }

    console.log("email params: ",templateVars);

    let body = _.template(tmpl)(templateVars);

    let eParams = {
        Destination: { /* required */
            ToAddresses: [toEmail]
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: body
                },

            },
            Subject: {
                Data: MAIL_SUBJECT + `${events[0].event_name}`
            }
        },
        Source: FROM_EMAIL
    };

    console.log('===SENDING EMAIL===', eParams);
    await ses.sendEmail(eParams).promise();

};

//get eventName from eventid
const getEvents = function (id) {
    const filter = { _id: id };
    return new Promise((resolve, reject) => {
        QB.data.list('Events', filter, function (error, result) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            } else {
                resolve(result.items);
            }
        });
    });
};


//Update event_Status
const updateStatus = function (id, status, parsedBody) {
    console.log("in updtae")
    return new Promise((resolve, reject) => {
        const params = {
            _id: id,
            event_status: status,
            approved_by: parsedBody,
            approved_on: moment.utc().valueOf()
        };
        if ('approved_by' in parsedBody && parsedBody.approved_by) {
            params.approved_by = parsedBody.approved_by;
        }
        if ('txn_id' in parsedBody && parsedBody.txn_id) {
            params.txn_id = parsedBody.txn_id;
        }
        QB.data.update(className, params, function (error, result) {
            if (result) {
                resolve(result);
            } else {
                console.error("error : ", error);
                reject(error);
            }
        });
    })
}

exports.handler = async function (event, context, callback) {
    console.log("Got event", JSON.stringify(event));
    try {
        let id = event.pathParameters.id || {};

        if (!id) {
            awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, 'Id is missing in path parameters');
            return;
        }

        let postbody = JSON.parse(event.body || '{}');
        console.log("getting body", postbody);

        //validate body
        let parsedBody = await validate(postbody);

        const params = { login: process.env.QB_LOGIN, password: process.env.QB_PASSWORD };
        await session(params);

        //Check ticket_id is valid or not
        let ticket = await getTicketFromQB(id);
        console.log("getting ticketid", ticket);

        if (ticket && ticket.length > 0 && '_id' in ticket[0] && 'event_status' in ticket[0] && 'event_id' in ticket[0] && 'tickets' in ticket[0]) {
           if (ticket[0].event_status === 'pending') {
                let userTicket = [];
                if (!(ticket[0].tickets)) {
                    userTicket = [];
                } else {
                    userTicket = JSON.parse(ticket[0].tickets)
                }
                console.log("userTicket", userTicket);

                //get user Email
                let userInfo = await getUserEmail(ticket[0].attendee);
                console.log('userinfo',userInfo);
                if (userInfo && userInfo.length > 0 && 'user' in userInfo[0]) {
                    let email = userInfo[0].user.email;

                    //get eventName from events table by id
                    let events = await getEvents(ticket[0].event_id);
                    console.log("events", events);

                    //Send Email to attendee
                    await sendEmail(ticket[0], email, events, userInfo[0].user.full_name);
                    console.log("sending");

                    if (events && events.length > 0 && 'tickets' in events[0]) {
                        //Update status
                        await updateStatus(ticket[0]._id, 'approved', parsedBody);
                        //update event
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
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
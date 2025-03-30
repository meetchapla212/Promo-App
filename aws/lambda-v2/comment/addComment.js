const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const AWSManager = require('../common/awsmanager');
const moment = require("moment");
const utils = require('../common/utils');
const {
    errorMessages,
    successMessages,
    stringMessages,
    emailAndPushNotiTitles
} = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        event_id: Joi.number().required(),
        comment: Joi.string().required(),
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

const fetchNecessaryData = (dataContainer, eventId, userId) => {
    return new Promise(async (resolve, reject) => {
        const fetchEvent = () => {
            return new Promise(async (resolve, reject) => {
                var sqlQry = "SELECT _user_id, event_id, event_name FROM event_master WHERE event_id = " + eventId + " ";
                let eventResult = await MDBObject.runQuery(sqlQry);
                if (eventResult && eventResult.length > 0) {
                    dataContainer['event_details'] = eventResult[0];
                    return resolve(eventResult);
                } else {
                    return resolve(errorMessages.EVENT_NOT_FOUND);
                }
            })
        }

        const fetchOrganiser = () => {
            return new Promise(async (resolve, reject) => {
                if (dataContainer.event_details) {
                    let sqlQry = "SELECT user_id FROM user_master WHERE user_id = " + dataContainer.event_details._user_id + " ";
                    let organiserDetails = await MDBObject.runQuery(sqlQry);
                    if (organiserDetails.length > 0) {
                        dataContainer['organiser_details'] = organiserDetails[0];
                        return resolve(organiserDetails);
                    } else {
                        return resolve(errorMessages.ORGANISER_NOT_FOUND);
                    }
                }
                return resolve(errorMessages.ORGANISER_NOT_FOUND);
            })
        }

        const fetchUser = () => {
            return new Promise(async (resolve, reject) => {
                let sqlQry = "SELECT user_id, first_name, last_name, username FROM user_master WHERE user_id = " + userId + " ";
                let userDetails = await MDBObject.runQuery(sqlQry);
                if (userDetails.length > 0) {
                    dataContainer['user_details'] = userDetails[0];
                    return resolve(userDetails);
                } else {
                    return resolve(errorMessages.USER_NOT_FOUND);
                }
            })
        }

        fetchEvent()
            .then(fetchOrganiser)
            .then(fetchUser)
            .then(() => {
                return resolve({ status: true })
            }).catch(error => {
                return reject({ success: false, message: error });
            })
    })
}

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await MDBObject.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
}

//When a user comments on your event
const notifyOrganiserOnAttendeePostComment = async (event, organiser, user) => {
    var userDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    var userName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username);
    
    let USER_POSTED_COMMENT_ON_YOUR_EVENT = emailAndPushNotiTitles.USER_POSTED_COMMENT_ON_YOUR_EVENT;
    USER_POSTED_COMMENT_ON_YOUR_EVENT = USER_POSTED_COMMENT_ON_YOUR_EVENT
        .replace('<userName>', userName)
        .replace('<eventName>', event.event_name);

    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.COMMENT_POSTED_ON_EVENT,
            body: USER_POSTED_COMMENT_ON_YOUR_EVENT,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: user.user_id,
        _event_id: event.event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({
            messageFrom: stringMessages.PROMO_TEAM
        }),
        notify_user_id: organiser.user_id,
        notify_text: USER_POSTED_COMMENT_ON_YOUR_EVENT,
    }

    return await MDBObject.dataInsert("user_notification", saveObj);
}

const getEventTickets = async (eventId) => {
    return new Promise(async (resolve, reject) => {
        let sqlQry = "SELECT ticket_id FROM event_tickets WHERE _event_id = " + eventId + " AND status = 'active' ";
        let eventTickets = await MDBObject.runQuery(sqlQry);
        return resolve(eventTickets);
    })
}

const getUserTicketDetails = async (ticketId) => {
    return new Promise(async (resolve, reject) => {
        let sqlQry = "SELECT _purchased_ticket_id FROM user_ticket_details WHERE _ticket_id = " + ticketId + " GROUP BY _purchased_ticket_id";
        let userTicketDetails = await MDBObject.runQuery(sqlQry);
        return resolve(userTicketDetails);
    })
}

const getUserTicket = async (purchasedId) => {
    return new Promise(async (resolve, reject) => {
        let sqlQry = "SELECT user_id FROM user_tickets WHERE id = " + purchasedId + " AND user_tickets.event_status = 'approved' AND user_tickets.status = 'active' ";
        let userTicket = await MDBObject.runQuery(sqlQry);
        return resolve(userTicket);
    })
}

//When a user comments on the event you bought tickets
const notifyTicketBoughtedUsersOnEventComment = async (event, commentUser, notifyUserId) => {
    var userDeviceTokenData = await getUserDeviceToken(notifyUserId);
    var commentUserName = utils.toTitleCase((commentUser.first_name && commentUser.last_name) ? commentUser.first_name + ' ' + commentUser.last_name : commentUser.username);
    
    let USER_POSTED_COMMENT_ON_YOUR_EVENT = emailAndPushNotiTitles.USER_POSTED_COMMENT_ON_YOUR_EVENT;
    USER_POSTED_COMMENT_ON_YOUR_EVENT = USER_POSTED_COMMENT_ON_YOUR_EVENT
        .replace('<userName>', commentUserName)
        .replace('<eventName>', event.event_name);
        
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.COMMENT_POSTED_ON_EVENT,
            body: USER_POSTED_COMMENT_ON_YOUR_EVENT,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: commentUser.user_id,
        _event_id: event.event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({
            messageFrom: stringMessages.PROMO_TEAM
        }),
        notify_user_id: notifyUserId,
        notify_text: USER_POSTED_COMMENT_ON_YOUR_EVENT,
    }

    return await MDBObject.dataInsert("user_notification", saveObj);
}


//When a user comments on the event you showed interest
const notifyInterestedUserOnEventComment = async (event, commentUser, interestedUserId) => {
    var userDeviceTokenData = await getUserDeviceToken(interestedUserId);
    var commentUserName = utils.toTitleCase((commentUser.first_name && commentUser.last_name) ? commentUser.first_name + ' ' + commentUser.last_name : commentUser.username);
    
    let USER_POSTED_COMMENT_ON_YOUR_EVENT = emailAndPushNotiTitles.USER_POSTED_COMMENT_ON_YOUR_EVENT;
    USER_POSTED_COMMENT_ON_YOUR_EVENT = USER_POSTED_COMMENT_ON_YOUR_EVENT
        .replace('<userName>', commentUserName)
        .replace('<eventName>', event.event_name);
        
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.COMMENT_POSTED_ON_EVENT,
            body: USER_POSTED_COMMENT_ON_YOUR_EVENT,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: commentUser.user_id,
        _event_id: event.event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({
            messageFrom: stringMessages.PROMO_TEAM
        }),
        notify_user_id: interestedUserId,
        notify_text: USER_POSTED_COMMENT_ON_YOUR_EVENT,
    }

    return await MDBObject.dataInsert("user_notification", saveObj);
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        apiData._user_id = user['id'];
        apiData._event_id = apiData.event_id;
        delete apiData.event_id;

        apiData.date_created_ms = moment().unix();
        return MDBObject.dataInsert("event_comments", apiData).then(async (data) => {

            var dataContainer = {};
            await fetchNecessaryData(dataContainer, apiData._event_id, user.id);
            //When a user comments on organiser event
            if (dataContainer.event_details && dataContainer.organiser_details) {
                await notifyOrganiserOnAttendeePostComment(dataContainer.event_details, dataContainer.organiser_details, dataContainer.user_details)
            }

            if (dataContainer.event_details) {
                //When a user comments on the event you bought tickets
                var eventTickets = await getEventTickets(apiData._event_id);
                if (eventTickets && eventTickets.length > 0) {
                    await Promise.all(eventTickets.map(async (eventTicket) => {
                        var ticketId = eventTicket.ticket_id;
                        var userTicketDetails = await getUserTicketDetails(ticketId);
                        return await Promise.all(userTicketDetails.map(async (single_ticket_detail) => {
                            var purchasedTicketId = single_ticket_detail._purchased_ticket_id;
                            var userTicketData = await getUserTicket(purchasedTicketId);
                            if (userTicketData.length > 0) {
                                var userID = userTicketData[0].user_id;
                                return await notifyTicketBoughtedUsersOnEventComment(dataContainer.event_details, dataContainer.user_details, userID);
                            }
                        }))
                    }))
                }

                //When a user comments on the event you showed interest
                let eventInterestedUserQuery = `SELECT user_id FROM going_users_in_event where event_id = ${apiData._event_id} AND user_id != ${user.id} AND (type_going = 'May be' OR type_going = 'Going')  AND is_deleted = '0'`;
                let eventInterestedUserList = await MDBObject.runQuery(eventInterestedUserQuery);
                if (eventInterestedUserList.length > 0) {
                    await Promise.all(eventInterestedUserList.map(async (interestedUser) => {
                        var interestedUserId = interestedUser.user_id;
                        return await notifyInterestedUserOnEventComment(dataContainer.event_details, dataContainer.user_details, interestedUserId)
                    }))
                }
            }

            var whereQry = { comment_id: data.insertId };
            var fieldsObj = "user_master.user_id, user_master.username, user_master.first_name, user_master.last_name, user_master.profile_pic, event_comments.*";
            return MDBObject.getJoinedData("event_comments", "user_master", "_user_id", "user_id", fieldsObj, whereQry).then(async (commentData) => {
                response = { success: true, message: successMessages.COMMENT_ADDED, data: commentData[0] }
                console.log("response : ", response);
                return awsRequestHelper.respondWithJsonBody(200, response);
            });
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
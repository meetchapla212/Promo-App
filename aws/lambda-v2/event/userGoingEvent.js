"use strict";
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const AWSManager = require('../common/awsmanager');
const Joi = require('joi');
const { errorMessages, stringMessages, emailAndPushNotiTitles, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        event_id: Joi.string().required(),
        type_going: Joi.string().required()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
}

const fetchNecessaryData = (dataContainer, eventId) => {
    return new Promise(async (resolve, reject) => {
        const fetchEvent = () => {
            return new Promise(async (resolve, reject) => {
                var sqlQry = "SELECT _user_id, event_name, event_id FROM event_master WHERE event_id = " + eventId + " ";
                let eventResult = await DBManager.runQuery(sqlQry);
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
                    let organiserDetails = await DBManager.runQuery(sqlQry);
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

        fetchEvent()
            .then(fetchOrganiser)
            .then(() => {
                return resolve({ status: true })
            }).catch(error => {
                return reject({ success: false, message: error });
            })
    })
}


const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await DBManager.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
}

const notifyOrganiserByPushNotification = async (event, user, organiser, notificationMessage, notificationTitle) => {
    var userDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: notificationTitle,
            body: notificationMessage,
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
        notify_text: notificationMessage,
    }

    return await DBManager.dataInsert("user_notification", saveObj);
}

//Another user selects “Interested” option for the organizer’s event
const notifyUsersOnAnotherUserInterestedInEvent = async (event, user, interestedUserId) => {
    var userDeviceTokenData = await getUserDeviceToken(interestedUserId);
    let userName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.ANOTHER_USER_SHOW_INTEREST_IN_EVENT,
            body: userName + emailAndPushNotiTitles.USER_HAS_SHOWN_INTEREST_IN_YOUR_EVENT + event.event_name,
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
        notify_user_id: interestedUserId,
        notify_text: userName + emailAndPushNotiTitles.USER_HAS_SHOWN_INTEREST_IN_YOUR_EVENT + event.event_name,
    }

    return await DBManager.dataInsert("user_notification", saveObj);
}


//Another user selects “Going” option for the organizer’s event
const notifyUsersOnAnotherUserPlannedToAttendEvent = async (event, user, plannedToAttendEventUserId) => {
    var userDeviceTokenData = await getUserDeviceToken(plannedToAttendEventUserId);
    let userName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.ANOTHER_USER_PLANNING_TO_ATTEND_EVENT,
            body: userName + emailAndPushNotiTitles.USER_IS_PLANNING_TO_ATTEND_YOUR_EVENT + event.event_name,
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
        notify_user_id: plannedToAttendEventUserId,
        notify_text: userName + emailAndPushNotiTitles.USER_IS_PLANNING_TO_ATTEND_YOUR_EVENT + event.event_name,
    }

    return await DBManager.dataInsert("user_notification", saveObj);
}

//A buyer selects “Interested” option for the organizer’s event - for which tickets are sold out
const notifyOrgnsrOnBuyerInterestedInWhichTicketsSoldOut = async (event, user, organiser) => {
    var userDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    let userName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.EVENT_TICKET_ARE_SOLD_OUT_IN_WHICH_USER_INTERESTED,
            body: userName + emailAndPushNotiTitles.USER_HAS_SHOWN_INTEREST_IN_YOUR_EVENT + event.event_name + emailAndPushNotiTitles.TICKETS_ARE_NOT_AVAILABLE,
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
        notify_text: userName + emailAndPushNotiTitles.USER_HAS_SHOWN_INTEREST_IN_YOUR_EVENT + event.event_name + emailAndPushNotiTitles.TICKETS_ARE_NOT_AVAILABLE,
    }

    return await DBManager.dataInsert("user_notification", saveObj);
}

//A buyer selects “Going” option for the organizer’s event - for which tickets are sold out
const notifyOrgnsrOnBuyerPlannedToPurchaseInWhichTicketsSoldOut = async (event, user, organiser) => {
    var userDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    let userName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.EVENT_TICKET_ARE_SOLD_OUT_USER_PLANNING_TO_ATTEND_EVENT,
            body: userName + emailAndPushNotiTitles.USER_IS_PLANNING_TO_ATTEND_YOUR_EVENT + event.event_name + emailAndPushNotiTitles.TICKETS_ARE_NOT_AVAILABLE,
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
        notify_text: userName + emailAndPushNotiTitles.USER_IS_PLANNING_TO_ATTEND_YOUR_EVENT + event.event_name + emailAndPushNotiTitles.TICKETS_ARE_NOT_AVAILABLE,
    }

    return await DBManager.dataInsert("user_notification", saveObj);
}

const getEventTickets = async (eventId) => {
    return new Promise(async (resolve, reject) => {
        let sqlQry = "SELECT remaining_qty FROM event_tickets WHERE _event_id = " + eventId + " AND status = 'active' ";
        let eventTickets = await DBManager.runQuery(sqlQry);
        return resolve(eventTickets);
    })
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        var loggedUserDetails = {};
        await DBManager.getData("user_master", "user_id, first_name, last_name, username", { user_id: user.id }).then(result => {
            loggedUserDetails = result[0];
            return loggedUserDetails;
        })

        let whereQry = { user_id: user['id'], event_id: apiData['event_id'] };
        let data = {
            event_id: apiData['event_id'],
            name: user['username'],
            type_going: apiData['type_going'],
            user_id: user['id']
        }

        let existingRecords = await DBManager.getData('going_users_in_event', 'count(*) as totalCount', whereQry);
        if (existingRecords[0].totalCount) {
            await DBManager.dataUpdate("going_users_in_event", data, whereQry);
        } else {
            await DBManager.dataInsert('going_users_in_event', data);
        }

        //fetch data
        var dataContainer = {};
        await fetchNecessaryData(dataContainer, apiData.event_id);

        if (dataContainer.organiser_details && dataContainer.event_details) {
            if (apiData.type_going === "May be") {
                //User shown interest
                let notificationTitle = emailAndPushNotiTitles.USER_SHOWN_INTEREST;
                let userName = utils.toTitleCase((loggedUserDetails.first_name && loggedUserDetails.last_name) ? loggedUserDetails.first_name + ' ' + loggedUserDetails.last_name : loggedUserDetails.username);
                let notificationMessage = userName + emailAndPushNotiTitles.USER_HAS_SHOWN_INTEREST_IN_YOUR_EVENT + dataContainer.event_details.event_name;
                await notifyOrganiserByPushNotification(dataContainer.event_details, loggedUserDetails, dataContainer.organiser_details, notificationMessage, notificationTitle);

                let eventInterestedUserQuery = `SELECT user_id FROM going_users_in_event where event_id = ${apiData.event_id} AND user_id != ${user.id} AND (type_going = 'May be')  AND is_deleted = '0'`;
                let eventInterestedUserList = await DBManager.runQuery(eventInterestedUserQuery);
                if (eventInterestedUserList.length > 0) {
                    //Another user selects “Interested” option for the organizer’s event
                    await Promise.all(eventInterestedUserList.map(async (interestedUser) => {
                        var interestedUserId = interestedUser.user_id;
                        await notifyUsersOnAnotherUserInterestedInEvent(dataContainer.event_details, loggedUserDetails, interestedUserId);
                    }))
                }
            } else if (apiData.type_going === "Going") {
                // User planning to attend
                let notificationTitle = emailAndPushNotiTitles.USER_PLANNING_TO_ATTEND;
                let userName = utils.toTitleCase((loggedUserDetails.first_name && loggedUserDetails.last_name) ? loggedUserDetails.first_name + ' ' + loggedUserDetails.last_name : loggedUserDetails.username);
                let notificationMessage = userName + emailAndPushNotiTitles.USER_IS_PLANNING_TO_ATTEND_YOUR_EVENT + dataContainer.event_details.event_name;
                await notifyOrganiserByPushNotification(dataContainer.event_details, loggedUserDetails, dataContainer.organiser_details, notificationMessage, notificationTitle);

                let eventPlannedToAttendUserQuery = `SELECT user_id FROM going_users_in_event where event_id = ${apiData.event_id} AND user_id != ${user.id} AND (type_going = 'Going') AND is_deleted = '0'`;
                let eventPlannedToAttendUserList = await DBManager.runQuery(eventPlannedToAttendUserQuery);
                if (eventPlannedToAttendUserList.length > 0) {
                    //Another user selects “Going” option for the organizer’s event
                    await Promise.all(eventPlannedToAttendUserList.map(async (plannedToAttendUser) => {
                        var plannedToAttendUserId = plannedToAttendUser.user_id;
                        await notifyUsersOnAnotherUserPlannedToAttendEvent(dataContainer.event_details, loggedUserDetails, plannedToAttendUserId);
                    }))
                }
            } else if (apiData.type_going === "Not Going") {
                //User not shown interest
                let notificationTitle = emailAndPushNotiTitles.USER_NOT_SHOWN_INTEREST;
                let userName = utils.toTitleCase((loggedUserDetails.first_name && loggedUserDetails.last_name) ? loggedUserDetails.first_name + ' ' + loggedUserDetails.last_name : loggedUserDetails.username);
                let notificationMessage = `${userName} has not shown interest in your event, ${dataContainer.event_details.event_name}`;
                await notifyOrganiserByPushNotification(dataContainer.event_details, loggedUserDetails, dataContainer.organiser_details, notificationMessage, notificationTitle);
            }
        }

        if (dataContainer.organiser_details && dataContainer.event_details) {
            var eventTicketsList = await getEventTickets(apiData.event_id);
            if (eventTicketsList.length > 0) {
                await Promise.all(eventTicketsList.map(async event_ticket => {
                    return event_ticket.remaining_qty;
                })).then(async (allTicketsTotalRemainingQty) => {
                    let totalRemainQuantity = allTicketsTotalRemainingQty.reduce((totalQty, currentReminingQty) => {
                        return totalQty + currentReminingQty;
                    })
                    if (totalRemainQuantity == 0) {
                        if (apiData.type_going === "May be") {
                            return await notifyOrgnsrOnBuyerInterestedInWhichTicketsSoldOut(dataContainer.event_details, loggedUserDetails, dataContainer.organiser_details)
                        } else if (apiData.type_going === "Going") {
                            return await notifyOrgnsrOnBuyerPlannedToPurchaseInWhichTicketsSoldOut(dataContainer.event_details, loggedUserDetails, dataContainer.organiser_details)
                        }
                    }
                })
            }
        }

        response = { success: true, message: successMessages.USER_RESPONSE_SAVED };
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
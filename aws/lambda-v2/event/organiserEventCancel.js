const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const utils = require("../common/utils");
const DBM = require("../common/mysqlmanager");
const Joi = require("joi");
const fs = require("fs");
const DBManager = new DBM();
const stripe = require("stripe")(process.env.STRIPE_KEY);
const AWSManager = require("../common/awsmanager");
const _ = require("lodash");
const {
    errorMessages, 
    stringMessages,
    successMessages,
    emailAndPushNotiTitles
} = require("../common/constants");

const getEventTickets = async (eventId, dataContainer) => {
    return new Promise(async (resolve, reject) => {
        let sqlQry = `SELECT count(*) as totalCount FROM event_tickets WHERE _event_id = ${eventId} AND status = 'active' `;
        let eventTickets = await DBManager.runQuery(sqlQry);
        // dataContainer["event_tickets"] = eventTickets;
        return resolve(eventTickets);
    });
};

const getEventUsersTickets = async (eventId) => {
    return new Promise(async (resolve, reject) => {
        let sqlQry = `SELECT * FROM user_tickets WHERE event_id = ${eventId} AND user_tickets.event_status = 'approved' AND user_tickets.status = 'active' `;
        let userTicket = await DBManager.runQuery(sqlQry);
        return resolve(userTicket);
    });
};

async function updateTicketStatus(ticketId, updateObj) {
    await DBManager.getData("user_ticket_details", "details_id, ticket_details_status", { _purchased_ticket_id: ticketId }).then(async (responseDetails) => {
        return Promise.all(
            responseDetails.map(async (resDetails) => {
                let updateQuery = { ticket_details_status: "refunded" };
                if (resDetails.ticket_details_status == "free") {
                    updateQuery = {ticket_details_status: "cancel" };
                }
                return await DBManager.dataUpdate("user_ticket_details", updateQuery, { details_id: resDetails.details_id });
            })
        );
    });
    var whereQueryUpdateTicket = { id: ticketId };
    return await DBManager.dataUpdate("user_tickets", updateObj, whereQueryUpdateTicket);
}

async function getUserDetails(userId) {
    return new Promise(async (resolve, reject) => {
        let sqlQry = `SELECT first_name, last_name, username, email, is_email_verified FROM user_master WHERE user_id = ${userId}`;
        let userDetails = await DBManager.runQuery(sqlQry);
        return resolve(userDetails);
    });
}

const notifyUser = async (mailDataObj, allUsersMails) => {
    return await allUsersMails.map(async (userObj) => {
        let tmpl = fs.readFileSync("./lambda/emailtemplates/user-notified-when-cancel-event.html", "utf8");
        let mailSubject = emailAndPushNotiTitles.CANCELLED_EVENT + mailDataObj.event_name;
        let event_name = mailDataObj.event_name.replace(/\s+/g, "-").toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${mailDataObj.event_id}`;

        let templateVars = Object.assign({
            eventUrl: event_url,
            base_url: process.env.UI_BASE_URL,
            ...mailDataObj,
            attendee_username: utils.toTitleCase(userObj.first_name && userObj.last_name ? userObj.first_name + " " + userObj.last_name : userObj.username),
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        if ( userObj.email && userObj.email !== "" && userObj.is_email_verified && userObj.is_email_verified == 1 ) {
            await AWSManager.sendEmail([userObj.email], mailBody, mailSubject);
        }
        return true;
    });
};

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await DBManager.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
};

const notifyUserByPushNotification = async (userId, eventName) => {
    var userDeviceTokenData = await getUserDeviceToken(userId);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];

        var message = {
            title: emailAndPushNotiTitles.EVENT_CANCELLED,
            body: eventName + emailAndPushNotiTitles.EVENT_CANCELLED_BY_ORGANIZER,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM,
            },
        };

        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({
            status: false,
            message: errorMessages.USER_DEVICE_ID_NOT_FOUND,
        });
    }
};

const savePushNotification = async (data) => {
    var dataObj = {
        _user_id: data._user_id,
        _event_id: data._event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify(data.payload_data),
        notify_user_id: data.notify_user_id,
        notify_text: data.notify_text,
    };

    return await DBManager.dataInsert("user_notification", dataObj)
        .then(async (notificationSaveResponse) => {
            return Promise.resolve(notificationSaveResponse);
        })
        .catch((error) => {
            return Promise.reject(error);
        });
};

const handleSendingPushNotificationToAllAttnedees = async (
    allUsersId,
    event,
    organiserId
) => {
    return await Promise.all(
        allUsersId.map(async (userID) => {
            await notifyUserByPushNotification(userID, event.event_name);

            let saveObj = {
                _user_id: organiserId,
                _event_id: event.event_id,
                notify_type: stringMessages.DATA,
                payload_data: {
                    messageFrom: stringMessages.PROMO_TEAM,
                },
                notify_user_id: userID,
                notify_text: event.event_name + emailAndPushNotiTitles.EVENT_CANCELLED_BY_ORGANIZER,
            };

            return await savePushNotification(saveObj);
        })
    );
};

const updateEventDetails = async (eventId, status, cancelReason) => {
    return new Promise(async (resolve, reject) => {
        let updateEventDetails = `UPDATE event_master SET cancel_reason = "${cancelReason}", is_draft = 1 , status = '${status}' WHERE event_id = ${eventId}`;
        await DBManager.runQuery(updateEventDetails).then(async () => {
            console.log("update remaining quantity------------------------");
            await DBManager.runQuery(`UPDATE event_tickets SET remaining_qty = quantity WHERE _event_id = ${eventId}`);
            return resolve({
                success: true,
                message: successMessages.EVENT_UPDATED,
            });
        }).catch((error) => {
            return reject({ success: false, message: error.message });
        });
    });
};

const processEventTicketsInBunch = (eventId, usersTickets, eventCancelReason, dataContainer, organiserId) => {
    return new Promise(async (resolve, reject) => {
        function createTicketsBunch(arr, size) {
            return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );
        }
        let allUsersMailId = [];
        let allUserIds = [];
        var userTicketsChunks = createTicketsBunch(usersTickets, 25);
        await Promise.all(
            userTicketsChunks.map(async (userTicketChunk) => {
                return await Promise.all(
                    userTicketChunk.map(async (userTicket) => {
                        if (userTicket.charge_id) {
                            //refund amount
                            async function proceesRefundPayment(userRefundAmount, ticketChargeId) {
                                return new Promise(async (resolve, reject) => {
                                    return await stripe.refunds.create({
                                        charge: ticketChargeId,
                                        amount: Math.round(userRefundAmount * 100),
                                    }, function (error, refund) {
                                        if (error) {
                                            return reject({
                                                success: false,
                                                message: error.message,
                                                error: error,
                                            });
                                        }

                                        return resolve({
                                            success: true,
                                            message: successMessages.AMOUNT_REFUNDED,
                                            data: refund,
                                        });
                                    });
                                });
                            }

                            async function saveUserRefundDetails(stripeResponse, ticketId) {
                                let refundUserDetails = {
                                    refund_id: stripeResponse.data.id,
                                    transaction_id: stripeResponse.data.balance_transaction,
                                    charge_id: stripeResponse.data.charge,
                                    _ticket_id: ticketId,
                                };
                                return await DBManager.dataInsert("user_refunds", refundUserDetails);
                            }

                            var userTicketId = userTicket.id;
                            var refundAmount = userTicket.payout_amount > 0 ? userTicket.payout_amount : 0;
                            var userId = userTicket.user_id;
                            var chargeId = userTicket.charge_id;

                            if (chargeId && refundAmount && refundAmount > 0) {
                                return await proceesRefundPayment(refundAmount, chargeId).then(async (stripeResponse) => {
                                    return await saveUserRefundDetails(stripeResponse, userTicketId);
                                }).then(async () => {
                                    var updateObj = {
                                        event_status: "refunded",
                                        status: "cancel",
                                    };

                                    if (userTicket.ticket_details_status === "paid") {
                                        updateObj.ticket_details_status = "refunded";
                                    } else {
                                        updateObj.ticket_details_status = "cancel";
                                    }

                                    return await updateTicketStatus(userTicketId, updateObj);
                                }).then(async () => {
                                    var userDetails = await getUserDetails(userId);
                                    let UserInfo = {
                                        email: userDetails[0].email,
                                        username: userDetails[0].username,
                                        first_name: userDetails[0].first_name,
                                        last_name: userDetails[0].last_name,
                                        is_email_verified: userDetails[0].is_email_verified,
                                    };
                                    // allUsersMailId.push(userDetails[0].email);
                                    allUsersMailId.push(UserInfo);
                                    allUserIds.push(userId);
                                    return Promise.resolve(true);
                                }).catch((error) => {
                                    return Promise.reject(error);
                                });
                            } else {
                                return Promise.resolve(true);
                            }
                        } else {
                            //no refund
                            var userTicketId = userTicket.id;
                            var userId = userTicket.user_id;

                            var updateObj = {
                                event_status: "refunded",
                                status: "cancel",
                            };

                            if (userTicket.ticket_details_status === "paid") {
                                updateObj.ticket_details_status = "refunded";
                            } else {
                                updateObj.ticket_details_status = "cancel";
                            }
                            return await updateTicketStatus(userTicketId, updateObj).then(async () => {
                                var userDetails = await getUserDetails(userId);
                                // allUsersMailId.push(userDetails[0].email);
                                let UserInfo = {
                                    email: userDetails[0].email,
                                    username: userDetails[0].username,
                                    first_name: userDetails[0].first_name,
                                    last_name: userDetails[0].last_name,
                                    is_email_verified: userDetails[0].is_email_verified,
                                };
                                allUsersMailId.push(UserInfo);
                                allUserIds.push(userId);
                                return Promise.resolve(true);
                            }).catch((error) => {
                                return Promise.reject(error);
                            });
                        }
                    })
                );
            })
        ).then(async () => {
            return await updateEventDetails(eventId, "cancel", eventCancelReason);
        }).then(async () => {
            if (allUsersMailId.length > 0) {
                var eventName = dataContainer.event_details.event_name;
                var eventId = dataContainer.event_details.event_id;
                let mailDataObj = {
                    event_name: eventName,
                    event_id: eventId,
                };
                await notifyUser(mailDataObj, allUsersMailId);
                await handleSendingPushNotificationToAllAttnedees(allUserIds, dataContainer.event_details, organiserId);
            } else {
                return resolve({ success: true, message: successMessages.ALL_TICKET_PROCESS_COMPLETED });
            }
        }).then(() => {
            return resolve({ success: true, message: successMessages.EVENT_CANCELLED });
        }).catch((error) => {
            return reject({ success: false, message: error.message });
        });
    });
};

const validateEventCancelRequest = async (eventId, dataContainer) => {
    function getEventStartTimeDifference(eventStartDate, currentTime) {
        var diff = Math.abs(eventStartDate - currentTime) / 1000;
        var days = Math.floor(diff / 86400);
        var hours = parseFloat((diff / 3600) % 24).toFixed(2) * 1;
        return {
            days: days,
            hours: hours,
        };
    }

    const getEventDetail = (eventId) => {
        return new Promise(async (resolve, reject) => {
            var sqlQry = `SELECT event_id, event_name FROM event_master WHERE event_id = ${eventId} AND status = 'active'`;
            let eventResult = await DBManager.runQuery(sqlQry);
            if (eventResult && eventResult.length > 0) {
                dataContainer["event_details"] = eventResult[0];
                return resolve(eventResult);
            } else {
                return reject({ status: false, message: errorMessages.YOU_CAN_NOT_CANCEL_THIS_EVENT });
            }
        });
    };

    return new Promise(async (resolve, reject) => {
        return await getEventDetail(eventId).then((eventResult) => {
            var eventStartTime = new Date(eventResult[0].start_date_time);
            var currentTime = new Date();
            // if (eventStartTime > currentTime) {
            //     var eventStartLeftTime = getEventStartTimeDifference(eventStartTime, currentTime);
            //     var eventStartLeftDays = eventStartLeftTime.days;

            return resolve({ status: true, message: successMessages.VALID_EVENT_CANCEL_REQUEST });

            // } else {
            //     return reject({
            //         status: false, message: "Event has been started, You can not cancel this event."
            //     })
            // }
        }).catch((error) => {
            return reject({ status: false, message: error.message });
        });
    });
};

const validate = function (body) {
    const schema = Joi.object().keys({
        eventId: Joi.number().required(),
        event_cancel_reason: Joi.string().required(),
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

const FILE_PATH = __filename;

module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN, };
    var dataContainer = {};

    try {
        let organiser = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        var organiserId = organiser.id;
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        var eventId = apiData.eventId;
        var eventCancelReason = apiData.event_cancel_reason;
        await validateEventCancelRequest(eventId, dataContainer);
        var eventTickets = await getEventTickets(eventId, dataContainer);
        if (eventTickets[0].totalCount) {
            var usersEventTicketsList = await getEventUsersTickets(eventId);
            return await processEventTicketsInBunch(eventId, usersEventTicketsList, eventCancelReason, dataContainer, organiserId).then((finalResponse) => {
                return awsRequestHelper.respondWithJsonBody(200, finalResponse);
            });
        } else {
            return await updateEventDetails(eventId, "cancel", eventCancelReason).then(() => {
                return awsRequestHelper.respondWithJsonBody(200, { success: true, message: successMessages.EVENT_CANCELLED });
            });
        }
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
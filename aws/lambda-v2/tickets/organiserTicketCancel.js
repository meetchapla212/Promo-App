const awsRequestHelper = require("../../lambda/common/awsRequestHelper");
const utils = require("../common/utils");
const DBM = require("../common/mysqlmanager");
const fs = require("fs");
const DBManager = new DBM();
const stripe = require("stripe")(process.env.STRIPE_KEY);
const AWSManager = require("../common/awsmanager");
const _ = require("lodash");
const FILE_PATH = __filename;
// const Joi = require("joi");
const { errorMessages, stringMessages, successMessages, emailAndPushNotiTitles } = require("../common/constants");

const validateCancelTicketRequest = (ticketId, organiserId) => {
    return new Promise(async (resolve, reject) => {
        var tempDataContainer = {};

        const fetchUserTicketData = () => {
            return new Promise(async (resolve, reject) => {
                var whereQry = "WHERE id = " + ticketId + " ";
                var sqlQry = "SELECT event_id FROM user_tickets " + whereQry + " ";
                let userTicket = await DBManager.runQuery(sqlQry);
                if (userTicket && userTicket.length > 0) {
                    tempDataContainer["user_ticket"] = userTicket[0];
                    return resolve(true);
                } else {
                    return reject("Ticket data not found while canceling ticket!");
                }
            });
        };

        function isOrganiserBelongToEvent(ticketId) {
            return new Promise(async (resolve, reject) => {
                var ticketData = tempDataContainer.user_ticket;
                var ticketEventId = ticketData.event_id;
                var whereQry = "WHERE event_id = " + ticketEventId + " AND _user_id = " + organiserId + " ";
                var sqlQry = "SELECT count(*) as totalCount FROM event_master " + whereQry + " ";
                let organiserEventExist = await DBManager.runQuery(sqlQry);
                if (organiserEventExist[0].totalCount) {
                    resolve(true);
                } else {
                    reject("The ticket you want to cancel is not ticket of your event!");
                }
            });
        }

        function isTicketIsActive() {
            return new Promise(async (resolve, reject) => {
                var whereQry = "WHERE id = " + ticketId + " AND user_tickets.status = 'active'";
                var sqlQry = "SELECT count(*) as totalCount FROM user_tickets " + whereQry + " ";
                let recordsExist = await DBManager.runQuery(sqlQry);
                if (recordsExist[0].totalCount) {
                    resolve(true);
                } else {
                    reject("The ticket you want to cancel is already cancelled!");
                }
            });
        }

        function checkUserTicketPaymentStatus() {
            return new Promise(async (resolve, reject) => {
                var whereQry = "WHERE id = " + ticketId + " AND user_tickets.event_status = 'approved'";
                var sqlQry = "SELECT count(*) as totalCount FROM user_tickets " + whereQry + " ";
                let recordsExist = await DBManager.runQuery(sqlQry);
                if (recordsExist[0].totalCount) {
                    resolve(true);
                } else {
                    reject("The payment status of the ticket is not approved!");
                }
            });
        }

        fetchUserTicketData()
            .then(isOrganiserBelongToEvent)
            .then(isTicketIsActive)
            .then(checkUserTicketPaymentStatus).then(() => {
                return resolve({ status: true });
            }).catch((error) => {
                return reject({ success: false, message: error });
            });
    });
};

//TODO: fetch ticket, event, event ticket details
const fetchNecessaryData = (ticketId, dataContainer) => {
    return new Promise(async (resolve, reject) => {
        const fetchUserTicket = () => {
            return new Promise(async (resolve, reject) => {
                var whereQry = "WHERE id = " + ticketId + " ";
                var sqlQry = "SELECT user_id, event_id, ticket_qty, charge_id, payout_amount FROM user_tickets " + whereQry + " ";
                let userTicket = await DBManager.runQuery(sqlQry);
                if (userTicket && userTicket.length > 0) {
                    dataContainer["user_ticket"] = userTicket[0];
                    return resolve(true);
                } else {
                    return reject("Ticket data not found while canceling ticket!");
                }
            });
        };

        const fetchUserTicketDetail = () => {
            return new Promise(async (resolve, reject) => {
                var whereQry = "WHERE _purchased_ticket_id = " + ticketId + " ";
                var sqlQry = "SELECT _ticket_id FROM user_ticket_details " + whereQry + " ";
                let userTicketDetails = await DBManager.runQuery(sqlQry);
                if (userTicketDetails && userTicketDetails.length > 0) {
                    dataContainer["user_ticket_details"] = userTicketDetails[0];
                    return resolve(true);
                } else {
                    return reject("Ticket details data not found while canceling ticket!");
                }
            });
        };

        const fetchTicketUser = () => {
            var userId = dataContainer.user_ticket.user_id;
            return new Promise(async (resolve, reject) => {
                let sqlQry = "SELECT user_id, first_name, last_name, username FROM user_master WHERE user_id = " + userId + " ";
                let userDetails = await DBManager.runQuery(sqlQry);
                if (userDetails.length > 0) {
                    dataContainer["user_details"] = userDetails[0];
                    return resolve(true);
                } else {
                    return reject(errorMessages.USER_NOT_FOUND);
                }
            });
        };

        const fetchEvent = () => {
            var eventId = dataContainer.user_ticket.event_id;
            return new Promise(async (resolve, reject) => {
                if (eventId) {
                    var sqlQry = "SELECT start_date_time, event_name, event_id FROM event_master WHERE event_id = " + eventId + " ";
                    let eventResult = await DBManager.runQuery(sqlQry);
                    if (eventResult && eventResult.length > 0) {
                        dataContainer["event_details"] = eventResult[0];
                        return resolve(eventResult);
                    } else {
                        return reject(errorMessages.EVENT_NOT_FOUND);
                    }
                } else {
                    return reject("Getting invalid event id while canceling ticket!");
                }
            });
        };

        const fetchEventTicket = () => {
            var eventTicketId = dataContainer.user_ticket_details._ticket_id;
            return new Promise(async (resolve, reject) => {
                if (eventTicketId) {
                    var sqlQry = `SELECT ticket_id, remaining_qty FROM event_tickets WHERE ticket_id = ${eventTicketId}`;
                    let eventTicketResult = await DBManager.runQuery(sqlQry);
                    if (eventTicketResult && eventTicketResult.length > 0) {
                        dataContainer["event_ticket_details"] = eventTicketResult[0];
                        return resolve(eventTicketResult);
                    } else {
                        return reject("Event ticket details not found!");
                    }
                } else {
                    return reject(
                        "Getting invalid event ticket id while canceling ticket!"
                    );
                }
            });
        };

        fetchUserTicket()
            .then(fetchUserTicketDetail)
            .then(fetchTicketUser)
            .then(fetchEvent)
            .then(fetchEventTicket).then(() => {
                return resolve({ status: true });
            }).catch((error) => {
                return reject({ success: false, message: error });
            });
    });
};

//TODO: user user ticket status (refunding, refunded)
const updateTicketRefundStatus = async (ticketId, updateObj) => {
    await DBManager.getData("user_tickets", "*", { id: ticketId }).then(
        async (responseDetails) => {
            return Promise.all(
                responseDetails.map(async (resDetails) => {
                    if (resDetails.ticket_details_status == "free") {
                        updateObj.ticket_details_status = "cancel";
                    } else {
                        updateObj.ticket_details_status = "refunded";
                    }
                })
            );
        }
    );

    var whereQueryUpdateTicket = { id: ticketId };
    return await DBManager.dataUpdate("user_tickets", updateObj, whereQueryUpdateTicket);
};

//TODO: update event ticket remaining ticket quntity when user cancel ticket for any event
const updateEventTicketQuantity = (dataContainer) => {
    return new Promise(async (resolve, reject) => {
        var ticketDetails = dataContainer.user_ticket;
        var eventTicketDetails = dataContainer.event_ticket_details;
        if (ticketDetails && eventTicketDetails) {

            var userTicketQty = ticketDetails.ticket_qty !== null ? ticketDetails.ticket_qty : 0;
            var eventTicketId = eventTicketDetails.ticket_id;
            var eventRemainingTicketQty = eventTicketDetails.remaining_qty !== null ? eventTicketDetails.remaining_qty : 0;
            var eventNewRemainingTicketQty = parseInt(eventRemainingTicketQty) + parseInt(userTicketQty);

            try {
                let updateQuery = `UPDATE event_tickets SET remaining_qty = '${eventNewRemainingTicketQty}' WHERE ticket_id = ${eventTicketId} AND quantity >= ${eventNewRemainingTicketQty}`;
                return await DBManager.runQuery(updateQuery).then(() => {
                    resolve({
                        success: true,
                        message: successMessages.TICKET_UPDATED
                    });
                }).catch((error) => {
                    reject({ success: false, message: error.message });
                });
            } catch (error) {
                reject({
                    status: false,
                    message: error.message,
                });
            }
        } else {
            reject({
                status: false,
                message: "User ticket or event ticket details not found while updating event remainig quantity!",
            });
        }
    });
};

//TODO: notification to user on ticket cancelling
const notifyUser = async (mailDataObj, user) => {
    if (user.email && user.email !== "" && user.is_email_verified && user.is_email_verified == 1) {
        let tmpl = fs.readFileSync(
            "./lambda/emailtemplates/notify_attendee_on_ticket_cancel_by_organiser.html",
            "utf8"
        );
        let mailSubject = `Ticket cancel for ${mailDataObj.event_name} event`;
        let event_name = mailDataObj.event_name.replace(/\s+/g, "-").toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${mailDataObj.event_id}`;
        let templateVars = Object.assign(
            {
                base_url: process.env.UI_BASE_URL,
                eventUrl: event_url,
                ...mailDataObj,
            },
            AWSManager.MAIL_PARAMS
        );

        let mailBody = _.template(tmpl)(templateVars);
        return await AWSManager.sendEmail([user.email], mailBody, mailSubject);
    }
};

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await DBManager.getData("app_token_master", "token", {
        _user_id: userId,
    });
    return userDeviceTokenData;
};

const notifyUserByPushNotification = async (userId, eventName) => {
    var userDeviceTokenData = await getUserDeviceToken(userId);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];

        var message = {
            title: emailAndPushNotiTitles.TICKET_CANCELLED,
            body: emailAndPushNotiTitles.EVENT_ORGANISER_CANCELLED_YOUR_TICKET + eventName,
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

    return await DBManager.dataInsert("user_notification", dataObj).then(async (notificationSaveResponse) => {
        return Promise.resolve(notificationSaveResponse);
    }).catch((error) => {
        return Promise.reject(error);
    });
};

//TODO: process user refund payment
const refundUserPayment = async (ticketId, dataContainer, ticketCancelReason, userDetails, organiserId) => {
    return new Promise(async (resolve, reject) => {
        function getEventStartTimeDifference(eventStartDate, currentDate) {
            var diff = Math.abs(eventStartDate - currentDate) / 1000;
            var days = Math.floor(diff / 86400);
            var hours = parseFloat((diff / 3600) % 24).toFixed(2) * 1;
            return {
                days: days,
                hours: hours,
            };
        }

        async function proceesRefundPayment(userRefundAmount, ticketChargeId) {
            return new Promise(async (resolve, reject) => {
                return await stripe.refunds.create({
                    charge: ticketChargeId,
                    amount: parseInt(userRefundAmount * 100),
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

        var ticketDetails = dataContainer.user_ticket;
        var eventDetails = dataContainer.event_details;
        var eventTicketDetails = dataContainer.event_ticket_details;
        var ticketChargeId = ticketDetails.charge_id;
        var userTotalPayedAmount = 0;
        var userRefundAmount = 0;

        // if (!ticketChargeId) {
        //     return reject({ status: false, message: 'Getting invalid charge id while refund payment!' })
        // }

        if (ticketDetails && eventDetails && eventTicketDetails) {
            new Promise(async (resolve, reject) => {
                var eventStartTime = new Date(eventDetails.start_date_time);
                var currentTime = new Date();
                var eventStartLeftTime = getEventStartTimeDifference(
                    eventStartTime,
                    currentTime
                );
                var eventStartLeftHours = eventStartLeftTime.hours;
                var eventStartLeftDays = eventStartLeftTime.days;

                if (eventStartTime > currentTime) {
                    if (eventStartLeftDays > 0) {
                        userTotalPayedAmount = ticketDetails.payout_amount;
                        userRefundAmount = ticketDetails.payout_amount;
                        if (userRefundAmount > 0) {
                            try {
                                const stripeRes = await proceesRefundPayment(
                                    userRefundAmount,
                                    ticketChargeId
                                );
                                resolve(stripeRes);
                            } catch (stripeError) {
                                reject(stripeError);
                            }
                        } else {
                            resolve({ success: true });
                        }
                    } else {
                        if (eventStartLeftHours < 2) {
                            //TODO: not any amount refund
                            userTotalPayedAmount = ticketDetails.payout_amount;
                            userRefundAmount = 0;
                            resolve({
                                success: true,
                                message: successMessages.TICKET_CANCELLED
                            });
                        } else if (eventStartLeftHours >= 2 && eventStartLeftHours <= 24) {
                            //TODO: 70% of amount refund
                            userTotalPayedAmount = ticketDetails.payout_amount;
                            userRefundAmount = (userTotalPayedAmount / 100) * 70;
                            if (userRefundAmount > 0) {
                                try {
                                    const stripeRes = await proceesRefundPayment(
                                        userRefundAmount,
                                        ticketChargeId
                                    );
                                    resolve(stripeRes);
                                } catch (stripeError) {
                                    reject(stripeError);
                                }
                            } else {
                                resolve({ success: true });
                            }
                        }
                    }
                } else {
                    reject({
                        status: true,
                        message:
                            "Event is started or may be over, you can no longer cancel your ticket.",
                    });
                }
            }).then(async (stripeResponse) => {
                if (stripeResponse && stripeResponse.data && stripeResponse.data.id) {
                    async function saveUserRefundDetails() {
                        let refundUserDetails = {
                            refund_id: stripeResponse.data.id,
                            transaction_id: stripeResponse.data.balance_transaction,
                            charge_id: stripeResponse.data.charge,
                            _ticket_id: ticketId,
                        };
                        return await DBManager.dataInsert(
                            "user_refunds",
                            refundUserDetails
                        );
                    }

                    return await saveUserRefundDetails().then(async () => {
                        let userMail = {
                            attendee_name: utils.toTitleCase(userDetails.first_name && userDetails.last_name ? userDetails.first_name + " " + userDetails.last_name : userDetails.username),
                            event_name: eventDetails.event_name,
                            event_id: eventDetails.event_id,
                            cancel_reason: ticketCancelReason,
                        };

                        return await notifyUser(userMail, userDetails);
                    });
                } else {
                    let userMail = {
                        attendee_name: utils.toTitleCase(userDetails.first_name && userDetails.last_name ? userDetails.first_name + " " + userDetails.last_name : userDetails.username),
                        event_name: eventDetails.event_name,
                        event_id: eventDetails.event_id,
                        cancel_reason: ticketCancelReason,
                    };
                    return await notifyUser(userMail, userDetails);
                }
            }).then(async () => {
                //user push notification
                return await notifyUserByPushNotification(userDetails.user_id, eventDetails.event_name);
            }).then(async () => {
                let saveObj = {
                    _user_id: organiserId,
                    _event_id: eventDetails.event_id,
                    notify_type: stringMessages.DATA,
                    payload_data: {
                        messageFrom: stringMessages.PROMO_TEAM,
                    },
                    notify_user_id: userDetails.user_id,
                    notify_text: emailAndPushNotiTitles.EVENT_ORGANISER_CANCELLED_YOUR_TICKET + eventDetails.event_name,
                };

                return await savePushNotification(saveObj);
            }).then(async () => {
                //TODO: updating user refund status
                var updateObj = {
                    event_status: "refunded",
                    status: "cancel",
                };

                if (dataContainer.user_ticket.ticket_details_status === "paid") {
                    updateObj.ticket_details_status = "refunded";
                } else {
                    updateObj.ticket_details_status = "cancel";
                }

                return await updateTicketRefundStatus(ticketId, updateObj);
            }).then(() => {
                resolve({
                    status: true,
                    message: "User refund process done succefully!",
                });
            }).catch((error) => {
                reject(error);
            });
        } else {
            reject({
                status: false,
                message: "Getting invalid ticket details while refund payment!",
            });
        }
    });
};

module.exports.handler = async function (event, context, callback) {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };
    try {
        let organiser = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        var organiserId = organiser.id;
        var ticketPurchaseId = event.pathParameters.purchase_ticketId;
        var ticketCancelReason = "";
        var dataContainer = {};
        await validateCancelTicketRequest(ticketPurchaseId, organiserId);
        await fetchNecessaryData(ticketPurchaseId, dataContainer);
        await refundUserPayment(ticketPurchaseId, dataContainer, ticketCancelReason, dataContainer.user_details, organiserId);
        return await updateEventTicketQuantity(dataContainer).then(() => {
            return awsRequestHelper.respondWithJsonBody(200, {
                success: true,
                message: successMessages.ORGANISER_TICKET_CANCELLED
            });
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
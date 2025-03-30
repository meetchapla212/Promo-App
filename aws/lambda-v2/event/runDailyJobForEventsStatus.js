const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const AWSManager = require('../common/awsmanager');
const fs = require('fs');
const _ = require('lodash');
const MDBObject = new MDB();
const moment = require('moment');
const utils = require('../common/utils');
const { errorMessages, emailAndPushNotiTitles, stringMessages } = require("../common/constants");

//get user device token
const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await MDBObject.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
}

//notify organiser on payout process
const notifyOrganiser = async (event, organiser) => {
    if (organiser.email && organiser.email !== '' && organiser.is_email_verified && organiser.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_organiser_on_payout_process.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.PAYOUT_HAS_BEEN_PROCESSED_FOR_EVENT + event.event_name + stringMessages.EVENT;
        let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        let organiser_payout_url = `${process.env.UI_BASE_URL}/my_payout`
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            payoutUrl: organiser_payout_url,
            event_name: event.event_name,
            organiser_name: utils.toTitleCase((organiser.first_name && organiser.last_name) ? organiser.first_name + ' ' + organiser.last_name : organiser.username)
        }, AWSManager.MAIL_PARAMS);
        console.log('templateVars====', templateVars)
        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([organiser.email], mailBody, mailSubject);
    }
}

//notify organiser on payout process by push notification
const notifyOrganiserByPushNotification = async (organiserId, eventName) => {
    var organiserDeviceTokenData = await getUserDeviceToken(organiserId);
    if (organiserDeviceTokenData.length > 0) {
        var { token } = organiserDeviceTokenData[0];

        var message = {
            title: emailAndPushNotiTitles.PAYOUT_PROCESSED,
            body: `Your ${eventName} ${emailAndPushNotiTitles.EVENT_HAS_ENDED_PAYOUT_HAS_BEEN_PROCESSED}`,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.ORGANISER_DEVICE_ID_NOT_FOUND })
    }
}

//notify promo team on organiser payout failure
const notifyPromoTeamOnPayoutFailure = async (event, customer) => {
    let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_promoteam_on_payout_failure.html', 'utf8');
    
    let PAYOUT_FAILURE = emailAndPushNotiTitles.PAYOUT_FAILURE;
    PAYOUT_FAILURE = PAYOUT_FAILURE.replace('<eventName>', event.event_name);

    let mailSubject = PAYOUT_FAILURE;
    let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
    let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
    console.log(AWSManager.MAIL_PARAMS);
    let templateVars = Object.assign({
        base_url: process.env.UI_BASE_URL,
        eventUrl: event_url,
        event_name: event.event_name,
        customer_name: utils.toTitleCase((customer.first_name && customer.last_name) ? customer.first_name + ' ' + customer.last_name : customer.username)
    }, AWSManager.MAIL_PARAMS);

    let mailBody = _.template(tmpl)(templateVars);
    await AWSManager.sendEmail(['Donotreply@thepromoapp.com'], mailBody, mailSubject);
}

//save push notifications
const savePushNotification = async (data) => {
    var dataObj = {
        _user_id: data._user_id,
        _event_id: data._event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify(data.payload_data),
        notify_user_id: data.notify_user_id,
        notify_text: data.notify_text,
    }

    return await MDBObject.dataInsert("user_notification", dataObj).then(async (notificationSaveResponse) => {
        return Promise.resolve(notificationSaveResponse)
    }).catch(error => {
        return Promise.reject(error)
    })
}

//send mail to user on reward has expired
const notifyUserOnRewardHasExpired = async (user, event, reward) => {
    if (user.email && user.email !== '' && user.is_email_verified && user.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_user_on_eligible_reward_has_expired.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.REWARD_EXPIRED;
        let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            reward_name: reward.title,
            user_name: utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username)
        }, AWSManager.MAIL_PARAMS);
        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([user.email], mailBody, mailSubject);
    }
}

//send mail to organiser on user reward has expired
const notifyOrganiserOnUserRewardHasExpired = async (organiser, event, user, reward) => {
    if (organiser.email && organiser.email !== '' && organiser.is_email_verified && organiser.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_organiser_on_user_eligible_reward_has_expired.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.REWARD_EXPIRED;
        let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            reward_name: reward.title,
            user_name: utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username),
            organiser_name: utils.toTitleCase((organiser.first_name && organiser.last_name) ? organiser.first_name + ' ' + organiser.last_name : organiser.username)
        }, AWSManager.MAIL_PARAMS);
        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([organiser.email], mailBody, mailSubject);
    }
}

//fetch necessary data
const fetchNecessaryData = (dataContainer, userId, eventId) => {
    return new Promise(async (resolve, reject) => {
        const fetchEvent = () => {
            return new Promise(async (resolve, reject) => {
                var sqlQry = "SELECT _user_id FROM event_master WHERE event_id = " + eventId + " ";
                let eventResult = await MDBObject.runQuery(sqlQry);
                if (eventResult && eventResult.length > 0) {
                    dataContainer['event_details'] = eventResult[0];
                    return resolve(eventResult);
                } else {
                    return resolve(errorMessages.EVENT_NOT_FOUND);
                }
            })
        }

        const fetchUser = () => {
            return new Promise(async (resolve, reject) => {
                let sqlQry = "SELECT first_name, last_name, username, email, is_email_verified FROM user_master WHERE user_id = " + userId + " ";
                let userDetails = await MDBObject.runQuery(sqlQry);
                if (userDetails.length > 0) {
                    dataContainer['user_details'] = userDetails[0];
                    return resolve(userDetails);
                } else {
                    return resolve(errorMessages.REFRENCE_USER_NOT_FOUND);
                }
            })
        }

        const fetchOrganiser = () => {
            var organiserId = dataContainer.event_details._user_id;
            return new Promise(async (resolve, reject) => {
                if (organiserId) {
                    let sqlQry = "SELECT email, is_email_verified, first_name, last_name, username FROM user_master WHERE user_id = " + organiserId + " ";
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

        fetchEvent()
            .then(fetchUser)
            .then(fetchOrganiser)
            .then(() => {
                return resolve({ status: true })
            }).catch(error => {
                return reject({ success: false, message: error });
            })
    })
}



const takePayout = async function (eventId, user_id, eventDetails) {
    let ticketDetails = `SELECT sum(payout_amount) as total_payout FROM user_tickets where event_id = ${eventId} AND event_status ='approved'`;
    let getTicketData = await MDBObject.runQuery(ticketDetails);
    let total_payout = 0;
    let userAccountid = '';
    var organiserDetails = {};
    if (getTicketData && getTicketData.length && getTicketData[0].total_payout) {
        total_payout = getTicketData[0].total_payout;
    }
    if (user_id != '') {
        userAccount = await MDBObject.getData('user_master', 'user_id, first_name, last_name, username, email, is_email_verified, stripe_account_id', { user_id: user_id });
        if (userAccount.length > 0) {
            organiserDetails = userAccount[0];
            userAccountid = userAccount[0].stripe_account_id;
        } else {
            return false;
        }
    } else {
        return false;
    }
    if (total_payout > 0) {
        await stripe.transfers.create({ amount: (Math.round(total_payout * 100)), currency: 'usd', destination: userAccountid }).then(async stripeResponse => {
            const payout = await stripe.payouts.create({
                amount: (Math.round(total_payout * 100)),
                currency: 'usd',
            }, { stripeAccount: userAccountid });

            let insertPayoutOblect = {
                _event_id: eventId,
                _user_id: user_id,
                payout_amount: total_payout,
                stripe_transfer_id: stripeResponse.id,
                stripe_payout_id: payout.id,
                payout_created: stripeResponse.created,
                tnx_id: payout.balance_transaction,
                payout_expected: payout.arrival_date
            }
            await MDBObject.dataInsert('event_payout_master', insertPayoutOblect);
            await notifyOrganiser(eventDetails, organiserDetails);
            await notifyOrganiserByPushNotification(organiserDetails.user_id, eventDetails.event_name);

            let saveObj = {
                _user_id: -1,
                _event_id: eventDetails.event_id,
                notify_type: stringMessages.DATA,
                payload_data: {
                    messageFrom: stringMessages.PROMO_TEAM
                },
                notify_user_id: organiserDetails.user_id,
                notify_text: stringMessages.YOUR + ' ' + eventDetails.event_name + emailAndPushNotiTitles.EVENT_HAS_ENDED_PAYOUT_HAS_BEEN_PROCESSED,
            }

            await savePushNotification(saveObj);
            return true;
        }).catch(error => {
            console.log('Stripe error====', error);
        });
        return true;
    }
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        var currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
        let getEventQuery = "SELECT end_date_time, _user_id, bank_id, event_id, event_name FROM event_master WHERE DATE_FORMAT(end_date_utc, '%Y-%m-%d %H:%i:%s') < '" + currentDate + "' AND status != 'inactive' AND _user_id > 0";
        let eventList = await MDBObject.runQuery(getEventQuery);
        if (eventList.length > 0) {
            await Promise.all(
                eventList.map(async eventDetails => {
                    eventEndDate = moment(eventDetails.end_date_time).valueOf();
                    if (eventDetails._user_id > 0 && (eventDetails.bank_id != '' || eventDetails.bank_id > 0)) {
                        await takePayout(eventDetails.event_id, eventDetails._user_id, eventDetails.bank_id, eventDetails).then((res) => {
                        }).catch(async (error) => {
                            let organiserDetails = await MDBObject.getData('user_master', 'first_name, first_name, username', { user_id: eventDetails._user_id });
                            await notifyPromoTeamOnPayoutFailure(eventDetails, organiserDetails);
                            return error;
                        });
                    }

                    var eventId = eventDetails.event_id;
                    let eventRewardDetails = await MDBObject.getData('reward_master', '*', { _event_id: eventId });
                    if (eventRewardDetails.length > 0) {
                        var rewardId = eventRewardDetails[0].reward_id;
                        var rewardWinnerUsers = await MDBObject.getData('reward_winner_master', '_user_id', { _reward_id: rewardId });
                        if (rewardWinnerUsers.length > 0) {
                            await Promise.all(rewardWinnerUsers.map(async (winnerUser) => {
                                var winnerUserId = winnerUser._user_id;
                                var isUserClaimReward = await MDBObject.getData('winner_information', 'info_id', { _reward_id: rewardId, _winner_user_id: winnerUserId }, "AND");
                                if (isUserClaimReward.length <= 0) {
                                    //fetch necessary data
                                    var dataContainer = {};
                                    await fetchNecessaryData(dataContainer, winnerUserId, eventId)
                                    //send mail to user
                                    await notifyUserOnRewardHasExpired(dataContainer.user_details, eventDetails, eventRewardDetails[0]);
                                    //send mail to organiser
                                    await notifyOrganiserOnUserRewardHasExpired(dataContainer.organiser_details, eventDetails, dataContainer.user_details, eventRewardDetails[0]);
                                }
                            }))
                        }
                    }
                    await MDBObject.dataUpdate('event_master', { status: 'inactive' }, { event_id: eventDetails.event_id });
                })
            )
        }
        let deleteQueryEvent = "DELETE FROM event_master WHERE DATE_FORMAT(end_date_utc, '%Y-%m-%d %H:%i:%s') < '" + currentDate + "' AND status != 'inactive' AND _user_id = 0 AND isPHQ = 1";
        await MDBObject.runQuery(deleteQueryEvent);
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};

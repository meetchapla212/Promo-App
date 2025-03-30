const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const AWSManager = require('../common/awsmanager');
const fs = require('fs');
const _ = require('lodash');
const MDBObject = new MDB();
const moment = require('moment');
const utils = require('../common/utils');
const { errorMessages, emailAndPushNotiTitles, stringMessages } = require("../common/constants");

const fetchNecessaryData = (dataContainer, userId, eventId) => {
    return new Promise(async (resolve, reject) => {
        const fetchEvent = () => {
            return new Promise(async (resolve, reject) => {
                var sqlQry = "SELECT _user_id, event_name, event_id FROM event_master WHERE event_id = " + eventId + " ";
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
                let sqlQry = "SELECT user_id, first_name, last_name, username, email, is_email_verified FROM user_master WHERE user_id = " + userId + " ";
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
                    let sqlQry = "SELECT user_id, first_name, last_name, username, email, is_email_verified FROM user_master WHERE user_id = " + organiserId + " ";
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
            })
            .catch(error => {
                return reject({ success: false, message: error });
            })
    })
}

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await MDBObject.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
}

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

const notifyUserOnRewardAboutToExpire = async (user, event, reward) => {
    if (user.email && user.email !== '' && user.is_email_verified && user.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_user_on_eligible_reward_about_to_expire.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.REMINDER_ON_UNCLAIMED_REWARD;
        let reward_claim_url = `${process.env.UI_BASE_URL}/view_analytics_attendee/${reward.reward_id}`
        let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            rewardClaimUrl: reward_claim_url,
            eventUrl: event_url,
            reward_name: reward.title,
            user_name: utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username)
        }, AWSManager.MAIL_PARAMS);
        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([user.email], mailBody, mailSubject);
    }
}

const notifyUserOnRewardAboutToExpireByPushNotification = async (user, reward, event) => {
    var userDeviceTokenData = await getUserDeviceToken(user.user_id);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        let userName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username);
        let USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT;
        USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT = USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT
            .replace('<userName>', userName)
            .replace('<rewardTitle>', reward.title)
            .replace('<eventName>', event.event_name);

        var message = {
            title: emailAndPushNotiTitles.REMINDER_ON_UNCLAIMED_REWARD,
            body: USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.USER_DEVICE_ID_NOT_FOUND })
    }
}

const notifyOrganiserOnUserRewardAboutToExpire = async (organiser, event, user, reward) => {
    if (organiser.email && organiser.email !== '' && organiser.is_email_verified && organiser.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_organiser_on_user_eligible_reward_about_to_expire.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.REMINDER_ON_UNCLAIMED_REWARD;
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

const notifyOrganiserOnUserRewardAboutToExpireByPushNotification = async (organiser, user, reward, event) => {
    var userDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        let userName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username);

        let USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT;
        USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT = USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT
            .replace('<userName>', userName)
            .replace('<rewardTitle>', reward.title)
            .replace('<eventName>', event.event_name);

        var message = {
            title: emailAndPushNotiTitles.REMINDER_ON_UNCLAIMED_REWARD,
            body: USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.USER_DEVICE_ID_NOT_FOUND })
    }
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        var currentTime = moment().format("YYYY-MM-DD HH:mm");
        var halfHourBeforeTime = moment().subtract(30, 'minute').format("YYYY-MM-DD HH:mm");

        let getEventQuery = "SELECT event_id, event_name FROM event_master WHERE DATE_FORMAT(start_date_time, '%Y-%m-%d %H:%i') >= '" + halfHourBeforeTime + "' AND DATE_FORMAT(start_date_time, '%Y-%m-%d %H:%i') <= '" + currentTime + "' AND _user_id > 0 AND status != 'inactive'";
        console.log('query===', getEventQuery)
        let eventList = await MDBObject.runQuery(getEventQuery);

        if (eventList.length > 0) {
            await Promise.all(eventList.map(async eventDetails => {
                var eventId = eventDetails.event_id;
                let eventRewardDetails = await MDBObject.getData('reward_master', '*', { _event_id: eventId });
                if (eventRewardDetails.length > 0) {
                    var rewardId = eventRewardDetails[0].reward_id;
                    var rewardWinnerUsers = await MDBObject.getData('reward_winner_master', '*', { _reward_id: rewardId });
                    if (rewardWinnerUsers.length > 0) {
                        await Promise.all(rewardWinnerUsers.map(async (winnerUser) => {
                            var winnerUserId = winnerUser._user_id;
                            var isUserClaimReward = await MDBObject.getData('winner_information', '*', { _reward_id: rewardId, _winner_user_id: winnerUserId }, "AND");
                            if (isUserClaimReward.length <= 0) {
                                var dataContainer = {};
                                //fetch necessary data
                                await fetchNecessaryData(dataContainer, winnerUserId, eventId);
                                //send mail to user
                                await notifyUserOnRewardAboutToExpire(dataContainer.user_details, eventDetails, eventRewardDetails[0]);
                                //send push notification to user
                                await notifyUserOnRewardAboutToExpireByPushNotification(dataContainer.user_details, eventRewardDetails[0], dataContainer.event_details);
                                //save push notification
                                let userName = utils.toTitleCase((dataContainer.user_details.first_name && dataContainer.user_details.last_name) ? dataContainer.user_details.first_name + ' ' + dataContainer.user_details.last_name : dataContainer.user_details.username)

                                let USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT;
                                USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT = USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT
                                    .replace('<userName>', userName)
                                    .replace('<rewardTitle>', eventRewardDetails[0].title)
                                    .replace('<eventName>', dataContainer.event_details.event_name);

                                let userPushNotification = {
                                    _user_id: -1,
                                    _event_id: dataContainer.event_details.event_id,
                                    notify_type: stringMessages.DATA,
                                    payload_data: {
                                        messageFrom: stringMessages.PROMO_TEAM
                                    },
                                    notify_user_id: dataContainer.user_details.user_id,
                                    notify_text: USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT,
                                }
                                await savePushNotification(userPushNotification);
                                //send mail to organiser
                                await notifyOrganiserOnUserRewardAboutToExpire(dataContainer.organiser_details, eventDetails, dataContainer.user_details, eventRewardDetails[0]);
                                //send push notificatio to organiser
                                await notifyOrganiserOnUserRewardAboutToExpireByPushNotification(dataContainer.organiser_details, dataContainer.user_details, eventRewardDetails[0], dataContainer.event_details);
                                //save push notification
                                let userName2 = utils.toTitleCase((dataContainer.user_details.first_name && dataContainer.user_details.last_name) ? dataContainer.user_details.first_name + ' ' + dataContainer.user_details.last_name : dataContainer.user_details.username)

                                let USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT;
                                USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT = USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT
                                    .replace('<userName>', userName2)
                                    .replace('<rewardTitle>', eventRewardDetails[0].title)
                                    .replace('<eventName>', dataContainer.event_details.event_name);

                                let organiserPushNotification = {
                                    _user_id: -1,
                                    _event_id: dataContainer.event_details.event_id,
                                    notify_type: stringMessages.DATA,
                                    payload_data: {
                                        messageFrom: stringMessages.PROMO_TEAM
                                    },
                                    notify_user_id: dataContainer.organiser_details.user_id,
                                    notify_text: USER_HAS_NOT_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT,
                                }
                                await savePushNotification(organiserPushNotification);
                            }
                        }))
                    }
                }

            }))
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
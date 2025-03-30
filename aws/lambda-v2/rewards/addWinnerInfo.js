const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("./../common/mysqlmanager");
const utils = require("../common/utils");
const MDBObject = new MDB();
const fs = require('fs');
const AWSManager = require('../common/awsmanager');
const _ = require('lodash');
const { errorMessages, successMessages, stringMessages, emailAndPushNotiTitles } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        reward_id: Joi.number().required(),
        reward_type: Joi.string().required(),
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

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await MDBObject.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
}

const notifyUserOnClaimReward = async (user, event, reward) => {
    if (user.email && user.email !== '' && user.is_email_verified && user.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_user_on_claims_reward.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.REWARD_CLAIMED;
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

const notifyUserOnClaimRewardByPushNotification = async (user, reward, event) => {
    var userDeviceTokenData = await getUserDeviceToken(user.user_id);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        let userName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username)
        var message = {
            title: emailAndPushNotiTitles.REWARD_CLAIMED,
            body: userName + emailAndPushNotiTitles.HAS_CLAIMED_REWARD  + reward.title + emailAndPushNotiTitles.ASSOCIATED_WITH_EVENT + event.event_name,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.USER_DEVICE_ID_NOT_FOUND })
    }
}

const notifyOrganiserOnUserClaimReward = async (organiser, event, user, reward) => {
    if (organiser.email && organiser.email !== '' && organiser.is_email_verified && organiser.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_organiser_on_user_claim_reward.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.REWARD_CLAIMED;
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

const notifyOrganiserOnUserClaimRewardByPushNotification = async (organiser, user, reward, event) => {
    var userDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        let userName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username)
        var message = {
            title: emailAndPushNotiTitles.REWARD_CLAIMED,
            body: userName + emailAndPushNotiTitles.HAS_CLAIMED_REWARD + reward.title + emailAndPushNotiTitles.ASSOCIATED_WITH_EVENT + event.event_name,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.USER_DEVICE_ID_NOT_FOUND })
    }
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

const fetchNecessaryData = (dataContainer, userId, rewardId) => {
    return new Promise(async (resolve, reject) => {
        const fetchReward = () => {
            return new Promise(async (resolve, reject) => {
                if (rewardId) {
                    var sqlQry = "SELECT _event_id, title FROM reward_master WHERE reward_id = " + rewardId + " ";
                    let rewardDetail = await MDBObject.runQuery(sqlQry);
                    if (rewardDetail && rewardDetail.length > 0) {
                        dataContainer['reward_details'] = rewardDetail[0];
                        return resolve(rewardDetail);
                    } else {
                        return resolve(errorMessages.REWARD_NOT_FOUND);
                    }
                }
                return resolve(errorMessages.REWARD_NOT_FOUND);
            })
        }

        const fetchEvent = () => {
            var eventId = dataContainer.reward_details._event_id;
            return new Promise(async (resolve, reject) => {
                if (eventId) {
                    var sqlQry = "SELECT _user_id, event_id, event_name FROM event_master WHERE event_id = " + eventId + " ";
                    let eventResult = await MDBObject.runQuery(sqlQry);
                    if (eventResult && eventResult.length > 0) {
                        dataContainer['event_details'] = eventResult[0];
                        return resolve(eventResult);
                    } else {
                        return resolve(errorMessages.EVENT_NOT_FOUND);
                    }
                }
                return resolve(errorMessages.EVENT_NOT_FOUND);
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

        fetchReward()
            .then(fetchEvent)
            .then(fetchUser)
            .then(fetchOrganiser)
            .then(() => {
                return resolve({ status: true })
            }).catch(error => {
                return reject({ success: false, message: error });
            })
    })
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        let user = await utils.verifyUser(event.headers.Authorization);
        apiData._winner_user_id = user.id;
        apiData._reward_id = apiData.reward_id;
        delete apiData.reward_id;
        let winnerInfo = await MDBObject.getData('winner_information', 'count(*) as totalCount', { _reward_id: apiData._reward_id, _winner_user_id: user.id });
        if (winnerInfo[0].totalCount) {
            response = { success: false, message: errorMessages.WINNDER_INFO_ALREADY_SAVE }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
        return MDBObject.dataInsert("winner_information", apiData).then(async (data) => {
            var dataContainer = {};
            await fetchNecessaryData(dataContainer, apiData._winner_user_id, apiData._reward_id)

            if (dataContainer.reward_details && dataContainer.event_details && dataContainer.user_details && dataContainer.organiser_details) {
                //send mail to user for claim reward
                await notifyUserOnClaimReward(dataContainer.user_details, dataContainer.event_details, dataContainer.reward_details)
                //send push notification to user
                await notifyUserOnClaimRewardByPushNotification(dataContainer.user_details, dataContainer.reward_details, dataContainer.event_details);
                //save push notification
                let userName = utils.toTitleCase((dataContainer.user_details.first_name && dataContainer.user_details.last_name) ? dataContainer.user_details.first_name + ' ' + dataContainer.user_details.last_name : dataContainer.user_details.username)
                
                let USER_HAS_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.USER_HAS_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT;
                USER_HAS_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT = USER_HAS_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT
                    .replace('<userName>', userName)
                    .replace('<rewardTitle>', dataContainer.reward_details.title)
                    .replace('<eventName>', dataContainer.event_details.event_name);

                let userPushNotification = {
                    _user_id: apiData._winner_user_id,
                    _event_id: dataContainer.event_details.event_id,
                    notify_type: stringMessages.DATA,
                    payload_data: {
                        messageFrom: stringMessages.PROMO_TEAM
                    },
                    notify_user_id: dataContainer.user_details.user_id,
                    notify_text: USER_HAS_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT,
                }
                await savePushNotification(userPushNotification);
                //sned mail to organiser
                await notifyOrganiserOnUserClaimReward(dataContainer.organiser_details, dataContainer.event_details, dataContainer.user_details, dataContainer.reward_details)
                //send push notifications to organiser
                await notifyOrganiserOnUserClaimRewardByPushNotification(dataContainer.organiser_details, dataContainer.user_details, dataContainer.reward_details, dataContainer.event_details);
                //save push notification
                let userName2 = utils.toTitleCase((dataContainer.user_details.first_name && dataContainer.user_details.last_name) ? dataContainer.user_details.first_name + ' ' + dataContainer.user_details.last_name : dataContainer.user_details.username)
                
                let USER_HAS_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.USER_HAS_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT;
                USER_HAS_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT = USER_HAS_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT
                    .replace('<userName>', userName2)
                    .replace('<rewardTitle>', dataContainer.reward_details.title)
                    .replace('<eventName>', dataContainer.event_details.event_name);

                let organiserPushNotification = {
                    _user_id: apiData._winner_user_id,
                    _event_id: dataContainer.event_details.event_id,
                    notify_type: stringMessages.DATA,
                    payload_data: {
                        messageFrom: stringMessages.PROMO_TEAM
                    },
                    notify_user_id: dataContainer.organiser_details.user_id,
                    notify_text: USER_HAS_CLAIMED_REWARD_ASSOCIATED_WITH_EVENT,
                }
                await savePushNotification(organiserPushNotification);
            }

            response = { success: true, message: successMessages.WINNER_INFO_SAVED }
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
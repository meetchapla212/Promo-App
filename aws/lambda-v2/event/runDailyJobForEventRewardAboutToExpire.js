const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const AWSManager = require('../common/awsmanager');
const MDBObject = new MDB();
const moment = require('moment');
const { errorMessages, stringMessages, emailAndPushNotiTitles } = require("../common/constants");

const fetchNecessaryData = (dataContainer, rewardId) => {
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
                    var sqlQry = "SELECT event_id, event_name FROM event_master WHERE event_id = " + eventId + " ";
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

        fetchReward()
            .then(fetchEvent)
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

const notifyInterestedUserOnRewardAboutToExpireByPushNotification = async (interestedUserId, reward, event, rewardExpiresInDays) => {
    var userDeviceTokenData = await getUserDeviceToken(interestedUserId);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        
        let REWARD_ASSOCIATED_WITH_EVENT_IS_ABOUT_TO_EXPIRE = emailAndPushNotiTitles.REWARD_ASSOCIATED_WITH_EVENT_IS_ABOUT_TO_EXPIRE;
        REWARD_ASSOCIATED_WITH_EVENT_IS_ABOUT_TO_EXPIRE = REWARD_ASSOCIATED_WITH_EVENT_IS_ABOUT_TO_EXPIRE
            .replace('<rewardTitle>', reward.title)
            .replace('<eventName>', event.event_name)
            .replace('<rewardExpiresInDays>', rewardExpiresInDays);

        var message = {
            title: emailAndPushNotiTitles.REWARD_ABOUT_TO_EXPIRED,
            body: REWARD_ASSOCIATED_WITH_EVENT_IS_ABOUT_TO_EXPIRE,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.USER_DEVICE_ID_NOT_FOUND })
    }
}

const notifyInterestedUserOnEventAboutToCloseByPushNotification = async (interestedUserId, event) => {
    var userDeviceTokenData = await getUserDeviceToken(interestedUserId);
    
    let INTERESTED_EVENT_ABOUT_TO_CLOSE = emailAndPushNotiTitles.INTERESTED_EVENT_ABOUT_TO_CLOSE;
    INTERESTED_EVENT_ABOUT_TO_CLOSE = INTERESTED_EVENT_ABOUT_TO_CLOSE
        .replace('<eventName>', event.event_name);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.EVENT_ABOUT_TO_CLOSE,
            body: INTERESTED_EVENT_ABOUT_TO_CLOSE,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: -1,
        _event_id: event.event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({
            messageFrom: stringMessages.PROMO_TEAM
        }),
        notify_user_id: interestedUserId,
        notify_text: INTERESTED_EVENT_ABOUT_TO_CLOSE,
    }

    return await MDBObject.dataInsert("user_notification", saveObj);
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

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        var dateAfterTwoDay = moment().add(2, 'day').format("YYYY-MM-DD");
        let getRewardsQuery = "SELECT reward_id, _event_id FROM reward_master WHERE DATE_FORMAT(end_date, '%Y-%m-%d') = '" + dateAfterTwoDay + "' AND status = 'active'";
        let rewarsList = await MDBObject.runQuery(getRewardsQuery);

        if (rewarsList.length > 0) {
            await Promise.all(rewarsList.map(async reward => {
                var rewardId = reward.reward_id;
                var rewardEventId = reward._event_id;
                let getEventInterestedUsersQuery = "SELECT user_id FROM `going_users_in_event` where event_id = " + rewardEventId + " AND (type_going = 'Going' OR type_going = 'May be')";
                await MDBObject.runQuery(getEventInterestedUsersQuery).then(async interestedUsers => {
                    await Promise.all(interestedUsers.map(async (interestedUser) => {
                        var interestedUserId = interestedUser.user_id;
                        let isUserSharedRewardOnSocialPlatform = await MDBObject.getData('social_shared_master', '*', { _reward_id: rewardId, _user_id: interestedUserId }, 'AND');
                        if (isUserSharedRewardOnSocialPlatform.length <= 0) {
                            //fetch necessary data
                            var dataContainer = {};
                            await fetchNecessaryData(dataContainer, rewardId);
                            if (dataContainer.reward_details && dataContainer.event_details) {
                                //send notification to user
                                await notifyInterestedUserOnRewardAboutToExpireByPushNotification(interestedUserId, dataContainer.reward_details, dataContainer.event_details, 2);
                                //save notification
                                let interestedUserPushNotification = {
                                    _user_id: -1,
                                    _event_id: dataContainer.event_details.event_id,
                                    notify_type: stringMessages.DATA,
                                    payload_data: {
                                        messageFrom: stringMessages.PROMO_TEAM
                                    },
                                    notify_user_id: interestedUserId,
                                    notify_text: emailAndPushNotiTitles.FOLLOWING_REWARD + dataContainer.reward_details.title + emailAndPushNotiTitles.ASSOCIATED_WITH_EVENT + dataContainer.event_details.event_name + emailAndPushNotiTitles.ABOUT_TO_EXPIRE + '2 days',
                                }
                                await savePushNotification(interestedUserPushNotification);
                            }
                        }
                    }))
                }).catch(error => {
                    return Promise.reject(error);
                });
            }))
        }

        let getEventQuery = "SELECT event_id, event_name FROM event_master WHERE DATE_FORMAT(end_date_time, '%Y-%m-%d') = '" + dateAfterTwoDay + "' AND _user_id > 0 AND status = 'active'";
        let eventList = await MDBObject.runQuery(getEventQuery);
        if (eventList.length > 0) {
            await Promise.all(eventList.map(async eventDetails => {
                var eventId = eventDetails.event_id;
                let getEventInterestedUsersQuery = "SELECT user_id FROM `going_users_in_event` where event_id = " + eventId + " AND (type_going = 'Going' OR type_going = 'May be')";
                await MDBObject.runQuery(getEventInterestedUsersQuery).then(async interestedUsers => {
                    await Promise.all(interestedUsers.map(async (interestedUser) => {
                        var interestedUserId = interestedUser.user_id;
                        await notifyInterestedUserOnEventAboutToCloseByPushNotification(interestedUserId, eventDetails);
                    }))
                })
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
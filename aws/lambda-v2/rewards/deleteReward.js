const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const utils = require("../common/utils");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const AWSManager = require("../common/awsmanager");
const FILE_PATH = __filename;
const { errorMessages, stringMessages, successMessages, emailAndPushNotiTitles } = require("../common/constants");

const fetchNecessaryData = (dataContainer, rewardId) => {
    return new Promise(async (resolve, reject) => {
        const fetchReward = () => {
            return new Promise(async (resolve, reject) => {
                if (rewardId) {
                    var sqlQry = "SELECT _event_id, title FROM reward_master WHERE reward_id = " + rewardId + " ";
                    let rewardDetail = await MDBObject.runQuery(sqlQry);
                    if (rewardDetail && rewardDetail.length > 0) {
                        dataContainer["reward_details"] = rewardDetail[0];
                        return resolve(rewardDetail);
                    } else {
                        return resolve(errorMessages.REWARD_NOT_FOUND);
                    }
                }
                return resolve(errorMessages.REWARD_NOT_FOUND);
            });
        };

        const fetchEvent = () => {
            var eventId = dataContainer.reward_details._event_id;
            return new Promise(async (resolve, reject) => {
                if (eventId) {
                    var sqlQry = "SELECT _user_id, event_name, event_id FROM event_master WHERE event_id = " + eventId + " ";
                    let eventResult = await MDBObject.runQuery(sqlQry);
                    if (eventResult && eventResult.length > 0) {
                        dataContainer["event_details"] = eventResult[0];
                        return resolve(eventResult);
                    } else {
                        return resolve(errorMessages.EVENT_NOT_FOUND);
                    }
                }
                return resolve(errorMessages.EVENT_NOT_FOUND);
            });
        };

        const fetchOrganiser = () => {
            var organiserId = dataContainer.event_details._user_id;
            return new Promise(async (resolve, reject) => {
                if (organiserId) {
                    let sqlQry = "SELECT user_id FROM user_master WHERE user_id = " + organiserId + " ";
                    let organiserDetails = await MDBObject.runQuery(sqlQry);
                    if (organiserDetails.length > 0) {
                        dataContainer["organiser_details"] = organiserDetails[0];
                        return resolve(organiserDetails);
                    } else {
                        return resolve(errorMessages.ORGANISER_NOT_FOUND);
                    }
                }
                return resolve(errorMessages.ORGANISER_NOT_FOUND);
            });
        };

        fetchReward()
            .then(fetchEvent)
            .then(fetchOrganiser)
            .then(() => {
                return resolve({ status: true });
            })
            .catch((error) => {
                return reject({ success: false, message: error });
            });
    });
};

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await MDBObject.getData("app_token_master", "token", {
        _user_id: userId,
    });
    return userDeviceTokenData;
};

//notify interesed user for this event (reward is disabled for an event that users are interested in)
const notifyInterestedUserOnRewardDisabledByPushNotification = async (
    event,
    reward,
    userId
) => {
    var userDeviceTokenData = await getUserDeviceToken(userId);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.REWARD_DISABLED,
            body: emailAndPushNotiTitles.FOLLOWING_REWARD + reward.title + emailAndPushNotiTitles.REWARD_IS_DISABLED_WITH_EVENT + event.event_name,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM,
            },
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({
            status: false,
            message: errorMessages.USER_DEVICE_ID_NOT_FOUND
        });
    }
};

//notify organiser on removes a reward from an already associated event
const notifyOrganiserOnRewardRemoveByPushNotification = async (
    event,
    reward,
    organiserId
) => {
    var organiserDeviceTokenData = await getUserDeviceToken(organiserId);
    if (organiserDeviceTokenData.length > 0) {
        var { token } = organiserDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.REWARD_REMOVED,
            body: stringMessages.REWARD + reward.title + emailAndPushNotiTitles.REWARD_REMOVED_FROM_EVENT + event.event_name,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM,
            },
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({
            status: false,
            message: errorMessages.ORGANISER_DEVICE_ID_NOT_FOUND
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

    return await MDBObject.dataInsert("user_notification", dataObj).then(async (notificationSaveResponse) => {
        return Promise.resolve(notificationSaveResponse);
    }).catch((error) => {
        return Promise.reject(error);
    });
};

module.exports.handler = async function (event, context, callback) {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };

    try {
        let rewardId = event.pathParameters.reward_id;
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        let userId = user.id;

        var dataObj = { is_deleted: 1 };
        var whereQry = { reward_id: rewardId, _user_id: userId };

        return MDBObject.dataUpdate("reward_master", dataObj, whereQry).then(async (data) => {
            var dataContainer = {};
            await fetchNecessaryData(dataContainer, rewardId);

            var eventId = dataContainer.event_details.event_id;
            let getEventInterestedUsersQuery = `SELECT user_id FROM going_users_in_event
                where event_id = ${eventId} AND (type_going = 'Going' OR type_going = 'May be')`;
            
            await MDBObject.runQuery(getEventInterestedUsersQuery).then(async (interestedUsers) => {
                await Promise.all(
                    interestedUsers.map(async (interestedUser) => {
                        var interestedUserId = interestedUser.user_id;
                        await notifyInterestedUserOnRewardDisabledByPushNotification(
                            dataContainer.event_details,
                            dataContainer.reward_details,
                            interestedUserId
                        );
                        let interestedUserPushNotification = {
                            _user_id: userId,
                            _event_id: dataContainer.event_details.event_id,
                            notify_type: stringMessages.DATA,
                            payload_data: {
                                messageFrom: stringMessages.PROMO_TEAM,
                            },
                            notify_user_id: interestedUserId,
                            notify_text: emailAndPushNotiTitles.FOLLOWING_REWARD + dataContainer.reward_details.title + emailAndPushNotiTitles.REWARD_IS_DISABLED_WITH_EVENT + dataContainer.event_details.event_name,
                        };
                        await savePushNotification(interestedUserPushNotification);
                    })
                );
            }).catch((error) => {
                return Promise.reject(error);
            });

            //notify organiser on removes a reward from an already associated event
            await notifyOrganiserOnRewardRemoveByPushNotification(
                dataContainer.event_details,
                dataContainer.reward_details,
                dataContainer.organiser_details.user_id
            );
            let interestedUserPushNotification = {
                _user_id: userId,
                _event_id: dataContainer.event_details.event_id,
                notify_type: stringMessages.DATA,
                payload_data: {
                    messageFrom: stringMessages.PROMO_TEAM,
                },
                notify_user_id: dataContainer.organiser_details.user_id,
                notify_text: `Reward ${dataContainer.reward_details.title} is removed from the event ${dataContainer.event_details.event_name}`,
            };
            await savePushNotification(interestedUserPushNotification);

            response = { success: true, message: successMessages.REWARD_DELETED };
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
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require("joi");
const MDB = require("./../common/mysqlmanager");
const utils = require("../common/utils");
const AWSManager = require("../common/awsmanager");
const MDBObject = new MDB();
const moment = require("moment");
const momentTz = require("moment-timezone");
const dateFormatDB = "YYYY-MM-DD HH:mm:ss";
const FILE_PATH = __filename;
const { errorMessages, stringMessages, successMessages, emailAndPushNotiTitles } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        title: Joi.string().required(),
        no_of_people: Joi.number().required(),
        no_of_click: Joi.number().required(),
        description: Joi.string(),
        terms_condition: Joi.string(),
        reward_type: Joi.string().valid("by_email", "at_venue", "deliver").required(),
        winner_type: Joi.string().valid("random", "first_few").required(),
        start_date: Joi.string().required(),
        end_date: Joi.string().required(),
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
                    var sqlQry = "SELECT _user_id, event_id, event_name FROM event_master WHERE event_id = " + eventId + " ";
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
            .then(fetchOrganiser).then(() => {
                return resolve({ status: true });
            }).catch((error) => {
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

const notifyUserOnUpdateRewardByPushNotification = async (event, reward, userId) => {
    var userDeviceTokenData = await getUserDeviceToken(userId);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        let REWARD_CRITERIA_CHANGED_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.REWARD_CRITERIA_CHANGED_ASSOCIATED_WITH_EVENT;
        REWARD_CRITERIA_CHANGED_ASSOCIATED_WITH_EVENT = REWARD_CRITERIA_CHANGED_ASSOCIATED_WITH_EVENT
            .replace('<rewardTitle>', reward.title)
            .replace('<eventName>', event.event_name);

        var message = {
            title: emailAndPushNotiTitles.REWARD_CRITERIA_CHANGED,
            body: REWARD_CRITERIA_CHANGED_ASSOCIATED_WITH_EVENT,
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

const notifyOrganiserOnUpdateRewardByPushNotification = async (organiser, reward, refrenceUserName) => {
    var userDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        let rewardUpdateTime = moment().format("YYYY-MM-DD HH:mm:ss");
        var message = {
            title: emailAndPushNotiTitles.REWARD_CRITERIA_CHANGED,
            body: emailAndPushNotiTitles.FOLLOWING_REWARD + reward.title + emailAndPushNotiTitles.HAS_BEEN_MODIFIED_AT + rewardUpdateTime + ' by ' + refrenceUserName,
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
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        let rewardId = event.pathParameters.reward_id;
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        var loggedUserDetails = {};
        await MDBObject.getData("user_master", "first_name, last_name, username", { user_id: user.id }).then((result) => {
            loggedUserDetails = result[0];
            return loggedUserDetails;
        });

        let userId = user.id;
        var whereQry = { reward_id: rewardId, _user_id: userId };

        apiData._event_id = apiData.event_id;
        delete apiData.event_id;

        if (apiData.start_date != "") {
            apiData.start_date = moment(apiData.start_date).format("YYYY-MM-DD HH:mm:ss");
        }

        if (apiData.end_date != "") {
            apiData.end_date = moment(apiData.end_date).format("YYYY-MM-DD HH:mm:ss");
            if (apiData.time_zone && apiData.time_zone != "") {
                // console.log(" moment.tz(" + apiData.end_date + ", " + dateFormatDB + ", " + apiData.timezone + ").utc().format(" + dateFormatDB + ")");
                apiData.end_date_utc = momentTz.tz(apiData.end_date, dateFormatDB, apiData.time_zone).utc().format(dateFormatDB);
            }
        }

        // log old data if admin login
        // const { proxy_login } = user;
        // if (proxy_login) {
        //     let oldData = await MDBObject.getData("reward_master", "*", whereQry);
        //     console.log(oldData);
        // }

        return MDBObject.dataUpdate("reward_master", apiData, whereQry).then(async (data) => {
            var dataContainer = {};
            await fetchNecessaryData(dataContainer, rewardId);

            if (dataContainer.event_details && dataContainer.reward_details) {
                let rewardSocialShareList = await MDBObject.getData("social_shared_master", "_user_id", { _reward_id: rewardId });
                await Promise.all(
                    rewardSocialShareList.map(async (reward_shared) => {
                        var SharedUserId = reward_shared._user_id;
                        await notifyUserOnUpdateRewardByPushNotification(dataContainer.event_details, dataContainer.reward_details, SharedUserId);
                        
                        let REWARD_CRITERIA_CHANGED_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.REWARD_CRITERIA_CHANGED_ASSOCIATED_WITH_EVENT;
                        REWARD_CRITERIA_CHANGED_ASSOCIATED_WITH_EVENT = REWARD_CRITERIA_CHANGED_ASSOCIATED_WITH_EVENT
                            .replace('<rewardTitle>', dataContainer.reward_details.title)
                            .replace('<eventName>', dataContainer.event_details.event_name);
            
                        let saveObj = {
                            _user_id: userId,
                            _event_id: dataContainer.event_details.event_id,
                            notify_type: stringMessages.DATA,
                            payload_data: {
                                messageFrom: stringMessages.PROMO_TEAM,
                            },
                            notify_user_id: SharedUserId,
                            notify_text: REWARD_CRITERIA_CHANGED_ASSOCIATED_WITH_EVENT,
                        };
                        await savePushNotification(saveObj);
                    })
                );
            }

            //notify organiser when the reward details are changed and saved
            if (dataContainer.organiser_details && dataContainer.reward_details && dataContainer.event_details) {
                let userName = utils.toTitleCase(loggedUserDetails.first_name && loggedUserDetails.last_name ? loggedUserDetails.first_name + " " + loggedUserDetails.last_name : loggedUserDetails.username);

                await notifyOrganiserOnUpdateRewardByPushNotification(dataContainer.organiser_details, dataContainer.reward_details, userName);

                let rewardUpdateTime = moment().format("YYYY-MM-DD HH:mm:ss");
                let saveObj = {
                    _user_id: userId,
                    _event_id: dataContainer.event_details.event_id,
                    notify_type: stringMessages.DATA,
                    payload_data: {
                        messageFrom: stringMessages.PROMO_TEAM,
                    },
                    notify_user_id: dataContainer.organiser_details.user_id,
                    notify_text: emailAndPushNotiTitles.FOLLOWING_REWARD + dataContainer.reward_details.title + emailAndPushNotiTitles.HAS_BEEN_MODIFIED_AT + rewardUpdateTime + ' by ' + userName,
                };
                await savePushNotification(saveObj);
            }

            response = { success: true, message: successMessages.REWARD_UPDATED };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch((error) => {
            response.message = error.message;
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
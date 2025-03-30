const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("./../common/mysqlmanager");
const utils = require("../common/utils");
const fs = require('fs');
const AWSManager = require('../common/awsmanager');
const _ = require('lodash');
const MDBObject = new MDB();
const moment = require('moment');
const momentTz = require('moment-timezone');
const dateFormatDB = "YYYY-MM-DD HH:mm:ss";
const {
    errorMessages,
    successMessages,
    stringMessages,
    emailAndPushNotiTitles
} = require("../common/constants");

const fetchNecessaryData = (dataContainer, eventId) => {
    return new Promise(async (resolve, reject) => {
        const fetchEvent = () => {
            return new Promise(async (resolve, reject) => {
                var sqlQry = "SELECT event_id, event_name, _user_id FROM event_master WHERE event_id = " + eventId + " ";
                let eventResult = await MDBObject.runQuery(sqlQry);
                console.log("eventResult : ", eventResult);
                if (eventResult && eventResult.length > 0) {
                    dataContainer['event_details'] = eventResult[0];
                    return resolve(eventResult);
                } else {
                    return resolve(errorMessages.EVENT_NOT_FOUND);
                }
            })
        }

        const fetchOrganiser = () => {
            var organiserId = dataContainer.event_details._user_id;
            console.log("organiserId : ", organiserId);
            return new Promise(async (resolve, reject) => {
                let sqlQry = `SELECT user_id, first_name, last_name, username, email, is_email_verified FROM user_master WHERE user_id = ${organiserId}`;
                let organiserDetails = await MDBObject.runQuery(sqlQry);
                if (organiserDetails.length > 0) {
                    dataContainer['organiser_details'] = organiserDetails[0];
                    return resolve(organiserDetails);
                } else {
                    return resolve(errorMessages.ORGANISER_NOT_FOUND);
                }
            })
        }

        fetchEvent().then(fetchOrganiser).then(() => {
            return resolve({ status: true })
        }).catch(error => {
            return reject({ success: false, message: error });
        })
    })
}

const notifyOrganiser = async (organiser, event, rewardName) => {
    if (organiser.email && organiser.email !== '' && organiser.is_email_verified && organiser.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_organiser_on_reward_associated_with_event.html', 'utf8');
        let mailSubject = `Reward accosiated with event: ${event.event_name}`;
        let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        console.log(AWSManager.MAIL_PARAMS);
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            event_name: event.event_name,
            organiser_name: utils.toTitleCase((organiser.first_name && organiser.last_name) ? organiser.first_name + ' ' + organiser.last_name : organiser.username),
            reward_name: rewardName
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([organiser.email], mailBody, mailSubject);
    }
}

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await MDBObject.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
}

const notifyOrganiserByPushNotification = async (organiser, event, rewardName) => {
    var organiserDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    if (organiserDeviceTokenData.length > 0) {
        var { token } = organiserDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.IS_ASSOCIATED_WITH_EVENT,
            body: stringMessages.REWARD + rewardName + emailAndPushNotiTitles.IS_ASSOCIATED_WITH_EVENT + event.event_name,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.ORGANISER_DEVICE_ID_NOT_FOUND })
    }
}

//notify interesed user for this event (reward is newly associated for an event that you are interested in)
const notifyInterestedUserOnAddRewardByPushNotification = async (event, rewardName, userId) => {
    var userDeviceTokenData = await getUserDeviceToken(userId);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.IS_ASSOCIATED_WITH_EVENT,
            body: emailAndPushNotiTitles.FOLLOWING_REWARD + rewardName + emailAndPushNotiTitles.IS_ASSOCIATED_WITH_EVENT + event.event_name,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.USER_DEVICE_ID_NOT_FOUND })
    }
}

//notify not interesed user for this event (reward is newly associated for an event that you are not interested in)
const notifyNotInterestedUserOnAddRewardByPushNotification = async (event, rewardName, userId) => {
    var userDeviceTokenData = await getUserDeviceToken(userId);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.IS_ASSOCIATED_WITH_EVENT,
            body: emailAndPushNotiTitles.FOLLOWING_REWARD + rewardName + emailAndPushNotiTitles.IS_ASSOCIATED_WITH_EVENT + event.event_name,
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

const validate = function (body) {
    const schema = Joi.object().keys({
        title: Joi.string().required(),
        event_id: Joi.number().required(),
        description: Joi.string(),
        reward_type: Joi.string().valid("by_email", "at_venue", "deliver").required(),
        start_date: Joi.string().required(),
        end_date: Joi.string().required()
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

module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let apiData = JSON.parse(event.body);
        console.log("----apiData ---+++", apiData)

        if (!apiData.reward_type || apiData.reward_type == '') {
            apiData.reward_type = 'at_venue'
        }
        await validate(apiData);
        let user = await utils.verifyUser(event.headers.Authorization);
        apiData._user_id = user.id;
        apiData._event_id = apiData.event_id;
        delete apiData.event_id;
        if (apiData.start_date != '') {
            apiData.start_date = moment(apiData.start_date).format('YYYY-MM-DD HH:mm:ss')
        }
        if (apiData.end_date != '') {
            apiData.end_date = moment(apiData.end_date).format('YYYY-MM-DD HH:mm:ss')
            if (apiData.time_zone && apiData.time_zone != '') {
                console.log(' moment.tz(' + apiData.end_date + ', ' + dateFormatDB + ', ' + apiData.timezone + ').utc().format(' + dateFormatDB + ')');
                apiData.end_date_utc = momentTz.tz(apiData.end_date, dateFormatDB, apiData.time_zone).utc().format(dateFormatDB);
            }
        }

        return await MDBObject.getData('reward_master', 'count(*) as totalCount', { _event_id: apiData._event_id }).then(async (rewardDetails) => {
            if (rewardDetails[0].totalCount) {
                response = { success: false, message: errorMessages.REWARD_ALREADY_CREATED_FOR_THIS_EVENT }
                return awsRequestHelper.respondWithJsonBody(200, response);
            }

            if (!apiData.is_draft) {
                var dataContainer = {};
                //find necessaary data
                await fetchNecessaryData(dataContainer, apiData._event_id);

                if (dataContainer.event_details && dataContainer.organiser_details) {
                    await notifyOrganiser(dataContainer.organiser_details, dataContainer.event_details, apiData.title)
                    await notifyOrganiserByPushNotification(dataContainer.organiser_details, dataContainer.event_details, apiData.title)
                    let saveObj = {
                        _user_id: apiData._user_id,
                        _event_id: dataContainer.event_details.event_id,
                        notify_type: stringMessages.DATA,
                        payload_data: {
                            messageFrom: stringMessages.PROMO_TEAM
                        },
                        notify_user_id: dataContainer.organiser_details.user_id,
                        notify_text: `Reward ${apiData.title} is associated with the event ${dataContainer.event_details.event_name}`,
                    }
                    await savePushNotification(saveObj);
                }

                //When a reward is newly associated for an event that users interested in
                if (dataContainer.event_details) {
                    let getEventInterestedUsersQuery = "SELECT user_id FROM `going_users_in_event` where event_id = " + apiData._event_id + " AND (type_going = 'Going' OR type_going = 'May be')";
                    await MDBObject.runQuery(getEventInterestedUsersQuery).then(async interestedUsers => {
                        await Promise.all(interestedUsers.map(async (interestedUser) => {
                            var interestedUserId = interestedUser.user_id;
                            await notifyInterestedUserOnAddRewardByPushNotification(dataContainer.event_details, apiData.title, interestedUserId)
                            let interestedUserPushNotification = {
                                _user_id: apiData._user_id,
                                _event_id: dataContainer.event_details.event_id,
                                notify_type: stringMessages.DATA,
                                payload_data: {
                                    messageFrom: stringMessages.PROMO_TEAM
                                },
                                notify_user_id: interestedUserId,
                                notify_text: emailAndPushNotiTitles.FOLLOWING_REWARD + apiData.title + emailAndPushNotiTitles.IS_ASSOCIATED_WITH_EVENT + dataContainer.event_details.event_name,
                            }
                            await savePushNotification(interestedUserPushNotification);
                        }))
                    }).catch(error => {
                        return Promise.reject(error);
                    });
                }

                //When a reward is newly associated for an event that you users not interested in
                if (dataContainer.event_details) {
                    let getEventNotInterestedUsersQuery = "SELECT user_id FROM `going_users_in_event` where event_id = " + apiData._event_id + " AND (type_going = 'Not Going')";
                    await MDBObject.runQuery(getEventNotInterestedUsersQuery).then(async notInterestedUsers => {
                        await Promise.all(notInterestedUsers.map(async (notInterestedUser) => {
                            var notInterestedUserId = notInterestedUser.user_id;
                            await notifyNotInterestedUserOnAddRewardByPushNotification(dataContainer.event_details, apiData.title, notInterestedUserId);
                            let notInterestedUserPushNotification = {
                                _user_id: apiData._user_id,
                                _event_id: dataContainer.event_details.event_id,
                                notify_type: stringMessages.DATA,
                                payload_data: {
                                    messageFrom: stringMessages.PROMO_TEAM
                                },
                                notify_user_id: notInterestedUserId,
                                notify_text: emailAndPushNotiTitles.FOLLOWING_REWARD + apiData.title + emailAndPushNotiTitles.IS_ASSOCIATED_WITH_EVENT + dataContainer.event_details.event_name,
                            }
                            await savePushNotification(notInterestedUserPushNotification);
                        }))
                    }).catch(error => {
                        return Promise.reject(error);
                    });
                }
            }

            return MDBObject.dataInsert("reward_master", apiData).then((data) => {
                response = { success: true, message: successMessages.REWARD_CREATED, reward_id: data.insertId }
                return awsRequestHelper.respondWithJsonBody(200, response);
            }).catch((error) => {
                console.error("error : ", error);
                return awsRequestHelper.respondWithJsonBody(500, response);
            });
        })
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
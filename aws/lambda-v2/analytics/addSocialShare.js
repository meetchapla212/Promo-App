const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require("joi");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const fs = require('fs');
const AWSManager = require('../common/awsmanager');
const _ = require('lodash');
const utils = require('../common/utils');
const geoip = require("geoip-lite");
const {
    errorMessages,
    successMessages,
    emailAndPushNotiTitles,
    stringMessages
} = require("../common/constants");

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await MDBObject.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
}

const notifyUser = async (event, attendee) => {
    if (attendee.email && attendee.email !== '' && attendee.is_email_verified && attendee.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/attendee_event_share_on_social_media_platform.html', 'utf8');
        let EVENT_SHARED_NAME = emailAndPushNotiTitles.EVENT_SHARED_NAME;
        EVENT_SHARED_NAME = EVENT_SHARED_NAME.replace('<eventName>', event.event_name);
        let mailSubject = EVENT_SHARED_NAME;
        let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        // let event_url = `${ process.env.UI_BASE_URL }/eventdetails/${ event.event_id }`;
        console.log(AWSManager.MAIL_PARAMS);
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            event_name: event.event_name,
            attendee_name: utils.toTitleCase((attendee.first_name && attendee.last_name) ? attendee.first_name + ' ' + attendee.last_name : attendee.username),
        }, AWSManager.MAIL_PARAMS);
        console.log('templateVars========', templateVars);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([attendee.email], mailBody, mailSubject);
    }
}

const notifyOrganiser = async (organiser, attendee, event) => {
    if (organiser.email && organiser.email !== '' && organiser.is_email_verified && organiser.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_organiser_on_event_shared_on_social_media_platform.html', 'utf8');
        let EVENT_SHARED_NAME = emailAndPushNotiTitles.EVENT_SHARED_NAME;
        EVENT_SHARED_NAME = EVENT_SHARED_NAME.replace('<eventName>', event.event_name);

        let mailSubject = EVENT_SHARED_NAME;
        let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        // let event_url = `${ process.env.UI_BASE_URL }/eventdetails/${ event.event_id }`;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            organiser_name: utils.toTitleCase((organiser.first_name && organiser.last_name) ? organiser.first_name + ' ' + organiser.last_name : organiser.username),
            attendee_name: utils.toTitleCase((attendee.first_name && attendee.last_name) ? attendee.first_name + ' ' + attendee.last_name : attendee.username),
            event_title: event.event_name,
        }, AWSManager.MAIL_PARAMS);
        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([organiser.email], mailBody, mailSubject);
    }
}

const notifyOrganiserByPushNotification = async (organiser, attendee, event, socialType) => {
    var organiserDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    if (organiserDeviceTokenData.length > 0) {
        var { token } = organiserDeviceTokenData[0];
        var attendeeName = utils.toTitleCase((attendee.first_name && attendee.last_name) ? attendee.first_name + ' ' + attendee.last_name : attendee.username);

        let ATTENDEE_SHARED_EVENT = emailAndPushNotiTitles.ATTENDEE_SHARED_EVENT;
        ATTENDEE_SHARED_EVENT = ATTENDEE_SHARED_EVENT
            .replace('<attendeeName>', attendeeName)
            .replace('<eventname>', event.event_name)
            .replace('<socialType>', socialType);
        
        var message = {
            title: emailAndPushNotiTitles.EVENT_SHARED,
            body: ATTENDEE_SHARED_EVENT,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.ORGANISER_DEVICE_ID_NOT_FOUND })
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

const fetchNecessaryData = (dataContainer, attendeeId, eventId) => {
    return new Promise(async (resolve, reject) => {
        const fetchEvent = () => {
            return new Promise(async (resolve, reject) => {
                var sqlQry = "SELECT _user_id, event_id, event_name FROM event_master WHERE event_id = " + eventId + " ";
                let eventResult = await MDBObject.runQuery(sqlQry);
                if (eventResult && eventResult.length > 0) {
                    dataContainer['event_details'] = eventResult[0];
                    return resolve(eventResult);
                } else {
                    return resolve(errorMessages.EVENT_NOT_FOUND);
                }
            })
        }

        const fetchAttendee = () => {
            return new Promise(async (resolve, reject) => {
                let sqlQry = "SELECT user_id, first_name, last_name, username, email, is_email_verified FROM user_master WHERE user_id = " + attendeeId + " ";
                let userDetails = await MDBObject.runQuery(sqlQry);
                if (userDetails.length > 0) {
                    dataContainer['attendee_details'] = userDetails[0];
                    return resolve(userDetails);
                } else {
                    return resolve(errorMessages.ATTENDEE_NOT_FOUND);
                }
            })
        }

        const fetchOrganiser = () => {
            var organiserId = dataContainer.event_details._user_id;
            return new Promise(async (resolve, reject) => {
                let sqlQry = "SELECT user_id, first_name, last_name, username, email, is_email_verified FROM user_master WHERE user_id = " + organiserId + " ";
                let organiserDetails = await MDBObject.runQuery(sqlQry);
                if (organiserDetails.length > 0) {
                    dataContainer['organiser_details'] = organiserDetails[0];
                    return resolve(organiserDetails);
                } else {
                    return resolve(errorMessages.ORGANISER_NOT_FOUND);
                }
            })
        }

        fetchEvent()
            .then(fetchAttendee)
            .then(fetchOrganiser)
            .then(() => {
                return resolve({ status: true })
            })
            .catch(error => {
                return reject({ success: false, message: error });
            })
    })
}

const validate = function (body) {
    const schema = Joi.object().keys({
        reward_id: Joi.number().required(),
        social_type: Joi.string().required(),
        device_type: Joi.string().required()
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
};

module.exports.handler = async function (event, context, callback) {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN
    };

    try {
        var dataContainer = {};
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        let user = await utils.verifyUser(event.headers.Authorization);

        var geoResponse = await geoip.lookup(apiData.ip_address);
        apiData.country = geoResponse.country;
        apiData.city = geoResponse.city;
        apiData._user_id = user.id;
        apiData._reward_id = apiData.reward_id;
        delete apiData.reward_id;

        let socialSharedData = await MDBObject.getData("social_shared_master", "count(*) as totalCount", {
            _user_id: apiData._user_id, _reward_id: apiData._reward_id, social_type: apiData.social_type
        });
        if (socialSharedData[0].totalCount) {
            response = { success: false, message: errorMessages.SOCIAL_SHARE_INFO_ALREADY_SAVED };
            return awsRequestHelper.respondWithJsonBody(200, response);
        } else {
            let dataEvent = await MDBObject.getData("reward_master", '_event_id,_user_id', { reward_id: apiData._reward_id });
            if (dataEvent[0]._user_id == user.id) {
                response = { success: true, message: successMessages.SOCIAL_SHARE_INFO_SAVED };
                return awsRequestHelper.respondWithJsonBody(200, response);
            }

            return MDBObject.dataInsert("social_shared_master", apiData).then(async (data) => {
                var whereQry = { _user_id: user.id, _event_id: dataEvent[0]._event_id };
                await MDBObject.getData("shared_event", "*", whereQry).then(async data => {
                    if (data.length <= 0) {
                        insertData = { _event_id: dataEvent[0]._event_id, _user_id: user.id, is_rewardShared: 1 };
                        await MDBObject.dataInsert("shared_event", insertData);
                    }
                })
                let appliedReward = await MDBObject.getData("reward_applied_master", "count(*) as totalCount", {
                    _user_id: apiData._user_id, _reward_id: apiData._reward_id
                });
                if (!appliedReward[0].totalCount) {
                    await MDBObject.dataInsert("reward_applied_master", { _reward_id: apiData._reward_id, _user_id: apiData._user_id });
                }

                //fetch attendee, organiser and event details
                await fetchNecessaryData(dataContainer, user.id, dataEvent[0]._event_id)

                //notify to user with mail
                //notify to organiser with mail and push notification
                if (dataContainer.organiser_details && dataContainer.attendee_details && dataContainer.event_details) {
                    await notifyOrganiser(dataContainer.organiser_details, dataContainer.attendee_details, dataContainer.event_details)
                    await notifyOrganiserByPushNotification(dataContainer.organiser_details, dataContainer.attendee_details, dataContainer.event_details, apiData.social_type)

                    var attendeeName = utils.toTitleCase((dataContainer.attendee_details.first_name && dataContainer.attendee_details.last_name) ? dataContainer.attendee_details.first_name + ' ' + dataContainer.attendee_details.last_name : dataContainer.attendee_details.username)
                    let saveObj = {
                        _user_id: dataContainer.attendee_details.user_id,
                        _event_id: dataContainer.event_details.event_id,
                        notify_type: stringMessages.DATA,
                        payload_data: {
                            messageFrom: stringMessages.PROMO_TEAM
                        },
                        notify_user_id: dataContainer.organiser_details.user_id,
                        notify_text: `${attendeeName} has shared the event ${dataContainer.event_details.event_name} in ${apiData.social_type}`,
                    }
                    await savePushNotification(saveObj);
                }

                if (dataContainer.attendee_details && dataContainer.event_details) {
                    await notifyUser(dataContainer.event_details, dataContainer.attendee_details);
                }
                response = {
                    success: true,
                    message: successMessages.SOCIAL_SHARE_INFO_SAVED
                };
                return awsRequestHelper.respondWithJsonBody(200, response);
            }).catch(error => {
                return awsRequestHelper.respondWithJsonBody(500, error);
            });
        }
    } catch (error) {
        console.error("error : ", error);
        return awsRequestHelper.respondWithJsonBody(500, error);
    }
};
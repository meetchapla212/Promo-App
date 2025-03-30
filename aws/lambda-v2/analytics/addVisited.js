const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require("joi");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const fs = require('fs');
const AWSManager = require('../common/awsmanager');
const _ = require('lodash');
const geoip = require("geoip-lite");
const utils = require('../common/utils');
const {
    errorMessages,
    emailAndPushNotiTitles,
    successMessages,
    stringMessages
} = require("../common/constants");

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await MDBObject.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
}

//notify user on shared event visited by some one
const notifyUser = async (event, refrenceUser) => {
    if (refrenceUser.email && refrenceUser.email !== '' && refrenceUser.is_email_verified && refrenceUser.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_user_on_shared_event_visited_by_someone.html', 'utf8');
        
        let EVENT_VISITED_NAME = emailAndPushNotiTitles.EVENT_VISITED_NAME;
        EVENT_VISITED_NAME = EVENT_VISITED_NAME.replace('<eventName>', event.event_name);

        let mailSubject = EVENT_VISITED_NAME;
        let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        console.log(AWSManager.MAIL_PARAMS);
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            encodedEventUrl: encodeURIComponent(event_url),
            event_name: event.event_name,
            shared_user_name: utils.toTitleCase((refrenceUser.first_name && refrenceUser.last_name) ? refrenceUser.first_name + ' ' + refrenceUser.last_name : refrenceUser.username),
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([refrenceUser.email], mailBody, mailSubject);
    }
}

//notify user on shared event visited by some one by push notification
const notifyUserByPushNotification = async (dataObj) => {
    var userDeviceTokenData = await getUserDeviceToken(dataObj.refrence_user_id);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];

        let CLICK_RECEIVED_FOR_EVENT_SHARED_IN = emailAndPushNotiTitles.CLICK_RECEIVED_FOR_EVENT_SHARED_IN;
        CLICK_RECEIVED_FOR_EVENT_SHARED_IN = CLICK_RECEIVED_FOR_EVENT_SHARED_IN
            .replace('<eventname>', dataObj.event_name)
            .replace('<socialmediaplatform>', dataObj.social_media_platform)
            .replace('<countryName>', dataObj.country_name)
            .replace('<deviceType>', dataObj.device_type)
            .replace('<browserName>', dataObj.browser_name);

        var message = {
            title: emailAndPushNotiTitles.EVENT_VISITED,
            body: CLICK_RECEIVED_FOR_EVENT_SHARED_IN,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.USER_DEVICE_ID_NOT_FOUND })
    }
}

//notify organiser on shared event visited by some one by push notification
const notifyOrganiserByPushNotification = async (dataObj) => {
    var organiserDeviceTokenData = await getUserDeviceToken(dataObj.organiser_id);
    if (organiserDeviceTokenData.length > 0) {
        var { token } = organiserDeviceTokenData[0];
        
        let CLICK_RECEIVED_FOR_EVENT_SHARED_BY = emailAndPushNotiTitles.CLICK_RECEIVED_FOR_EVENT_SHARED_BY;
        CLICK_RECEIVED_FOR_EVENT_SHARED_BY = CLICK_RECEIVED_FOR_EVENT_SHARED_BY
            .replace('<eventname>', dataObj.event_name)
            .replace('<refrenceUserName>', dataObj.refrence_user_name)
            .replace('<socialmediaplatform>', dataObj.social_media_platform)
            .replace('<countryName>', dataObj.country_name)
            .replace('<deviceType>', dataObj.device_type)
            .replace('<browserName>', dataObj.browser_name);

        var message = {
            title: emailAndPushNotiTitles.EVENT_VISITED,
            body: CLICK_RECEIVED_FOR_EVENT_SHARED_BY,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.ORGANISER_DEVICE_ID_NOT_FOUND })
    }
}

//save push notification
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

//notify user on eligible for reward
const notifyUserOnEligibleForReward = async (event, refrenceUser, reward) => {
    if (refrenceUser.email && refrenceUser.email !== '' && refrenceUser.is_email_verified && refrenceUser.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_user_on_become_eligible_for_reward.html', 'utf8');
        let BECOME_ELIGIBLE_FOR_REWARD_ON_EVENT = emailAndPushNotiTitles.BECOME_ELIGIBLE_FOR_REWARD_ON_EVENT;
        BECOME_ELIGIBLE_FOR_REWARD_ON_EVENT = BECOME_ELIGIBLE_FOR_REWARD_ON_EVENT.replace('<eventName>', event.event_name);
        let mailSubject = BECOME_ELIGIBLE_FOR_REWARD_ON_EVENT;
        let reward_claim_url = `${process.env.UI_BASE_URL}/view_analytics_attendee/${reward.reward_id}`
        let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            rewardClaimUrl: reward_claim_url,
            eventUrl: event_url,
            reward_name: reward.title,
            event_name: event.event_name,
            user_name: utils.toTitleCase((refrenceUser.first_name && refrenceUser.last_name) ? refrenceUser.first_name + ' ' + refrenceUser.last_name : refrenceUser.username),
        }, AWSManager.MAIL_PARAMS);
        console.log('templateVars=========', templateVars)
        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([refrenceUser.email], mailBody, mailSubject);
    }
}

//notify user on eligible for reward by push notification
const notifyUserOnEligibleForRewardByPushNotification = async (refrenceUser, event, reward) => {
    var userDeviceTokenData = await getUserDeviceToken(refrenceUser.user_id);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        let userName = utils.toTitleCase((refrenceUser.first_name && refrenceUser.last_name) ? refrenceUser.first_name + ' ' + refrenceUser.last_name : refrenceUser.username)
        
        let USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT;
        USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT = USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT
            .replace('<userName>',userName)
            .replace('<rewardTitle>',reward.title)
            .replace('<eventName>',event.event_name);

        var message = {
            title: emailAndPushNotiTitles.BECOME_ELIGIBLE_FOR_REWARD,
            body: USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.USER_DEVICE_ID_NOT_FOUND })
    }
}

//notify organiser on user eligible for reward
const notifyOrganiserOnUserEligibleForReward = async (organiser, refrenceUser, reward, event) => {
    if (organiser.email && organiser.email !== '' && organiser.is_email_verified && organiser.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_organiser_on_user_become_eligible_for_reward.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.USER_BECOME_ELIGIBLE_FOR_REWARD_ON_YOUR_EVENT + event.event_name + ' ' + stringMessages.EVENT;
        let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            reward_name: reward.title,
            user_name: utils.toTitleCase((refrenceUser.first_name && refrenceUser.last_name) ? refrenceUser.first_name + ' ' + refrenceUser.last_name : refrenceUser.username),
            organiser_name: utils.toTitleCase((organiser.first_name && organiser.last_name) ? organiser.first_name + ' ' + organiser.last_name : organiser.username),
        }, AWSManager.MAIL_PARAMS);
        console.log('templateVars======', templateVars);
        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([organiser.email], mailBody, mailSubject);
    }
}

//notify organiser on user eligible for reward by push notification
const notifyOrganiserOnUserEligibleForRewardByPushNotification = async (organiser, refrenceUser, event, reward) => {
    var userDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        let userName = utils.toTitleCase((refrenceUser.first_name && refrenceUser.last_name) ? refrenceUser.first_name + ' ' + refrenceUser.last_name : refrenceUser.username)
        
        let USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT;
        USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT = USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT
            .replace('<userName>',userName)
            .replace('<rewardTitle>',reward.title)
            .replace('<eventName>',event.event_name);

        var message = {
            title: emailAndPushNotiTitles.USER_BECOME_ELIGIBLE_FOR_REWARD,
            body: USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.USER_DEVICE_ID_NOT_FOUND })
    }
}

//notify organiser on when an existing user logs in after clicking an event shared in social media platform
const notifyOrganiserOnVisiterUserLoggedIn = async (event, organiser, referenceuser, visiterUserName, socialMediaPlatform) => {
    var userDeviceTokenData = await getUserDeviceToken(organiser.user_id);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var refrenceUserName = utils.toTitleCase((referenceuser.first_name && referenceuser.last_name) ? referenceuser.first_name + ' ' + referenceuser.last_name : referenceuser.username)
        
        let VISITER_LOGGED_THROUGH_EVENT_SHARED_BY_USER = emailAndPushNotiTitles.VISITER_LOGGED_THROUGH_EVENT_SHARED_BY_USER;
        VISITER_LOGGED_THROUGH_EVENT_SHARED_BY_USER = VISITER_LOGGED_THROUGH_EVENT_SHARED_BY_USER
            .replace("<visiterUserName>", visiterUserName)
            .replace("<eventName>", event.event_name)
            .replace("<socialMediaPlatform>", socialMediaPlatform)
            .replace("<refrenceUserName>", refrenceUserName)

        var message = {
            title: emailAndPushNotiTitles.USER_LOGGED_IN_AFTER_CLICKING_AN_EVENT_IN_SOCIAL_PLATFROM,
            body: VISITER_LOGGED_THROUGH_EVENT_SHARED_BY_USER,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.USER_DEVICE_ID_NOT_FOUND })
    }
}



const fetchNecessaryData = (dataContainer, referenceUserId, rewardId) => {
    return new Promise(async (resolve, reject) => {

        const fetchReward = () => {
            return new Promise(async (resolve, reject) => {
                var sqlQry = "SELECT _event_id, no_of_click, reward_id, title FROM reward_master WHERE reward_id = " + rewardId + " ";
                let rewardDetail = await MDBObject.runQuery(sqlQry);
                if (rewardDetail && rewardDetail.length > 0) {
                    dataContainer['reward_detais'] = rewardDetail[0];
                    return resolve(rewardDetail);
                } else {
                    return resolve(errorMessages.EVENT_NOT_FOUND);
                }
            })
        }


        const fetchEvent = () => {
            var eventId = dataContainer.reward_detais._event_id;
            return new Promise(async (resolve, reject) => {
                if (eventId) {
                    var sqlQry = "SELECT _user_id, event_name, event_id FROM event_master WHERE event_id = " + eventId + " ";
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

        const fetchRefrenceUser = () => {
            return new Promise(async (resolve, reject) => {
                let sqlQry = "SELECT user_id, first_name, last_name, username, email, is_email_verified FROM user_master WHERE user_id = " + referenceUserId + " ";
                let userDetails = await MDBObject.runQuery(sqlQry);
                if (userDetails.length > 0) {
                    dataContainer['referenceuser_details'] = userDetails[0];
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
            .then(fetchRefrenceUser)
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
        device_type: Joi.string().required(),
        browser_name: Joi.string().required(),
        ip_address: Joi.string().required()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(
            body,
            schema,
            {
                abortEarly: false,
                allowUnknown: true
            },
            function (error, value) {
                if (error) {
                    reject({ status_code: 400, message: error.details[0].message });
                } else {
                    resolve(value);
                }
            }
        );
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
        apiData._visited_user_id = 0;
        var user = await utils.verifyJWT(event.headers.Authorization);
        if (user && user.id) {
            apiData._visited_user_id = user.id;
        } else {
            apiData._visited_user_id = -1;
        }

        var geoResponse = await geoip.lookup(apiData.ip_address);
        apiData.country = geoResponse.country;
        apiData.city = geoResponse.city;


        apiData._reward_id = apiData.reward_id;
        apiData._ref_user_id = apiData.ref_user_id;
        delete apiData.reward_id;
        delete apiData.ref_user_id;

        let getVisitedRecords = await MDBObject.getData('visited_master', 'visited_id', { ip_address: apiData.ip_address, _reward_id: apiData._reward_id });
        // console.log(getVisitedRecords.length);
        // return;
        if (getVisitedRecords.length > 0) {
            response = { success: false, message: errorMessages.VISITED_INFO_ALREADY_SAVED };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        return MDBObject.dataInsert("visited_master", apiData).then(async (data) => {
            await MDBObject.runQuery('UPDATE reward_applied_master SET click_count = click_count + 1 WHERE _user_id = ' + apiData._ref_user_id + ' AND _reward_id = ' + apiData._reward_id);
            //fetch necessary data
            await fetchNecessaryData(dataContainer, apiData._ref_user_id, apiData._reward_id);

            if (dataContainer.referenceuser_details && dataContainer.event_details) {
                //notify user on shared event visited by some one
                await notifyUser(dataContainer.event_details, dataContainer.referenceuser_details);
                let dataObj = {
                    refrence_user_id: apiData._ref_user_id,
                    event_name: dataContainer.event_details.event_name,
                    social_media_platform: apiData.social_media_type,
                    country_name: apiData.country,
                    device_type: apiData.device_type,
                    browser_name: apiData.browser_name
                }
                await notifyUserByPushNotification(dataObj);
                
                let CLICK_RECEIVED_FOR_EVENT_SHARED_IN = emailAndPushNotiTitles.CLICK_RECEIVED_FOR_EVENT_SHARED_IN;
                CLICK_RECEIVED_FOR_EVENT_SHARED_IN = CLICK_RECEIVED_FOR_EVENT_SHARED_IN
                    .replace('<eventname>', dataObj.event_name)
                    .replace('<socialmediaplatform>', dataObj.social_media_platform)
                    .replace('<countryName>', dataObj.country_name)
                    .replace('<deviceType>', dataObj.device_type)
                    .replace('<browserName>', dataObj.browser_name);
            
                let saveObj = {
                    _user_id: apiData._visited_user_id,
                    _event_id: dataContainer.event_details.event_id,
                    notify_type: stringMessages.DATA,
                    payload_data: {
                        messageFrom: stringMessages.PROMO_TEAM
                    },
                    notify_user_id: apiData._ref_user_id,
                    notify_text: CLICK_RECEIVED_FOR_EVENT_SHARED_IN,
                }
                await savePushNotification(saveObj);
            }


            if (dataContainer.referenceuser_details && dataContainer.event_details && dataContainer.organiser_details) {
                //notify organiser on shared event visited by some one by push notification
                let dataObj = {
                    organiser_id: dataContainer.organiser_details.user_id,
                    refrence_user_name: utils.toTitleCase((dataContainer.referenceuser_details.first_name && dataContainer.referenceuser_details.last_name) ? dataContainer.referenceuser_details.first_name + ' ' + dataContainer.referenceuser_details.last_name : dataContainer.referenceuser_details.username),
                    event_name: dataContainer.event_details.event_name,
                    social_media_platform: apiData.social_media_type,
                    country_name: apiData.country,
                    device_type: apiData.device_type,
                    browser_name: apiData.browser_name
                }
                await notifyOrganiserByPushNotification(dataObj);
                
                let CLICK_RECEIVED_FOR_EVENT_SHARED_BY = emailAndPushNotiTitles.CLICK_RECEIVED_FOR_EVENT_SHARED_BY;
                CLICK_RECEIVED_FOR_EVENT_SHARED_BY = CLICK_RECEIVED_FOR_EVENT_SHARED_BY
                    .replace('<eventname>', dataObj.event_name)
                    .replace('<refrenceUserName>', dataObj.refrence_user_name)
                    .replace('<socialmediaplatform>', dataObj.social_media_platform)
                    .replace('<countryName>', dataObj.country_name)
                    .replace('<deviceType>', dataObj.device_type)
                    .replace('<browserName>', dataObj.browser_name);

                let saveObj = {
                    _user_id: apiData._visited_user_id,
                    _event_id: dataContainer.event_details.event_id,
                    notify_type: stringMessages.DATA,
                    payload_data: {
                        messageFrom: stringMessages.PROMO_TEAM
                    },
                    notify_user_id: dataContainer.organiser_details.user_id,
                    notify_text: CLICK_RECEIVED_FOR_EVENT_SHARED_BY,
                }
                await savePushNotification(saveObj);
            }


            if (dataContainer.reward_detais && dataContainer.organiser_details && dataContainer.referenceuser_details && dataContainer.event_details) {
                let eligibleClickForReward = dataContainer.reward_detais.no_of_click;
                let rewardVisitors = await MDBObject.getData('visited_master', 'count(*) as totalCount', { _reward_id: apiData._reward_id, _ref_user_id: apiData._ref_user_id }, "AND");
                
                // if (rewardVisitors.length > 0 && rewardVisitors.length === eligibleClickForReward) {
                console.log("rewardVisitors[0].totalCount == eligibleClickForReward ", rewardVisitors[0].totalCount == eligibleClickForReward )
                if (rewardVisitors && rewardVisitors.length && rewardVisitors[0].totalCount && rewardVisitors[0].totalCount == eligibleClickForReward) {
                    //send mail to user (When the user becomes eligible for a reward associated with an event)
                    await notifyUserOnEligibleForReward(dataContainer.event_details, dataContainer.referenceuser_details, dataContainer.reward_detais)
                    await notifyUserOnEligibleForRewardByPushNotification(dataContainer.referenceuser_details, dataContainer.event_details, dataContainer.reward_detais)
                    let refrenceUserName = utils.toTitleCase((dataContainer.referenceuser_details.first_name && dataContainer.referenceuser_details.last_name) ? dataContainer.referenceuser_details.first_name + ' ' + dataContainer.referenceuser_details.last_name : dataContainer.referenceuser_details.username)
                    
                    let USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT;
                    USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT = USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT
                        .replace('<userName>', refrenceUserName)
                        .replace('<rewardTitle>', dataContainer.reward_detais.title)
                        .replace('<eventName>', dataContainer.event_details.event_name);

                    let userPushNotification = {
                        _user_id: apiData._visited_user_id,
                        _event_id: dataContainer.event_details.event_id,
                        notify_type: stringMessages.DATA,
                        payload_data: {
                            messageFrom: stringMessages.PROMO_TEAM
                        },
                        notify_user_id: dataContainer.referenceuser_details.user_id,
                        notify_text: USER_HAS_ELIGIBLE_REWARD_ASSOCIATED_WITH_EVENT,
                    }
                    await savePushNotification(userPushNotification);
                    //notify organiser when the user becomes eligible for a reward associated with an event)
                    await notifyOrganiserOnUserEligibleForReward(dataContainer.organiser_details, dataContainer.referenceuser_details, dataContainer.reward_detais, dataContainer.event_details)
                    await notifyOrganiserOnUserEligibleForRewardByPushNotification(dataContainer.organiser_details, dataContainer.referenceuser_details, dataContainer.event_details, dataContainer.reward_detais)
                    let refrenceUserName1 = utils.toTitleCase((dataContainer.referenceuser_details.first_name && dataContainer.referenceuser_details.last_name) ? dataContainer.referenceuser_details.first_name + ' ' + dataContainer.referenceuser_details.last_name : dataContainer.referenceuser_details.username)

                    let organiserPushNotification = {
                        _user_id: apiData._visited_user_id,
                        _event_id: dataContainer.event_details.event_id,
                        notify_type: stringMessages.DATA,
                        payload_data: {
                            messageFrom: stringMessages.PROMO_TEAM
                        },
                        notify_user_id: dataContainer.organiser_details.user_id,
                        notify_text: `${refrenceUserName1} is eligible for reward ${dataContainer.reward_detais.title} associated with the event ${dataContainer.event_details.event_name}`,
                    }
                    await savePushNotification(organiserPushNotification);
                }
            }

            //When an existing user logs in after clicking an event shared in social media platform
            if (user) {
                var visiterUserName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username);
                var socialMediaPlatform = apiData.social_media_type;
                if (dataContainer.event_details && dataContainer.referenceuser_details && dataContainer.organiser_details) {
                    await notifyOrganiserOnVisiterUserLoggedIn(dataContainer.event_details, dataContainer.organiser_details, dataContainer.referenceuser_details, visiterUserName, socialMediaPlatform)
                    var refrenceUserName = utils.toTitleCase((dataContainer.referenceuser_details.first_name && dataContainer.referenceuser_details.last_name) ? dataContainer.referenceuser_details.first_name + ' ' + dataContainer.referenceuser_details.last_name : dataContainer.referenceuser_details.username)
                    
                    let VISITER_LOGGED_THROUGH_EVENT_SHARED_BY_USER = emailAndPushNotiTitles.VISITER_LOGGED_THROUGH_EVENT_SHARED_BY_USER;
                    VISITER_LOGGED_THROUGH_EVENT_SHARED_BY_USER = VISITER_LOGGED_THROUGH_EVENT_SHARED_BY_USER
                        .replace("<visiterUserName>", visiterUserName)
                        .replace("<eventName>", dataContainer.event_details.event_name)
                        .replace("<socialMediaPlatform>", socialMediaPlatform)
                        .replace("<refrenceUserName>", refrenceUserName)

                    let organiserPushNotification = {
                        _user_id: apiData._visited_user_id,
                        _event_id: dataContainer.event_details.event_id,
                        notify_type: stringMessages.DATA,
                        payload_data: {
                            messageFrom: stringMessages.PROMO_TEAM
                        },
                        notify_user_id: dataContainer.organiser_details.user_id,
                        notify_text: VISITER_LOGGED_THROUGH_EVENT_SHARED_BY_USER,
                    }
                    await savePushNotification(organiserPushNotification);
                }
            }

            response = {
                success: true,
                message: successMessages.VISITED_INFO_SAVED
            };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch(error => {
            return awsRequestHelper.respondWithJsonBody(500, error);
        });
    } catch (error) {
        return awsRequestHelper.respondWithJsonBody(500, error);
    }
};
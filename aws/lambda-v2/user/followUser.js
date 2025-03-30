"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const AWSManager = require('../common/awsmanager');
const utils = require('../common/utils');
const Joi = require('joi');
const { errorMessages,
    successMessages,
    stringMessages,
    emailAndPushNotiTitles
} = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        follow_user_id: Joi.string()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
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
    let userDeviceTokenData = await DBManager.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
}

//When a user follows the organizer of an event
const notifyOrganiserOnUsersFollows = async (user, organiserId) => {
    var userDeviceTokenData = await getUserDeviceToken(organiserId);
    var userName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username)
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.STARTED_FOLLOWING,
            body: stringMessages.USER + ' ' + userName + emailAndPushNotiTitles.USER_HAS_STARTED_FOLLOWING_YOU,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: user.user_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({
            messageFrom: stringMessages.PROMO_TEAM
        }),
        notify_user_id: organiserId,
        notify_text: stringMessages.USER + ' ' + userName + emailAndPushNotiTitles.USER_HAS_STARTED_FOLLOWING_YOU,
    }
    return await DBManager.dataInsert("user_notification", saveObj);
};

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        var loggedUserDetails = {};
        await DBManager.getData("user_master", "first_name, last_name, username, user_id", { user_id: user.id }).then(result => {
            loggedUserDetails = result[0];
            return loggedUserDetails;
        })

        let whereQry = { follow_user_id: apiData['follow_user_id'], _user_id: user['id'] };
        let data = {
            follow_user_id: apiData['follow_user_id'],
            _user_id: user['id']
        }

        let existingRecords = await DBManager.getData('follow_users', 'count(*) as totalCount', whereQry);
        if (existingRecords[0].totalCount) {
            response = { success: false, message: errorMessages.USER_ALREADY_FOLLOWED };
        } else {
            
            await DBManager.dataInsert('follow_users', data);
            
            //When a user follows the organizer of an event
            await notifyOrganiserOnUsersFollows(loggedUserDetails, apiData.follow_user_id);
            response = { success: true, message: successMessages.USER_FOLLOWED }
        }
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
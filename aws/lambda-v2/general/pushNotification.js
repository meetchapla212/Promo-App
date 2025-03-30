"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const Joi = require('joi');
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        notify_type: Joi.string(),
        payload_data: Joi.string(),
        notify_user_id: Joi.string(),
        notify_text: Joi.string()
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

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        let data = {
            _user_id: user['id'],
            notify_type: apiData['notify_type'],
            payload_data: apiData['payload_data'],
            notify_user_id: apiData['notify_user_id'],
            notify_text: apiData['notify_text']
        }
        if ('event_id' in apiData && apiData.event_id != '') {
            data._event_id = apiData.event_id;
        }
        await DBManager.dataInsert('user_notification', data);
        response = { success: true, message: successMessages.NOTIFICATION_PUSHED }

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
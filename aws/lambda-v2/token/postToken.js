"use strict";
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const utils = require('../common/utils');
const {
    errorMessages,
    successMessages
} = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        token: Joi.string().required(),
        device_type: Joi.string().required()
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
        let user_id = user['id'];

        let data = {
            token: apiData['token'],
            device_type: apiData['device_type'],
            _user_id: user_id
        }

        let existingRecords = await DBManager.getData('app_token_master', 'count(*) as totalCount', data, "AND");
        if (!existingRecords[0].totalCount) {
            await DBManager.dataInsert("app_token_master", data);
            response = { success: true, message: successMessages.TOKEN_STORED };
        } else {
            response = { success: true, message: successMessages.TOKEN_STORED };
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
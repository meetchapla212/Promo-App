"use strict";
var md5 = require('md5');
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        newPassword: Joi.string().required()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: errorMessages.INVALID_INPUT });
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

        let newPassword = md5(apiData['newPassword']);
        let whereQry = { user_id: user['id'] };
        let existingRecords = await DBManager.getData('user_master', 'count(*) as totalCount', whereQry);
        if (existingRecords[0].totalCount) {
            await DBManager.dataUpdate("user_master", { "password": newPassword, 'is_old_user': 0 }, whereQry);
            response = { success: true, message: successMessages.PASSWORD_CHANGED };
        } else {
            response = { success: false, message: errorMessages.INVALID_TOKEN };
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
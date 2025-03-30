"use strict";
var md5 = require('md5');
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const {
    errorMessages,
    successMessages
} = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        mobile_number: Joi.string().required(),
        country_code: Joi.string().required(),
        new_password: Joi.string().required()
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
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        let countryCode = apiData.country_code;
        if (!countryCode.startsWith("0")) {
            countryCode = "0" + countryCode;
        }

        //check mobile number exists with country code
        let existingRecordsQuery = `SELECT count(*) as totalCount FROM user_master where mobile_number = '${apiData.mobile_number}' AND country_code = '${countryCode}'`;
        let existingRecords = await DBManager.runQuery(existingRecordsQuery);
        if (existingRecords && existingRecords.length && existingRecords[0] && existingRecords[0].totalCount) {
            let userNewPassword = md5(apiData['new_password']);
            //update password and send response
            return await DBManager.dataUpdate('user_master', { password: userNewPassword }, { mobile_number: apiData.mobile_number }).then(async () => {
                response.success = true;
                response.message = successMessages.PASSWORD_UPDATED;
                return awsRequestHelper.respondWithJsonBody(200, response);
            })
        } else {
            response.message = errorMessages.USER_NOT_EXISTS_WITH_GIVEN_MOBILE_AND_COUNTRY_CODE
            return awsRequestHelper.respondWithJsonBody(200, response);
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
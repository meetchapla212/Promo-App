"use strict";
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const _ = require('lodash');
const utils = require('../common/utils');
const awsManager = require('../common/awsmanager');
const { errorMessages, successMessages, emailAndPushNotiTitles } = require("../common/constants");
const moment = require('moment');

const generateOTP = () => {
    var digits = '0123456789';
    var otpLength = 6;
    var otp = '';
    for (let i = 1; i <= otpLength; i++) {
        var index = Math.floor(Math.random() * (digits.length));
        otp = otp + digits[index];
    }
    return otp;
}

const validate = function (body) {
    const schema = Joi.object().keys({
        email: Joi.string().required(),
        verify_type: Joi.string().optional()
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
        let whereQry = { email: apiData['email'], is_deleted: 0 };
        let existingRecords = await DBManager.getData('user_master', 'first_name, last_name, username, email', whereQry);
        if (existingRecords.length) {
            let user = existingRecords[0];
            let oneTimePassword = generateOTP();
            let tmpl = fs.readFileSync('./lambda-v2/emailTemplates/reset-password.html', 'utf8');
            let templateVars = {
                base_url: process.env.UI_BASE_URL,
                otp: oneTimePassword,
                name: utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username),
                title: emailAndPushNotiTitles.RESET_PASSWORD
            };
            let body = _.template(tmpl)(templateVars);
            if (user.email && user.email !== '') {
                var toAddress = new Array(user.email);
                awsManager.sendEmail(toAddress, body, emailAndPushNotiTitles.RESET_PASSWORD, process.env.FROM);
            }
            let updateValue = {
                otp: oneTimePassword,
                otp_generate_time: moment().format("YYYY-MM-DD HH:mm:ss")
            };
            return await DBManager.dataUpdate('user_master', updateValue, whereQry).then(async () => {
                response.success = true;
                response.message = successMessages.ENTER_OTP_TO_VERIFY_EMAIL;
                return awsRequestHelper.respondWithJsonBody(200, response);
            })
        } else {
            response.message = errorMessages.EMAIL_NOT_EXIST;
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
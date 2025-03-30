"use strict";
var md5 = require('md5');
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const utils = require('./../common/utils');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const AWSManager = require('../common/awsmanager');
const _ = require('lodash');
const moment = require('moment');
const {
    errorMessages,
    successMessages,
    emailAndPushNotiTitles
} = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        email: Joi.string().required(),
        first_name: Joi.string().optional('').allow(''),
        last_name: Joi.string().optional('').allow(''),
        event_id: Joi.number().required(),
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

const sendVerificationCodeToUserByMail = async (user, organiser) => {
    let userName = '';
    if (user.first_name && user.last_name) userName = utils.toTitleCase(user.first_name + ' ' + user.last_name);
    else if (user.first_name) userName = utils.toTitleCase(user.first_name);
    else if (user.last_name) userName = utils.toTitleCase(user.last_name);
    else if (user.username) userName = utils.toTitleCase(user.username);
    let organiserWebsiteUrl = (organiser && organiser.url) ? organiser.url : '';
    let organiserWebsiteLogo = (organiser && organiser.logo) ? organiser.logo : '';
    if (user.email && user.email !== '') {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/send_verification_code_to_widget_user.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.ACCOUNT_VERIFICATION_CODE;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            name: userName,
            accountVerificationCode: user.widget_otp,
            organiserWebsiteUrl,
            organiserWebsiteLogo
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([user.email], mailBody, mailSubject);
    }
}

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

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        var apiData = JSON.parse(event.body);
        await validate(apiData);

        var eventId = apiData.event_id;
        var eventOrganiser = {};

        let getEventOrganiserQuery = `SELECT user_master.url, user_master.logo
            from event_master
            join user_master on event_master._user_id = user_master.user_id
            where event_master.event_id = ${eventId}`;
        await DBManager.runQuery(getEventOrganiserQuery).then(async (eventOrg) => {
            eventOrganiser = eventOrg[0];
            return eventOrg;
        })

        //check user exist in promo
        let promoUserQry = { email: apiData.email };
        var promoUserFieldsObj = "`user_id`, `first_name`, `last_name`, `full_name`, `email`, `username`, `profile_pic`, `city`, `widget_otp`, `is_widget_otp_verified`";
        let isPromoUserExist = await DBManager.getData('user_master', promoUserFieldsObj, promoUserQry, "OR");
        if (isPromoUserExist.length > 0) {
            //generate verification code and update promo user
            let widgetAccountVerifyCode = generateOTP();
            let userUpdateData = {
                widget_otp: widgetAccountVerifyCode,
                is_widget_otp_verified: 0
            }

            await DBManager.dataUpdate("user_master", userUpdateData, promoUserQry);

            let userData = isPromoUserExist[0];
            userData.widget_otp = widgetAccountVerifyCode;
            delete userData.first_name;
            delete userData.last_name;
            userData.first_name = apiData.first_name || '';
            userData.last_name = apiData.last_name || '';

            //send verification mail
            await sendVerificationCodeToUserByMail(userData, eventOrganiser);

            //send response
            response = {
                success: true,
                message: `${successMessages.SEND_VERIFICATION_CODE_TO_MAIL} ${apiData.email}. ${successMessages.VERIFY_ACCOUNT_FIRST}`
            };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        //check guest user already created
        let guestUserQry = { email: apiData.email };
        var guestUserFieldsObj = "`guest_id`, `first_name`, `last_name`, `email`, `widget_otp`, `is_widget_otp_verified`";
        let isWidgetGuestUserExist = await DBManager.getData('guest_widget_users', guestUserFieldsObj, guestUserQry, "OR");
        if (isWidgetGuestUserExist.length > 0) {
            //generate verification code and update promo user
            let widgetAccountVerifyCode = generateOTP();
            let guestUserUpdateData = {
                widget_otp: widgetAccountVerifyCode,
                is_widget_otp_verified: 0
            }

            await DBManager.dataUpdate("guest_widget_users", guestUserUpdateData, guestUserQry);

            let widgetGuestUserData = isWidgetGuestUserExist[0];
            widgetGuestUserData.widget_otp = widgetAccountVerifyCode;
            delete widgetGuestUserData.first_name;
            delete widgetGuestUserData.last_name;
            widgetGuestUserData.first_name = apiData.first_name || '';
            widgetGuestUserData.last_name = apiData.last_name || '';

            //send verification mail
            await sendVerificationCodeToUserByMail(widgetGuestUserData, eventOrganiser);

            //send response
            response = {
                success: true,
                message: `${successMessages.SEND_VERIFICATION_CODE_TO_MAIL} ${apiData.email}. ${successMessages.VERIFY_ACCOUNT_FIRST}`
            };
            return awsRequestHelper.respondWithJsonBody(200, response);
        } else {
            //generate verification code and create guest user
            let widgetAccountVerifyCode = generateOTP();
            let guestUserRemoveTime = moment(new Date()).add(3, 'hours').valueOf()
            let guestUser = {
                email: apiData.email,
                first_name: apiData.first_name ? apiData.first_name : "",
                last_name: apiData.last_name ? apiData.last_name : "",
                deleted_id: guestUserRemoveTime,
                widget_otp: widgetAccountVerifyCode,
                is_widget_otp_verified: 0
            };

            await DBManager.dataInsert("guest_widget_users", guestUser);
            let widgetUserDetails = await DBManager.getData('guest_widget_users', guestUserFieldsObj, guestUserQry, "OR");
            //send verification mail
            await sendVerificationCodeToUserByMail(widgetUserDetails[0], eventOrganiser);

            //send response
            response = {
                success: true,
                message: `${successMessages.SEND_VERIFICATION_CODE_TO_MAIL} ${apiData.email}. ${successMessages.VERIFY_ACCOUNT_FIRST}`
            };
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
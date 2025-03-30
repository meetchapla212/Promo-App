"use strict";
var md5 = require('md5');
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const utils = require('./../common/utils');
const QBM = require('./../common/qbmanager');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const AWSManager = require('../common/awsmanager');
const _ = require('lodash');
const QBMObject = new QBM();
let QbSessionToken = '';
const moment = require('moment');
var AWS = require('aws-sdk');
// Set region
AWS.config.update({
    region: 'us-east-1'
});
var sns = new AWS.SNS({ region: 'us-east-1' });
const { errorMessages, successMessages, smsMessages, emailAndPushNotiTitles } = require("../common/constants");
//us-east-1

const validate = function (body) {
    const schema = Joi.object().keys({
        username: Joi.string().required(),
        email: Joi.string().allow('').optional(),
        first_name: Joi.string().required(),
        last_name: Joi.string().required(),
        mobile_number: Joi.string().allow('').optional(),
        country_code: Joi.string().allow('').optional(),
        password: Joi.string().required(),
        city: Joi.string().required(),
        city_lat: Joi.string().required(),
        city_long: Joi.string().required(),
        signup_type: Joi.string().required()
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


const setSMSAttributesFunction = async () => {
    return new Promise(async (resolve, reject) => {
        await sns.setSMSAttributes({
            attributes: {
                DefaultSenderID: 'TMPROMO2CCD',
                DefaultSMSType: 'Transactional'
            }
        }, (error, data) => {
            if (error) {
                console.error("error : ", error);
                reject(error)
            }
            resolve(data)
        });
    })
}

const sendOtpToUser = async (params) => {
    return new Promise(async (resolve, reject) => {
        await sns.publish(params, async (error, data) => {
            if (error) {
                console.error("error : ", error);
                reject(error)
            }
            resolve(data)
        });
    });
}

const makeUniqUserName = (oldUsername, length) => {
    var result = '';
    var characters = 'abcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return oldUsername + '' + result;
}

const sendEmailVerificationMail = async (emailToken, userData) => {
    if (userData.email && userData.email !== '') {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/verify-email.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.VERIFY_EMAIL;
        let verify_email_url = `${process.env.UI_BASE_URL}/verify-email?token=${emailToken}&email=${userData.email}`;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            verifyEmailUrl: verify_email_url,
            name: utils.toTitleCase((userData.first_name && userData.last_name) ? userData.first_name + ' ' + userData.last_name : userData.username),
        }, AWSManager.MAIL_PARAMS);
        console.log('templateVars in register========', templateVars);

        let mailBody = _.template(tmpl)(templateVars);
        return await AWSManager.sendEmail([userData.email], mailBody, mailSubject);
    }
}

const sendWelcomeMailToUserOnSignUp = async (user) => {
    let userName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username)
    if (user.email && user.email !== '') {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/welcome_mail_on_user_signup.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.WELCOME_TO_PROMO_APP;
        let signin_url = `${process.env.UI_BASE_URL}/login`
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            signinUrl: signin_url,
            userName: userName
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([user.email], mailBody, mailSubject);
    }
}

module.exports.handler = async function (event, context, callback) {
    console.log("register handler")
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        response.signup_type = apiData.signup_type;

        if (apiData && ('signup_type' in apiData) && apiData.signup_type == 2) {
            if (!('mobile_number' in apiData) || (apiData.mobile_number == '') || !('country_code' in apiData) || apiData.country_code == '') {
                response.message = errorMessages.REQUIRE_MOBILE_NUMBER_AND_COUNTRY_CODE;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }

            let countryCode = apiData.country_code;
            if (!countryCode.startsWith("0")) {
                countryCode = "0" + countryCode;
            }

            let user = {
                username: apiData['username'],
                email: apiData['email'] || '',
                first_name: apiData['first_name'],
                last_name: apiData['last_name'],
                password: md5(apiData['password']),
                city: apiData['city'],
                city_lat: apiData['city_lat'],
                city_long: apiData['city_long'],
                mobile_number: apiData['mobile_number'],
                country_code: countryCode,
            }

            
            let existingRecordsQuery = `SELECT count(*) as totalCount FROM user_master where (mobile_number = '${apiData.mobile_number}' AND country_code = '${countryCode}')`;
            let existingRecords = await DBManager.runQuery(existingRecordsQuery);
            if (!existingRecords || !existingRecords.length || !existingRecords[0].totalCount || existingRecords[0].totalCount == 0) {
                
                //check if username is exist or not if exist check make uniq by appending some rendom string
                let userNameExistsQuery = `SELECT count(*) as totalCount FROM user_master where username = '${apiData.username}'`;
                let userNameExists = await DBManager.runQuery(userNameExistsQuery);
                if (userNameExists[0].totalCount) {
                    user.username = makeUniqUserName(apiData.username, 5);
                }

                let quickBloxSession = await QBMObject.session();
                QbSessionToken = quickBloxSession.token;
                return await QBMObject.createUser('users', {
                    user: {
                        full_name: user.username,
                        login: user.username,
                        password: "thepromoappqb",
                    }
                }, QbSessionToken).then(async (QBuserDetails) => {
                    let oneTimePassword = generateOTP();
                    await setSMSAttributesFunction();
                    return await sendOtpToUser({
                        Message: oneTimePassword + smsMessages.OTP_FOR_SIGNUP,
                        PhoneNumber: `+${countryCode}${apiData.mobile_number}`,
                    }).then(async (data) => {
                        user['is_otp_verified'] = 0;
                        user['otp'] = oneTimePassword;
                        user['otp_generate_time'] = moment().format("YYYY-MM-DD HH:mm:ss");
                        user['quickblox_id'] = QBuserDetails.user.id;
                        user['current_plan'] = "free";
                        user['is_email_verified'] = 0;

                        await DBManager.dataInsert("user_master", user);
                        await sendWelcomeMailToUserOnSignUp(user);

                        response.success = true;
                        response.message = successMessages.VERIFY_MOBILE_OTP_SENT;
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    }).catch(error => {
                        response.message = error.message;
                        return awsRequestHelper.respondWithJsonBody(error.statusCode, response);
                    });
                }).catch(async (error) => {
                    if (error.statusCode == 422) {
                        // response.message = errorMessages.USERNAME_ALREADY_REGISTERED_WITH_QUICKBLOX;

                        let existingRecordsQuery = `SELECT count(*) as totalCount FROM user_master where (mobile_number = '${apiData.mobile_number}' AND country_code = '${countryCode}')`;
                        let existingRecords = await DBManager.runQuery(existingRecordsQuery);
                        if (!existingRecords || !existingRecords.length || !existingRecords[0].totalCount || existingRecords[0].totalCount == 0) {
                            
                            let userNameExistsQuery = `SELECT count(*) as totalCount FROM user_master where username = '${apiData.username}'`;
                            let userNameExists = await DBManager.runQuery(userNameExistsQuery);
                            if (userNameExists[0].totalCount) {
                                user.username = makeUniqUserName(apiData.username, 5);
                            }

                            let quickBloxSession = await QBMObject.session();
                            QbSessionToken = quickBloxSession.token;
                            return await QBMObject.createUser('users', {
                                user: {
                                    full_name: user.username,
                                    login: user.username,
                                    password: "thepromoappqb",
                                }
                            }, QbSessionToken).then(async (QBuserDetails) => {
                                let oneTimePassword = generateOTP();
                                await setSMSAttributesFunction();
                                return await sendOtpToUser({
                                    Message: oneTimePassword + smsMessages.OTP_FOR_SIGNUP,
                                    PhoneNumber: `+${countryCode}${apiData.mobile_number}`,
                                }).then(async (data) => {
                                    user['is_otp_verified'] = 0;
                                    user['otp'] = oneTimePassword;
                                    user['otp_generate_time'] = moment().format("YYYY-MM-DD HH:mm:ss");
                                    user['quickblox_id'] = QBuserDetails.user.id;
                                    user['current_plan'] = "free";
                                    user['is_email_verified'] = 0;

                                    await DBManager.dataInsert("user_master", user);
                                    await sendWelcomeMailToUserOnSignUp(user);

                                    response.success = true;
                                    response.message = successMessages.VERIFY_MOBILE_OTP_SENT;
                                    return awsRequestHelper.respondWithJsonBody(200, response);
                                }).catch(error => {
                                    response.message = error.message;
                                    return awsRequestHelper.respondWithJsonBody(error.statusCode, response);
                                });
                            }).catch((error) => {
                                if (error.statusCode == 422) {
                                    response.message = errorMessages.USERNAME_ALREADY_REGISTERED_WITH_QUICKBLOX;
                                } else {
                                    response.message = error.message;
                                }
                                return awsRequestHelper.respondWithJsonBody(error.statusCode, response);
                            });
                        } else {
                            response.success = false;
                            response.message = errorMessages.ALREADY_REGISTERED_MOBILE_NUMBER_AND_COUNTRY_CODE;
                            return awsRequestHelper.respondWithJsonBody(200, response);
                        }
                    } else {
                        response.message = error.message;
                    }
                    return awsRequestHelper.respondWithJsonBody(error.statusCode, response);
                });
            } else {
                response.success = false;
                response.message = errorMessages.ALREADY_REGISTERED_MOBILE_NUMBER_AND_COUNTRY_CODE;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        } else if (apiData && ('signup_type' in apiData) && apiData.signup_type == 1) {
            if (!('username' in apiData) || (apiData.username == '') || !('email' in apiData) || apiData.email == '') {
                response.message = errorMessages.USERNAME_AND_EMAIL_REQUIRED;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }

            let user = {
                username: apiData['username'],
                email: apiData['email'],
                first_name: apiData['first_name'],
                last_name: apiData['last_name'],
                password: md5(apiData['password']),
                city: apiData['city'],
                city_lat: apiData['city_lat'],
                city_long: apiData['city_long']
            };

            
            let quickBloxSession = await QBMObject.session();
            QbSessionToken = quickBloxSession.token;
            let whereQry = { email: apiData['email'] };
            let existingRecords = await DBManager.getData('user_master', 'count(*) as totalCount', whereQry);
            if (!existingRecords || !existingRecords.length || !existingRecords[0].totalCount || existingRecords[0].totalCount == 0) {
                
                //check if username is exist or not if exist check make uniq by appending some rendom string
                let userNameExistsQuery = `SELECT count(*) as totalCount FROM user_master where username = '${apiData.username}'`;
                let userNameExists = await DBManager.runQuery(userNameExistsQuery);
                if (userNameExists[0].totalCount) {
                    user.username = makeUniqUserName(apiData.username, 5);
                }

                return await QBMObject.createUser('users', {
                    user: {
                        full_name: user.username,
                        login: user.username,
                        password: "thepromoappqb",
                    }
                }, QbSessionToken).then(async (QBuserDetails) => {
                    user.quickblox_id = QBuserDetails.user.id;
                    user.current_plan = "free";

                    let emailToken = uuidv4();
                    user.email_token = emailToken;
                    user.is_email_verified = 0;

                    await DBManager.dataInsert("user_master", user);

                    var fieldsObj = "`user_id`, `username`, `first_name`, `last_name`, `email`, `is_email_verified`, `profile_pic`, `about_you`, `city`, `city_lat`, `city_long`,`quickblox_id`,`current_plan`,`is_verified`,`charges_enabled`,`payouts_enabled`";
                    let res = await DBManager.getData("user_master", fieldsObj, whereQry, "OR");
                    let result = res[0];

                    await sendEmailVerificationMail(emailToken, result);
                    await sendWelcomeMailToUserOnSignUp(result);

                    let profileData = {
                        id: result['user_id'],
                        username: result['username'],
                        email: result['email'],
                        first_name: result['first_name'],
                        last_name: result['last_name'],
                        is_email_verified: result["is_email_verified"],
                    }

                    let token = utils.createJWT(profileData);

                    let data = {
                        profile: result,
                        token
                    };
                    response = { success: true, message: successMessages.REGISTERED, data: data };
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }).catch(async (error) => {
                    if (error.statusCode == 422) {

                        
                        let quickBloxSession = await QBMObject.session();
                        QbSessionToken = quickBloxSession.token;
                        let whereQry = { email: apiData['email'] };
                        let existingRecords = await DBManager.getData('user_master', 'count(*) as totalCount', whereQry);
                        if (!existingRecords || !existingRecords.length || !existingRecords[0].totalCount || existingRecords[0].totalCount == 0) {
                            
                            let userNameExistsQuery = `SELECT count(*) as totalCount FROM user_master where username = '${apiData.username}'`;
                            let userNameExists = await DBManager.runQuery(userNameExistsQuery);
                            if (userNameExists[0].totalCount) {
                                user.username = makeUniqUserName(apiData.username, 5);
                            }

                            return await QBMObject.createUser('users', {
                                user: {
                                    full_name: user.username,
                                    login: user.username,
                                    password: "thepromoappqb",
                                }
                            }, QbSessionToken).then(async (QBuserDetails) => {
                                user.quickblox_id = QBuserDetails.user.id;
                                user.current_plan = "free";

                                let emailToken = uuidv4();
                                user.email_token = emailToken;
                                user.is_email_verified = 0;

                                await DBManager.dataInsert("user_master", user);

                                var fieldsObj = "`user_id`, `username`, `first_name`, `last_name`, `email`, `is_email_verified`, `profile_pic`, `about_you`, `city`, `city_lat`, `city_long`,`quickblox_id`,`current_plan`,`is_verified`,`charges_enabled`,`payouts_enabled`";
                                let res = await DBManager.getData("user_master", fieldsObj, whereQry, "OR");
                                let result = res[0];

                                await sendEmailVerificationMail(emailToken, result);
                                await sendWelcomeMailToUserOnSignUp(result);

                                let profileData = {
                                    id: result['user_id'],
                                    username: result['username'],
                                    email: result['email'],
                                    first_name: result['first_name'],
                                    last_name: result['last_name'],
                                    is_email_verified: result["is_email_verified"],
                                }

                                let token = utils.createJWT(profileData);

                                let data = {
                                    profile: result,
                                    token
                                };
                                response = { success: true, message: successMessages.REGISTERED, data: data };
                                return awsRequestHelper.respondWithJsonBody(200, response);
                            }).catch((error) => {
                                if (error.statusCode == 422) {
                                    response.message = errorMessages.USERNAME_ALREADY_REGISTERED_WITH_QUICKBLOX;
                                } else {
                                    response.message = error.message;
                                }
                                return awsRequestHelper.respondWithJsonBody(error.statusCode, response);
                            });
                        } else {
                            response.message = errorMessages.EMAIL_ALREADY_EXIST;
                        }
                        return awsRequestHelper.respondWithJsonBody(200, response);

                    } else {
                        response.message = error.message;
                    }
                    return awsRequestHelper.respondWithJsonBody(error.statusCode, response);
                });
            } else {
                response.message = errorMessages.EMAIL_ALREADY_EXIST;
            }
            return awsRequestHelper.respondWithJsonBody(200, response);
        } else {
            response.message = errorMessages.INVALID_SIGNUP_TYPE;
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
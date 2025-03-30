const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const moment = require('moment');
const utils = require('./../common/utils');
var AWS = require('aws-sdk');
const {
    errorMessages,
    successMessages,
    smsMessages
} = require("../common/constants");

// Set region
AWS.config.update({
    region: 'us-east-1'
});
var sns = new AWS.SNS({ region: 'us-east-1' });
//us-east-1

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

const validate = function (body) {
    const schema = Joi.object().keys({
        mobile_number: Joi.string().required(),
        country_code: Joi.string().required(),
        verify_type: Joi.string().required(),
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

        if (apiData.verify_type == 'editprofile') {
            let user = await utils.verifyUser(event.headers.Authorization);
            let userId = user.id;

            let oneTimePassword = generateOTP();
            await setSMSAttributesFunction();
            return await sendOtpToUser({
                Message: `${oneTimePassword} is your OTP for edit profile with promo app. OTPs are secret, do not share with anyone`,
                PhoneNumber: `+${countryCode}${apiData.mobile_number}`,
            }).then(async (data) => {
                //set new otp and date to logged user
                let getUserQuery = `SELECT count(*) as totalCount FROM user_master where user_id = ${userId}`;
                let loggedUser = await DBManager.runQuery(getUserQuery);
                if (loggedUser[0].totalCount) {
                    let updateValue = {
                        otp: oneTimePassword,
                        is_otp_verified: 0,
                        otp_generate_time: moment().format("YYYY-MM-DD HH:mm:ss")
                    };

                    await DBManager.dataUpdate('user_master', updateValue, { user_id: userId })
                }

                response.success = true;
                response.message = successMessages.VERIFY_MOBILE_OTP_SENT;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }).catch(error => {
                response.message = error.message;
                return awsRequestHelper.respondWithJsonBody(error.statusCode, response);
            });
        } else {
            let existingRecordsQuery = `SELECT count(*) as totalCount FROM user_master where (mobile_number = '${apiData.mobile_number}' AND country_code = '${countryCode}')`;
            let existingRecords = await DBManager.runQuery(existingRecordsQuery);
            if (existingRecords[0].totalCount) {
                let oneTimePassword = generateOTP();
                await setSMSAttributesFunction();
                return await sendOtpToUser({
                    Message: oneTimePassword + smsMessages.OTP_FOR_SIGNUP,
                    PhoneNumber: `+${countryCode}${apiData.mobile_number}`,
                }).then(async (data) => {
                    let updateValue = {
                        otp: oneTimePassword,
                        is_otp_verified: 0,
                        otp_generate_time: moment().format("YYYY-MM-DD HH:mm:ss")
                    };
                    return await DBManager.dataUpdate('user_master', updateValue, { mobile_number: apiData.mobile_number, country_code: countryCode }).then(async () => {
                        response.success = true;
                        response.message = successMessages.VERIFY_MOBILE_OTP_SENT;
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    })
                }).catch(error => {
                    response.message = error.message;
                    return awsRequestHelper.respondWithJsonBody(error.statusCode, response);
                });
            }
            response.message = errorMessages.USER_NOT_EXISTS_WITH_GIVEN_MOBILE_AND_COUNTRY_CODE;
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
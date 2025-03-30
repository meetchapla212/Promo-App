const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const utils = require('./../common/utils');
const { errorMessages, successMessages } = require("../common/constants");
const moment = require('moment');

const validate = function (body) {
    const schema = Joi.object().keys({
        mobile_number: Joi.string().required(),
        country_code: Joi.string().required(),
        otp: Joi.required(),
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

const validate1 = function (body) {
    const schema = Joi.object().keys({
        email: Joi.string().required(),
        otp: Joi.required(),
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
        if (apiData && apiData.email != undefined && apiData.email != null && apiData.email != '' && apiData.email) {

            await validate1(apiData);

            let existingRecordsQuery = `SELECT * FROM user_master where is_deleted = 0 AND email = '${apiData.email}'`;
            let existingRecords = await DBManager.runQuery(existingRecordsQuery);
            if (existingRecords.length) {

                let otp_generate_time = moment().subtract(2, 'minutes').format("YYYY-MM-DD HH:mm:ss");
                if (existingRecords[0].otp_generate_time && existingRecords[0].otp_generate_time >= otp_generate_time) {
                    if (existingRecords[0].otp && existingRecords[0].otp == apiData.otp) {

                        let userResult = existingRecords[0];
                        let user = {
                            id: userResult['user_id'],
                            username: userResult['username'],
                            email: userResult['email'] || '',
                            first_name: userResult['first_name'],
                            last_name: userResult['last_name'],
                            is_email_verified: userResult["is_email_verified"],
                            is_zone_owner: userResult['is_zone_owner']
                        };

                        let token = await utils.createJWT(user);
                        let responseData = {
                            user_id: userResult["user_id"],
                            email: userResult["email"],
                            username: userResult["username"],
                            first_name: userResult["first_name"],
                            last_name: userResult["last_name"],
                            profile_pic: userResult["profile_pic"],
                            about_you: userResult["about_you"],
                            city: userResult["city"],
                            city_lat: userResult["city_lat"],
                            city_long: userResult["city_long"],
                            quickblox_id: userResult["quickblox_id"].toString(),
                            current_plan: userResult["current_plan"],
                            stripe_account_id: userResult["stripe_account_id"],
                            stripe_customer_id: userResult["stripe_customer_id"],
                            is_verified: userResult["is_verified"],
                            charges_enabled: userResult["charges_enabled"],
                            payouts_enabled: userResult["payouts_enabled"],
                            country_code: userResult['country_code'],
                            mobile_number: userResult['mobile_number'],
                            is_email_verified: userResult['is_email_verified'],
                            logo: userResult['logo'],
                            website_name: userResult['website_name'],
                            url: userResult['url'],
                            is_zone_owner: userResult['is_zone_owner'],
                            token
                        };

                        return await DBManager.dataUpdate('user_master', {
                            is_otp_verified: 1
                        }, { email: apiData.email }).then(async () => {
                            if (apiData.verify_type == 'forgotpassword') {
                                response.success = true;
                                response.data = responseData;
                                response.message = successMessages.VERIFIED;
                                return awsRequestHelper.respondWithJsonBody(200, response);
                            } else {
                                response.success = true;
                                response.data = responseData;
                                response.message = successMessages.OTP_VERIFIED;
                                return awsRequestHelper.respondWithJsonBody(200, response);
                            }
                        })
                    }
                    response.message = errorMessages.INVALID_OTP;
                    return awsRequestHelper.respondWithJsonBody(200, response);
                } else {
                    response.message = errorMessages.OTP_EXPIRED;
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }
            }
            response.message = errorMessages.USER_NOT_EXISTS_WITH_GIVEN_MOBILE_AND_COUNTRY_CODE;
            return awsRequestHelper.respondWithJsonBody(200, response);
        } else {

            await validate(apiData);

            let countryCode = apiData.country_code;
            if (!countryCode.startsWith("0")) {
                countryCode = "0" + countryCode;
            }

            if (apiData.verify_type == 'editprofile') {
                let user = await utils.verifyUser(event.headers.Authorization);
                let userId = user.id;

                let existingRecordsQuery = `SELECT count(*) as totalCount FROM user_master where (mobile_number = '${apiData.mobile_number}' AND country_code = '${countryCode}') AND user_id != ${userId}`;
                let existingRecords = await DBManager.runQuery(existingRecordsQuery);
                if (!existingRecords[0].totalCount) {
                    let getUserQuery = `SELECT * FROM user_master where user_id = ${userId}`;
                    let loggedUser = await DBManager.runQuery(getUserQuery);
                    if (loggedUser.length) {
                        let otp_generate_time = moment().subtract(2, 'minutes').format("YYYY-MM-DD HH:mm:ss");
                        if (loggedUser[0].otp_generate_time && loggedUser[0].otp_generate_time >= otp_generate_time) {
                            if (loggedUser[0].is_otp_verified && loggedUser[0].is_otp_verified == 0) {
                                if (loggedUser[0].otp && loggedUser[0].otp == apiData.otp) {
                                    let updateValue = {
                                        is_otp_verified: 1,
                                        mobile_number: apiData.mobile_number,
                                        country_code: countryCode
                                    };
                                    return await DBManager.dataUpdate('user_master', updateValue, { user_id: userId }).then(async () => {
                                        let userUpdatedData = await DBManager.runQuery(getUserQuery);
                                        let responseData = {
                                            user_id: userUpdatedData[0]["user_id"],
                                            email: userUpdatedData[0]["email"],
                                            username: userUpdatedData[0]["username"],
                                            first_name: userUpdatedData[0]["first_name"],
                                            last_name: userUpdatedData[0]["last_name"],
                                            profile_pic: userUpdatedData[0]["profile_pic"],
                                            about_you: userUpdatedData[0]["about_you"],
                                            city: userUpdatedData[0]["city"],
                                            city_lat: userUpdatedData[0]["city_lat"],
                                            city_long: userUpdatedData[0]["city_long"],
                                            quickblox_id: userUpdatedData[0]["quickblox_id"].toString(),
                                            current_plan: userUpdatedData[0]["current_plan"],
                                            stripe_account_id: userUpdatedData[0]["stripe_account_id"],
                                            stripe_customer_id: userUpdatedData[0]["stripe_customer_id"],
                                            is_verified: userUpdatedData[0]["is_verified"],
                                            charges_enabled: userUpdatedData[0]["charges_enabled"],
                                            payouts_enabled: userUpdatedData[0]["payouts_enabled"],
                                            country_code: userUpdatedData[0]['country_code'],
                                            mobile_number: userUpdatedData[0]['mobile_number'],
                                            logo: userUpdatedData[0]['logo'],
                                            website_name: userUpdatedData[0]['website_name'],
                                            url: userUpdatedData[0]['url'],
                                        };

                                        response.success = true;
                                        response.data = responseData;
                                        response.message = successMessages.OTP_VERIFIED_MOBILE_NO_UPDATED;
                                        return awsRequestHelper.respondWithJsonBody(200, response);
                                    })
                                } else {
                                    response.message = errorMessages.INVALID_OTP;
                                    return awsRequestHelper.respondWithJsonBody(200, response);
                                }
                            } else {
                                await DBManager.dataUpdate('user_master', {
                                    mobile_number: apiData.mobile_number,
                                    country_code: countryCode
                                }, { user_id: userId })
                                let userUpdatedData = await DBManager.runQuery(getUserQuery);
                                let responseData = {
                                    user_id: userUpdatedData[0]["user_id"],
                                    email: userUpdatedData[0]["email"],
                                    username: userUpdatedData[0]["username"],
                                    first_name: userUpdatedData[0]["first_name"],
                                    last_name: userUpdatedData[0]["last_name"],
                                    profile_pic: userUpdatedData[0]["profile_pic"],
                                    about_you: userUpdatedData[0]["about_you"],
                                    city: userUpdatedData[0]["city"],
                                    city_lat: userUpdatedData[0]["city_lat"],
                                    city_long: userUpdatedData[0]["city_long"],
                                    quickblox_id: userUpdatedData[0]["quickblox_id"].toString(),
                                    current_plan: userUpdatedData[0]["current_plan"],
                                    stripe_account_id: userUpdatedData[0]["stripe_account_id"],
                                    stripe_customer_id: userUpdatedData[0]["stripe_customer_id"],
                                    is_verified: userUpdatedData[0]["is_verified"],
                                    charges_enabled: userUpdatedData[0]["charges_enabled"],
                                    payouts_enabled: userUpdatedData[0]["payouts_enabled"],
                                    country_code: userUpdatedData[0]['country_code'],
                                    mobile_number: userUpdatedData[0]['mobile_number'],
                                    logo: userUpdatedData[0]['logo'],
                                    website_name: userUpdatedData[0]['website_name'],
                                    url: userUpdatedData[0]['url'],
                                };

                                response.success = true;
                                response.data = responseData;
                                response.message = successMessages.MOBILE_ALREADY_VERIFIED;
                                return awsRequestHelper.respondWithJsonBody(200, response);
                            }
                        } else {
                            response.message = errorMessages.OTP_EXPIRED;
                            return awsRequestHelper.respondWithJsonBody(200, response);
                        }
                    } else {
                        response.message = errorMessages.INCORRECT_USER_OR_UNAUTHORIZED;
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    }
                } else {
                    response.message = errorMessages.ALREADY_REGISTERED_MOBILE_NUMBER_AND_COUNTRY_CODE;
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }
            } else {
                //check record exists
                let existingRecordsQuery = `SELECT * FROM user_master where (mobile_number = '${apiData.mobile_number}' AND country_code = '${countryCode}')`;
                let existingRecords = await DBManager.runQuery(existingRecordsQuery);
                if (existingRecords.length) {
                    let userResult = existingRecords[0];
                    let user = {
                        id: userResult['user_id'],
                        username: userResult['username'],
                        email: userResult['email'] || '',
                        first_name: userResult['first_name'],
                        last_name: userResult['last_name'],
                        is_email_verified: userResult["is_email_verified"],
                        is_zone_owner: userResult['is_zone_owner']
                    };

                    let token = await utils.createJWT(user);
                    let responseData = {
                        user_id: userResult["user_id"],
                        email: userResult["email"],
                        username: userResult["username"],
                        first_name: userResult["first_name"],
                        last_name: userResult["last_name"],
                        profile_pic: userResult["profile_pic"],
                        about_you: userResult["about_you"],
                        city: userResult["city"],
                        city_lat: userResult["city_lat"],
                        city_long: userResult["city_long"],
                        quickblox_id: userResult["quickblox_id"].toString(),
                        current_plan: userResult["current_plan"],
                        stripe_account_id: userResult["stripe_account_id"],
                        stripe_customer_id: userResult["stripe_customer_id"],
                        is_verified: userResult["is_verified"],
                        charges_enabled: userResult["charges_enabled"],
                        payouts_enabled: userResult["payouts_enabled"],
                        country_code: userResult['country_code'],
                        mobile_number: userResult['mobile_number'],
                        is_email_verified: userResult['is_email_verified'],
                        logo: userResult['logo'],
                        website_name: userResult['website_name'],
                        url: userResult['url'],
                        is_zone_owner: userResult['is_zone_owner'],
                        token
                    };

                    let otp_generate_time = moment().subtract(2, 'minutes').format("YYYY-MM-DD HH:mm:ss");
                    if (existingRecords[0].otp_generate_time && existingRecords[0].otp_generate_time >= otp_generate_time) {
                        if (existingRecords[0].otp && existingRecords[0].otp == apiData.otp) {
                            //update record
                            return await DBManager.dataUpdate('user_master', {
                                is_otp_verified: 1
                            }, {
                                mobile_number: apiData.mobile_number
                            }).then(async () => {
                                if (apiData.verify_type == 'forgotpassword') {
                                    response.success = true;
                                    response.message = successMessages.VERIFIED;
                                    return awsRequestHelper.respondWithJsonBody(200, response);
                                } else {
                                    response.success = true;
                                    response.data = responseData;
                                    response.message = successMessages.OTP_VERIFIED;
                                    return awsRequestHelper.respondWithJsonBody(200, response);
                                }
                            })
                        }
                        response.message = errorMessages.INVALID_OTP;
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    } else {
                        response.message = errorMessages.OTP_EXPIRED;
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    }
                }
                response.message = errorMessages.USER_NOT_EXISTS_WITH_GIVEN_MOBILE_AND_COUNTRY_CODE;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
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
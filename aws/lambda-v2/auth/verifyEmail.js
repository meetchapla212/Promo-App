const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const { errorMessages, successMessages } = require("../common/constants");
const moment = require('moment');
const utils = require('./../common/utils');

const validate = function (body) {
    const schema = Joi.object().keys({
        token: Joi.string().required(),
        email: Joi.string().required(),
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
        let { token, email } = apiData;

        return await DBManager.getData("user_master", "*", { email: email }).then(async (userDetails) => {
            if (userDetails.length > 0) {
                let userData = userDetails[0];
                let otp_generate_time = moment().subtract(2, 'minutes').format("YYYY-MM-DD HH:mm:ss");
                if (userData.otp_generate_time && userData.otp_generate_time >= otp_generate_time) {
                    if (userData.email_token && userData.email_token == token) {
                        let user = {
                            id: userData['user_id'],
                            username: userData['username'],
                            email: userData['email'] || '',
                            first_name: userData['first_name'],
                            last_name: userData['last_name'],
                            is_email_verified: userData["is_email_verified"],
                            is_zone_owner: userData['is_zone_owner']
                        };

                        let token = await utils.createJWT(user);
                        let responseData = {
                            user_id: userData["user_id"],
                            email: userData["email"],
                            username: userData["username"],
                            first_name: userData["first_name"],
                            last_name: userData["last_name"],
                            profile_pic: userData["profile_pic"],
                            about_you: userData["about_you"],
                            city: userData["city"],
                            city_lat: userData["city_lat"],
                            city_long: userData["city_long"],
                            quickblox_id: userData["quickblox_id"].toString(),
                            current_plan: userData["current_plan"],
                            stripe_account_id: userData["stripe_account_id"],
                            stripe_customer_id: userData["stripe_customer_id"],
                            is_verified: userData["is_verified"],
                            charges_enabled: userData["charges_enabled"],
                            payouts_enabled: userData["payouts_enabled"],
                            country_code: userData['country_code'],
                            mobile_number: userData['mobile_number'],
                            is_email_verified: userData['is_email_verified'],
                            logo: userData['logo'],
                            website_name: userData['website_name'],
                            url: userData['url'],
                            is_zone_owner: userData['is_zone_owner'],
                            token
                        };
                
                        await DBManager.dataUpdate('user_master', { is_email_verified: 1 }, { email: email });
                        response.success = true;
                        response.data = responseData;
                        response.message = successMessages.EMAIL_VERIFIED;
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    } else {
                        response.success = false;
                        response.message = errorMessages.INVALID_OTP;
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    }
                } else {
                    response.success = false;
                    response.message = errorMessages.OTP_EXPIRED;
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }
            } else {
                response.success = false;
                response.message = errorMessages.USER_NOT_FOUND_WITH_GIVEN_EMAIL;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
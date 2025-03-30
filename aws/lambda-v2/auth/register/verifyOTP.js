"use strict";
const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const DBM = require("../../common/mysqlmanager");
const DBManager = new DBM();
const Joi = require("joi");
const utils = require("../../common/utils");
const moment = require('moment');
const {
    errorMessages,
    successMessages,
    singupTypes
} = require("../../common/constants");

var AWS = require("aws-sdk");
//us-east-1
AWS.config.update({
    region: "us-east-1",
});

const preValidate = async (body) => {
    const schema = Joi.object().keys({
        email: Joi.string().when("signup_type", {
            is: Joi.equal(1),
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
        mobile_number: Joi.string().when("signup_type", {
            is: Joi.equal(2),
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
        country_code: Joi.string().when("signup_type", {
            is: Joi.equal(2),
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
        signup_type: Joi.number().required(),
        otp: Joi.number().required(),
    });
    return await Joi.validate(body, schema, { abortEarly: false });
};

// handler
module.exports.handler = async function (event, context, callback) {
    let response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN
    };
    try {
        let apiData = JSON.parse(event.body);

        // validate data
        const validationErrors = await preValidate(apiData);
        if (validationErrors.error) {
            return awsRequestHelper.respondWithJsonBody(422, { ...response, message: errorMessages.VALIDATION_ERROR });
        }

        // destructure validated apiData
        const { country_code, mobile_number, email, signup_type, otp } = apiData;

        let whereQuery;
        if (signup_type == singupTypes.SIGNUP_WITH_EMAIL) {
            whereQuery = ` AND email = '${email}'`
        } else {
            let countryCode = country_code;
            if (!country_code.startsWith("0")) {
                countryCode = "0" + country_code;
            }
            if (countryCode) {
                whereQuery = ` AND mobile_number = '${mobile_number}' AND country_code = '${countryCode}'`
            } else {
                whereQuery = ` AND mobile_number = '${mobile_number}'`
            }
        }

        let getUserQuery = `SELECT is_otp_verified, otp, otp_generate_time FROM user_contact_verification where is_deleted = 0 ${whereQuery}`;
        let existingRecords = await DBManager.runQuery(getUserQuery);
        if (existingRecords && existingRecords.length) {
            let otp_generate_time = moment().subtract(2, 'minutes').format("YYYY-MM-DD HH:mm:ss");
            if (existingRecords[0].otp_generate_time && existingRecords[0].otp_generate_time >= otp_generate_time) {

                response.signup_type = apiData.signup_type;
                let whereObject = {
                    otp,
                    is_otp_verified: 0,
                };
                let additionalWhereParams = {};

                // signup with mobile
                if (signup_type == singupTypes.SIGNUP_WITH_MOBILE) {
                    // picked from previous code
                    let countryCode = country_code;
                    if (!country_code.startsWith("0")) {
                        countryCode = "0" + country_code;
                    }
                    // we use mobile_numbre and country_code to match user
                    additionalWhereParams = { mobile_number, country_code: countryCode };
                } else if (signup_type == singupTypes.SIGNUP_WITH_EMAIL) {
                    // we use email to find the column to match
                    additionalWhereParams = { email };
                } else if (signup_type != singupTypes.SIGNUP_WITH_EMAIL && signup_type != singupTypes.SIGNUP_WITH_MOBILE) {
                    // bad signup type
                    return awsRequestHelper.respondWithJsonBody(400, { ...response, message: errorMessages.INVALID_SIGNUP_TYPE });
                }

                // if details match, set is_otp_verified as 1
                const verifyOTP = await DBManager.dataUpdate(
                    "user_contact_verification",
                    { is_otp_verified: 1 },
                    { ...whereObject, ...additionalWhereParams }
                );
                // affected rown means data matched and fields were updated
                if (verifyOTP.affectedRows) {
                    // create JWT
                    const token = utils.createJWT({
                        ...additionalWhereParams,
                        unfinishedRegistration: true, // helper variable for next step
                    });

                    // biuld response and send
                    const successResponse = {
                        success: true,
                        message: successMessages.OTP_VERIFIED,
                        token,
                    };
                    return awsRequestHelper.respondWithJsonBody(200, successResponse);
                }
                return awsRequestHelper.respondWithJsonBody(200, { ...response, ...apiData, message: errorMessages.INCORRECT_USER_OR_OTP });
            } else {
                response.message = errorMessages.OTP_EXPIRED;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        } else {
            response.message = errorMessages.INCORRECT_USER_OR_UNAUTHORIZED;
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
};
// @ts-check
"use strict";
const fs = require("fs");
const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const AWSManager = require("../../common/awsmanager");
const DBM = require("../../common/mysqlmanager");
const DBManager = new DBM();
const Joi = require("joi");
const _ = require("lodash");
var AWS = require("aws-sdk");
const { errorMessages, successMessages, smsMessages, singupTypes, emailAndPushNotiTitles } = require("../../common/constants");
const moment = require('moment');

// helper functions
const { generateOTP } = require("./generateOTP");
// Set region
AWS.config.update({
    region: "us-east-1",
});
//us-east-1
var sns = new AWS.SNS({ region: "us-east-1" })
// .listTopics()
// .promise();

// sns.then(function(data) {
//     console.log("Topic ARN is " + data);
//     console.log(data);
// }).catch(
//     function(error) {
//     console.error(error, error.stack);
// });

const setSMSAttributesFunction = async () => {
    return new Promise(async (resolve, reject) => {
        await sns.setSMSAttributes({
            attributes: {
                // DeliveryStatusIAMRole: "arn:aws:sns:eu-west-1:576180419135:dynamodb",
                DefaultSenderID: "TMPROMO2CCD",
                DefaultSMSType: "Transactional",
            },
        }, (error, data) => {
            if (error) {
                console.error("error : ", error);
                reject(error);
            }
            resolve(data);
        });
    });
};

const sendOtpToUser = async (params) => {
    console.log("sendOtpToUser : ", params);
    return new Promise(async (resolve, reject) => {
        await sns.publish(params, async (error, data) => {
            if (error) {
                console.error("error : ", error);
                reject(error);
            }
            console.log("Sending Otp success", data);
            resolve(data);
        });
    });
};

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
    });

    return await Joi.validate(body, schema, { abortEarly: false });
};

const sendEmailVerificationMail = async (otp, userData) => {
    let tmpl = fs.readFileSync("./lambda/emailtemplates/verify-emailv2.html", "utf8");
    let mailSubject = emailAndPushNotiTitles.VERIFY_EMAIL;
    let templateVars = Object.assign({
        base_url: process.env.UI_BASE_URL,
        name: userData.email,
        otp,
    }, AWSManager.MAIL_PARAMS);

    let mailBody = _.template(tmpl)(templateVars);
    return await AWSManager.sendEmail([userData.email], mailBody, mailSubject);
};

// handler
module.exports.handler = async function (event, context, callback) {
    let response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };

    try {
        let apiData = JSON.parse(event.body);

        // validate data
        const validationErrors = await preValidate(apiData);
        if (validationErrors.error) {
            return awsRequestHelper.respondWithJsonBody(422, { ...response, message: errorMessages.VALIDATION_ERROR });
        }

        // destructure validated apiData
        const { country_code, mobile_number, email, signup_type } = apiData;
        response.signup_type = apiData.signup_type;

        // generate OTP to be sent for verification
        const otp = generateOTP();

        // signup with mobile
        if (signup_type == singupTypes.SIGNUP_WITH_MOBILE) {
            // after Joi validation we assume if
            // signup_type is 2, mobile number and country code already exist

            // picked from previous code
            let countryCode = country_code;
            if (!country_code.startsWith("0")) {
                countryCode = "0" + country_code;
            }

            // check if user already exists -- destructure response array
            const [existingUsers] = await DBManager.getData("user_master", "COUNT(1) as count", {
                mobile_number, country_code: countryCode,
            });
            // if user already exists, return error
            if (existingUsers.count) {
                return awsRequestHelper.respondWithJsonBody(303, { ...response, message: errorMessages.USER_ALREADY_EXISTS });
            }

            // NOTE: We do not check the user_contact_verification
            // table for already existing data because of UNIQUE constraint
            // optimistically assuming it will throw error in the next step if there's duplicate

            // add new user to the database
            const unverifiedUser = {
                mobile_number,
                country_code: countryCode,
                otp,
                is_otp_verified: 0,
                otp_generate_time: moment().format("YYYY-MM-DD HH:mm:ss")
            };

            // This throws error in case of duplicate entries
            const existingRecords = await DBManager.getData("user_contact_verification", "COUNT(*) as totalCount", { mobile_number, country_code: countryCode });
            if (existingRecords[0].totalCount) {
                await DBManager.dataUpdate("user_contact_verification", unverifiedUser, {
                    mobile_number, country_code: countryCode
                });
            } else {
                await DBManager.dataInsert("user_contact_verification", unverifiedUser);
            }

            await setSMSAttributesFunction();
            // send OTP after user is successfully added
            return await sendOtpToUser({
                Message: otp + smsMessages.OTP_FOR_SIGNUP,
                PhoneNumber: `+${countryCode}${mobile_number}`
            }).then(async (data) => {
                // send success response
                let successResponse = {
                    success: true,
                    message: successMessages.VERIFY_MOBILE_OTP_SENT
                };
                return awsRequestHelper.respondWithJsonBody(200, successResponse);
            }).catch((error) => {
                console.error("error : ", error);
                response.message = error.message;
                return awsRequestHelper.respondWithJsonBody(error.statusCode, response);
            });
        } else if (signup_type == singupTypes.SIGNUP_WITH_EMAIL) {
            // check if user already exists
            const [existingUsers] = await DBManager.getData("user_master", "COUNT(1) as count", {
                email,
            });
            // if user already exists, return error
            if (existingUsers.count) {
                return awsRequestHelper.respondWithJsonBody(303, { ...response, message: errorMessages.USER_ALREADY_EXISTS });
            }

            //add new user to database
            const unverifiedUser = {
                email,
                otp,
                otp_generate_time: moment().format("YYYY-MM-DD HH:mm:ss")
            };

            const existingRecords = await DBManager.getData("user_contact_verification", "COUNT(*) as totalCount", { email: email, is_deleted: 0 });
            if (existingRecords[0].totalCount) {
                await DBManager.dataUpdate("user_contact_verification", unverifiedUser, { email: email, is_deleted: 0 });
            } else {
                await DBManager.dataInsert("user_contact_verification", unverifiedUser);
            }

            const emailData = {
                email,
            };
            // send email to user
            await sendEmailVerificationMail(otp, emailData);

            // send success response
            let successResponse = {
                success: true,
                message: successMessages.ENTER_OTP_TO_VERIFY_EMAIL
            };
            return awsRequestHelper.respondWithJsonBody(200, successResponse);
        } else {
            return awsRequestHelper.respondWithJsonBody(400, { ...response, message: errorMessages.INVALID_SIGNUP_TYPE });
        }
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (response.message.includes("Duplicate entry")) {
            response.message = errorMessages.USER_ALREADY_EXISTS;
        }
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
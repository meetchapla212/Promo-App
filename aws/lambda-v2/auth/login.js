"use strict";
var md5 = require("md5");
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const DBManager = new DBM();
const _ = require("lodash");
const utils = require("./../common/utils");
const Joi = require("joi");
const QBM = require("./../common/qbmanager");
const fs = require("fs");
const awsManager = require("../common/awsmanager");
const QBMObject = new QBM();
const moment = require("moment");
let QbSessionToken = "";
var AWS = require("aws-sdk");

const {
    errorMessages,
    successMessages,
    smsMessages,
    emailAndPushNotiTitles
} = require("../common/constants");

// Set region
AWS.config.update({
    region: "us-east-1",
});
//us-east-1
var sns = new AWS.SNS({ region: "us-east-1" });

const validate = function (body) {
    const schema = Joi.object().keys({
        email: Joi.string().allow("").optional(),
        mobile_number: Joi.string().allow("").optional(),
        country_code: Joi.string().allow("").optional(),
        password: Joi.string().required(),
        signin_type: Joi.string().required(),
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
        }, function (error, value) {
            if (error) {
                reject({
                    status_code: 400,
                    message: error.details[0].message,
                });
            } else {
                resolve(value);
            }
        });
    });
};

function getLastUserVisitTimeDiff(lastUserVisitTime, currentTime) {
    var diff = Math.abs(lastUserVisitTime - currentTime) / 1000;
    var days = Math.floor(diff / 86400);
    var hours = parseFloat((diff / 3600) % 24).toFixed(2) * 1;
    var minutes = Math.round(((diff % 86400) % 3600) / 60);
    return {
        days: days,
        hours: hours,
        minutes: minutes,
    };
}

const generateOTP = () => {
    var digits = "0123456789";
    var otpLength = 6;
    var otp = "";
    for (let i = 1; i <= otpLength; i++) {
        var index = Math.floor(Math.random() * digits.length);
        otp = otp + digits[index];
    }
    return otp;
};

const setSMSAttributesFunction = async () => {
    return new Promise(async (resolve, reject) => {
        await sns.setSMSAttributes({
            attributes: {
                DefaultSenderID: "TMPROMO2CCD",
                DefaultSMSType: "Transactional",
            },
        }, (error, data) => {
            if (error) {
                reject(error);
            }
            resolve(data);
        });
    });
};

const sendOtpToUser = async (params) => {
    return new Promise(async (resolve, reject) => {
        await sns.publish(params, async (error, data) => {
            if (error) {
                reject(error);
            }
            resolve(data);
        });
    });
};

module.exports.handler = async function (event, context, callback) {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };
    try {
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        if (!("mobile_number" in apiData) && !("email" in apiData)) {
            response.message = errorMessages.REQUIRE_MOBILE_NUMBER_OR_EMAIL;
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        if ("mobile_number" in apiData && apiData.mobile_number !== "" && "email" in apiData && apiData.email !== "") {
            response.message = errorMessages.BOTH_NOT_ALLOWED_MOBILE_NUMBER_AND_EMAIL;
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        if ("mobile_number" in apiData && apiData.mobile_number == "" && "email" in apiData && apiData.email == "") {
            response.message = errorMessages.REQUIRE_MOBILE_NUMBER_OR_EMAIL;
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        if (apiData && "signin_type" in apiData && apiData.signin_type == "2") {
            response.signin_type = apiData.signin_type;
            let userPassword = md5(apiData["password"]);

            if (!("mobile_number" in apiData) || apiData.mobile_number == "") {
                response.message = errorMessages.REQUIRE_MOBILE_NUMBER;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }

            const { country_code, mobile_number } = apiData;

            let countryCode = country_code;
            if (countryCode && !countryCode.startsWith("0")) {
                countryCode = "0" + countryCode;
            }

            let existingRecordsQuery = `SELECT * FROM user_master where mobile_number = '${apiData.mobile_number}' AND country_code = '${countryCode}' AND is_deleted = 0`;

            // country code is not mandatory on login #/tasks/27824227
            // change existingRecordsQuery to only use mobile number if no country_code is provided
            // maybe we can do this dynamically in the future using spread operator?
            if (!country_code) {
                existingRecordsQuery = `SELECT * FROM user_master where mobile_number = ${mobile_number} AND is_deleted = 0`;
            }
            let existingRecords = await DBManager.runQuery(existingRecordsQuery);

            // case: more than 2 records with same number returned when no country_code provided
            // throw country code required error
            if (existingRecords.length && existingRecords.length > 1 && !country_code) {
                response.message = errorMessages.REQUIRE_COUNTRY_CODE;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
            if (existingRecords.length) {
                //if otp more than 30 day old then need to reverify
                var otpGenerateDate = existingRecords[0].otp_generate_time;
                var userLastVisitedDateTime = new Date(otpGenerateDate);
                var currentTime = new Date();
                if (currentTime > userLastVisitedDateTime) {
                    var lastVisitLeftTime = getLastUserVisitTimeDiff(userLastVisitedDateTime, currentTime);
                    var lastVisitLeftDays = lastVisitLeftTime.days;
                    // var lastVisitLeftHours = lastVisitLeftTime.hours;
                    // var lastVisitedLeftMinutes = lastVisitLeftTime.minutes
                    // if (lastVisitLeftDays > 30) {
                    if (lastVisitLeftDays > 30) {
                        let oneTimePassword = generateOTP();
                        await setSMSAttributesFunction();
                        return await sendOtpToUser({
                            Message: oneTimePassword + smsMessages.OTP_FOR_SIGNIN,
                            PhoneNumber: `+${countryCode}${apiData.mobile_number}`,
                        }).then(async (data) => {
                            let updateValue = {
                                otp: oneTimePassword,
                                is_otp_verified: 0,
                                otp_generate_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                            };

                            return await DBManager.dataUpdate("user_master", updateValue, {
                                mobile_number: apiData.mobile_number,
                            }).then(async () => {
                                response.success = true;
                                response.message = successMessages.OTP_IS_EXPIRED_VERIFY_OTP_SENT;
                                return awsRequestHelper.respondWithJsonBody(200, response);
                            });
                        }).catch((error) => {
                            console.error("error : ", error);
                            response.message = error.message;
                            return awsRequestHelper.respondWithJsonBody(error.statusCode, response);
                        });
                    }
                }

                if (existingRecords[0].is_otp_verified && existingRecords[0].is_otp_verified == 0) {
                    let userResult = existingRecords[0];
                    if (userResult && userResult["password"] === userPassword) {
                        let oneTimePassword = generateOTP();
                        await setSMSAttributesFunction();
                        return await sendOtpToUser({
                            Message: oneTimePassword + smsMessages.OTP_FOR_SIGNIN,
                            PhoneNumber: `+${countryCode}${apiData.mobile_number}`,
                        }).then(async (data) => {
                            let updateValue = {
                                otp: oneTimePassword,
                                is_otp_verified: 0,
                                otp_generate_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                            };

                            return await DBManager.dataUpdate("user_master", updateValue, {
                                mobile_number: apiData.mobile_number,
                            }).then(async () => {
                                response.success = true;
                                response.message = successMessages.VERIFY_MOBILE_OTP_SENT;
                                return awsRequestHelper.respondWithJsonBody(200, response);
                            });
                        }).catch((error) => {
                            console.error("error : ", error);
                            response.message = error.message;
                            return awsRequestHelper.respondWithJsonBody(error.statusCode, response);
                        });
                    } else {
                        response.message = errorMessages.INVALID_MOBILE;
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    }
                } else {
                    //user exist and verified
                    let userResult = existingRecords[0];
                    if (userResult && userResult["password"] === userPassword) {
                        let user = {
                            id: userResult["user_id"],
                            username: userResult["username"],
                            email: userResult["email"],
                            first_name: userResult["first_name"],
                            last_name: userResult["last_name"],
                            is_email_verified: userResult["is_email_verified"],
                            //is_zone_owner: userResult['is_zone_owner']
                        };

                        let token = utils.createJWT(user);
                        let responseData = {
                            user_id: userResult["user_id"],
                            email: userResult["email"],
                            username: userResult["username"],
                            first_name: userResult["first_name"],
                            last_name: userResult["last_name"],
                            profile_pic: userResult["profile_pic"] || "",
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
                            country_code: userResult["country_code"],
                            mobile_number: userResult["mobile_number"],
                            stripe_country: userResult["stripe_country"],
                            stripe_defualt_card: userResult["stripe_defualt_card"],
                            logo: userResult["logo"],
                            website_name: userResult["website_name"],
                            url: userResult["url"],
                            //is_zone_owner: userResult['is_zone_owner'],
                            token,
                        };

                        responseData.is_zone_owner = false;
                        responseData.is_zone_member = false;
                        await DBManager.getData("admin_zoneowner_invitation_requests", "count(*) as totalCount", {
                            user_id: responseData.user_id,
                            request_status: 1,
                            is_deleted: 0,
                            is_block: 0,
                        }).then((resZoneAdmin) => {
                            if (resZoneAdmin[0].totalCount) {
                                responseData.is_zone_owner = true;
                            }
                        });
                        await DBManager.getData("member_zonemember_invitation_requests", "count(*) as totalCount", {
                            user_id: responseData.user_id,
                            request_status: 1,
                            is_deleted: 0,
                            is_block: 0,
                        }).then((resZoneAdminMember) => {
                            if (resZoneAdminMember[0].totalCount) {
                                responseData.is_zone_member = true;
                            }
                        });
                        response = {
                            success: true,
                            signin_type: apiData.signin_type,
                            message: successMessages.SUCCESS_LOGIN,
                            data: responseData,
                        };
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    } else {
                        response.message = errorMessages.INVALID_MOBILE;
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    }
                }
            } else {
                response.message = errorMessages.USER_NOT_EXISTS_WITH_GIVEN_MOBILE_AND_COUNTRY_CODE;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        } else if (apiData && "signin_type" in apiData && apiData.signin_type == "1") {
            response.signin_type = apiData.signin_type;
            var password = md5(apiData["password"]);

            if (!("email" in apiData) || apiData.email == "") {
                response.message = errorMessages.EMAIL_REQUIRED;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }

            let emailLogin = {
                email: apiData["email"],
            };
            let isAuth = false;

            let resultEmail = await DBManager.getData("user_master", "*", emailLogin);
            if (resultEmail && resultEmail.length > 0) {
                var userResult = resultEmail[0];
                isAuth = true;
            }

            if (isAuth) {
                if (userResult["is_old_user"] == 1) {
                    let user = {
                        id: userResult["user_id"],
                        username: userResult["username"],
                        email: userResult["email"],
                        first_name: userResult["first_name"],
                        last_name: userResult["last_name"],
                        is_email_verified: userResult["is_email_verified"],
                        //is_zone_owner: userResult['is_zone_owner']
                    };
                    let token = await utils.createJWT(user);
                    let tmpl = fs.readFileSync("./lambda-v2/emailTemplates/reset-password.html", "utf8");
                    let templateVars = {
                        base_url: process.env.UI_BASE_URL,
                        resetPasswordUrl: `${process.env.RESET_PASSWORD_URL}?token=${token}`,
                        name: utils.toTitleCase(
                            user.first_name && user.last_name ? user.first_name + " " + user.last_name : user.username
                        ),
                        title: emailAndPushNotiTitles.RESET_PASSWORD,
                    };
                    let body = _.template(tmpl)(templateVars);
                    if (user.email && user.email !== "" && user.is_email_verified && user.is_email_verified == 1) {
                        var toAddress = new Array(user.email);
                        awsManager.sendEmail(toAddress, body, emailAndPushNotiTitles.RESET_PASSWORD, process.env.FROM);
                    }
                    response = {
                        success: false,
                        signin_type: apiData.signin_type,
                        message: errorMessages.PASSWORD_IS_TOO_OLD_PLEASE_RESET_PASSWORD,
                    };
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }

                if (userResult && userResult["password"] === password) {
                    let user = {
                        id: userResult["user_id"],
                        username: userResult["username"],
                        email: userResult["email"],
                        first_name: userResult["first_name"],
                        last_name: userResult["last_name"],
                        is_email_verified: userResult["is_email_verified"],
                        //is_zone_owner: userResult["is_zone_owner"]
                    };

                    let token = utils.createJWT(user);
                    if (userResult["quickblox_id"] == "") {
                        let quickBloxSession = await QBMObject.session();
                        QbSessionToken = quickBloxSession.token;
                        let QBuserDetails = await QBMObject.createUser(
                            "users", {
                            user: {
                                full_name: user.username,
                                login: user.username,
                                password: "thepromoappqb",
                            },
                        },
                            QbSessionToken
                        );
                        userResult.quickblox_id = QBuserDetails.user.id;
                        await DBManager.dataUpdate("user_master", {
                            quickblox_id: QBuserDetails.user.id
                        }, {
                            user_id: userResult["user_id"]
                    });
                    }
                    let responseData = {
                        user_id: userResult["user_id"],
                        email: userResult["email"],
                        username: userResult["username"],
                        first_name: userResult["first_name"],
                        last_name: userResult["last_name"],
                        profile_pic: userResult["profile_pic"] || "",
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
                        country_code: userResult["country_code"],
                        mobile_number: userResult["mobile_number"],
                        is_email_verified: userResult["is_email_verified"],
                        stripe_country: userResult["stripe_country"],
                        stripe_defualt_card: userResult["stripe_defualt_card"],
                        logo: userResult["logo"],
                        website_name: userResult["website_name"],
                        url: userResult["url"],
                        //is_zone_owner: userResult['is_zone_owner'],
                        token,
                    };
                    responseData.is_zone_owner = false;
                    responseData.is_zone_member = false;
                    await DBManager.getData("admin_zoneowner_invitation_requests", "count(*) as totalCount", {
                        user_id: responseData.user_id,
                        request_status: 1,
                        is_deleted: 0,
                        is_block: 0,
                    }).then((resZoneAdmin) => {
                        if (resZoneAdmin[0].totalCount) {
                            responseData.is_zone_owner = true;
                        }
                    });

                    await DBManager.getData("member_zonemember_invitation_requests", "count(*) as totalCount", {
                        user_id: responseData.user_id,
                        request_status: 1,
                        is_deleted: 0,
                        is_block: 0,
                    }).then((resZoneAdminMember) => {
                        if (resZoneAdminMember[0].totalCount) {
                            responseData.is_zone_member = true;
                        }
                    });
                    response = {
                        success: true,
                        signin_type: apiData.signin_type,
                        message: successMessages.LOGIN_SUCCESS,
                        data: responseData,
                    };
                    return awsRequestHelper.respondWithJsonBody(200, response);
                } else {
                    response.message = errorMessages.INVALID_PASSWORD;
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }
            } else {
                response.message = errorMessages.INVALID_EMAIL;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        } else {
            response.message = errorMessages.INVALID_SIGNIN_TYPE;
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
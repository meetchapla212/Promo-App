"use strict";
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const DBManager = new DBM();
const AWSManager = require("../common/awsmanager");
const Joi = require("joi");
const utils = require("../common/utils");
const moment = require("moment");
const FILE_PATH = __filename;
const {
    errorMessages,
    stringMessages,
    successMessages,
    emailAndPushNotiTitles
} = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        first_name: Joi.string().allow(""),
        last_name: Joi.string().allow(""),
        city: Joi.string().allow(""),
        city_lat: Joi.string().allow(""),
        city_long: Joi.string().allow(""),
        username: Joi.string().allow(""),
        about_you: Joi.string().allow(""),
        profile_pic: Joi.string(),
        email: Joi.string().allow(""),
        logo: Joi.string().optional().allow(""),
        website_name: Joi.string().optional().allow(""),
        url: Joi.string().optional().allow(""),
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
            allowUnknown: true,
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
};

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await DBManager.getData("app_token_master", "token", {
        _user_id: userId,
    });
    return userDeviceTokenData;
};

//When the user updates his profile
const notifyUserOnProfileUpdate = async (user) => {
    var userDeviceTokenData = await getUserDeviceToken(user.user_id);
    let profileUpdateTime = moment().format("YYYY-MM-DD HH:mm:ss");
    let userName = utils.toTitleCase(user.first_name && user.last_name ? user.first_name + " " + user.last_name : user.username);
    
    let PROFILE_HAS_BEEN_UPDATED = emailAndPushNotiTitles.PROFILE_HAS_BEEN_UPDATED;
    PROFILE_HAS_BEEN_UPDATED = PROFILE_HAS_BEEN_UPDATED
        .replace('<profileUpdateTime>', profileUpdateTime)
        .replace('<userName>', userName);

    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.PROFILE_UPDATED,
            body: PROFILE_HAS_BEEN_UPDATED,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM,
            },
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: user.user_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({
            messageFrom: stringMessages.PROMO_TEAM,
        }),
        notify_user_id: user.user_id,
        notify_text: PROFILE_HAS_BEEN_UPDATED,
    };

    return await DBManager.dataInsert("user_notification", saveObj);
};

module.exports.handler = async function (event, context, callback) {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };
    try {
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        let whereQry = { user_id: user["id"] };
        let loggedUserDetails = await DBManager.getData("user_master", "user_id, first_name, last_name, username", whereQry);
        if (loggedUserDetails && loggedUserDetails.length) {
            let checkUserQuery = `SELECT count(*) as totalCount FROM user_master WHERE is_deleted = 0 AND user_id != ${user.id} AND username LIKE '${apiData.username}'`;
            let checkUserName = await DBManager.runQuery(checkUserQuery);
            if (checkUserName[0].totalCount) {
                response = {
                    success: false,
                    message: errorMessages.USERNAME_ALREADY_HAS_BEEN_USED
                };
                return awsRequestHelper.respondWithJsonBody(200, response);
            }

            if (apiData.email && apiData.email !== "") {
                let checkUserEmailQuery = `SELECT count(*) as totalCount FROM user_master
                    WHERE is_deleted = 0 AND user_id != ${user.id} AND email LIKE '${apiData.email}'`;
                let checkUserEmail = await DBManager.runQuery(checkUserEmailQuery);
                
                console.log("checkUserEmail : ", checkUserEmail);

                if (checkUserEmail[0].totalCount) {
                    response = {
                        success: false,
                        message: errorMessages.EMAIL_ALREADY_HAS_BEEN_USED
                    };
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }
            }

            await DBManager.dataUpdate("user_master", apiData, whereQry);
            let resultData = await DBManager.getData("user_master", "*", whereQry);

            var userResult = resultData[0];
            let responseData = {
                email: userResult["email"],
                username: userResult["username"],
                first_name: userResult["first_name"],
                last_name: userResult["last_name"],
                profile_pic: userResult["profile_pic"],
                about_you: userResult["about_you"],
                city: userResult["city"],
                city_lat: userResult["city_lat"],
                city_long: userResult["city_long"],
                user_id: userResult["user_id"],
                stripe_account_id: userResult["stripe_account_id"],
                stripe_customer_id: userResult["stripe_customer_id"],
                is_verified: userResult["is_verified"],
                payouts_enabled: userResult["payouts_enabled"],
                charges_enabled: userResult["charges_enabled"],
                country_code: userResult["country_code"],
                mobile_number: userResult["mobile_number"],
                logo: userResult["logo"],
                website_name: userResult["website_name"],
                url: userResult["url"],
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

            //When the user updates his profile
            await notifyUserOnProfileUpdate(loggedUserDetails[0]);

            response = {
                success: true,
                message: successMessages.PROFILE_UPDATED,
                data: responseData,
            };
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
};
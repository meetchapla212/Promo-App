// updatePaypal
"use strict";
const awsRequestHelper = require("../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const DBManager = new DBM();
const Joi = require("joi");
const utils = require("../common/utils");
const FILE_PATH = __filename;
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        paypal_email: Joi.string().allow(""),
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body,schema,{
            abortEarly: false,
        },function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
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

        // log old data if admin login
        // const { proxy_login } = user;
        // if (proxy_login) {
        //     let oldData = await DBManager.getData("user_master", "*", {
        //         user_id: user.id,
        //     });
        //     console.log(oldData);
        // }

        return await DBManager.dataUpdate("user_master", apiData, {
            user_id: user.id,
        }).then(async (data) => {
            let resultData = await DBManager.getData("user_master", "*", {
                user_id: user.id,
            });
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
                quickblox_id: userResult["quickblox_id"],
                paypal_email: userResult["paypal_email"],
                logo: userResult["logo"],
                website_name: userResult["website_name"],
                url: userResult["url"],
            };
            response = {
                success: true,
                message: successMessages.PAYPAL_EMAIL_UPDATED,
                data: responseData,
            };
            return awsRequestHelper.respondWithJsonBody(200, response);
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
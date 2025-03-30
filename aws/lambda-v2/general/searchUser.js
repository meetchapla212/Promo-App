"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        await utils.verifyUser(event.headers.Authorization);
        let parameters = event.queryStringParameters;
        let zoneId = (event.queryStringParameters && event.queryStringParameters.zone_id) ? event.queryStringParameters.zone_id : '';
        let key = (parameters && parameters.key) ? parameters.key : '';
        var fieldsObj = " `user_id`, `username`, `first_name`, `last_name`, `about_you`, `profile_pic`, `city`, `description`, `email`,`quickblox_id`, `mobile_number`, `country_code`";

        let existingRecords = await DBManager.runQuery('SELECT ' + fieldsObj + ' FROM user_master WHERE is_deleted = 0 and (username LIKE "%' + key + '%" OR email LIKE "%' + key + '%" OR city LIKE "%' + key + '%" OR about_you LIKE "%' + key + '%" )');
        if (existingRecords && existingRecords.length) {
            if (zoneId != '') {
                for (const [index, userRecord] of existingRecords.entries()) {
                    var query = `SELECT invitation_id FROM admin_zoneowner_invitation_requests where user_id = ${userRecord.user_id} and is_block = 0 and is_deleted = 0 and request_status = 1 and zone_id = ${zoneId} UNION SELECT invitation_id FROM member_zonemember_invitation_requests where user_id =${userRecord.user_id} and is_block = 0 and is_deleted = 0 and request_status = 1 and zone_id = ${zoneId}`;

                    await DBManager.runQuery(query).then(res => {
                        if (res.length <= 0) {
                            delete existingRecords[index];
                        }
                    })
                }
            }
            existingRecords = existingRecords.filter(function (el) {
                return el != null;
            });
            if (existingRecords && existingRecords.length) {
                response = { success: true, message: successMessages.GET_FOLLOWINGS_LIST, data: existingRecords };
            } else {
                response = { success: true, message: "No followers found." }
            }
            response = { success: true, message: successMessages.GET_USER_LIST, data: existingRecords };
        } else {
            response = { success: true, message: errorMessages.USER_NOT_FOUND, data: [] }
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
}
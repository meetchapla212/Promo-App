"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let userId = (event.queryStringParameters && event.queryStringParameters.userId) ? event.queryStringParameters.userId : user['id'];
        let zoneId = (event.queryStringParameters && event.queryStringParameters.zone_id) ? event.queryStringParameters.zone_id : '';
        let whereQry = { _user_id: userId };

        var fieldsObj = " user_master.user_id,user_master.quickblox_id, user_master.username, user_master.first_name, user_master.last_name, user_master.about_you, user_master.profile_pic, user_master.city, user_master.description, user_master.email, user_master.mobile_number, user_master.country_code, user_master.logo, user_master.website_name, user_master.url";

        let existingRecords = await DBManager.getJoinedData('follow_users', 'user_master', 'follow_user_id', 'user_id', fieldsObj, whereQry);
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
                response = { success: true, message: errorMessages.NO_FOLLOWINGS_FOUND }
            }
            response = { success: true, message: successMessages.GET_FOLLOWINGS_LIST, data: existingRecords };
        } else {
            response = { success: true, message: errorMessages.NO_FOLLOWINGS_FOUND }
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
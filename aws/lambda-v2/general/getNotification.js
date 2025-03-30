"use strict";
const awsRequestHelper = require("../../lambda/common/awsRequestHelper");
const MDB = require("../common/mysqlmanager");
const DBManager = new MDB();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        // var whereQry = { _user_id: user['id'] };
        var whereQry = { notify_user_id: user['id'] };
        var fieldsObj = " `_user_id`, `_parent_id`, `notify_type`, `payload_data`, `notify_user_id`, `notify_text`,`_event_id` ";

        let existingRecords = await DBManager.getData("user_notification", fieldsObj, whereQry)
        if (existingRecords && existingRecords.length) {
            response = { success: true, message: successMessages.GET_NOTIFICATION, data: existingRecords }
        } else {
            response = { success: false, message: 'No notification found!' }
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
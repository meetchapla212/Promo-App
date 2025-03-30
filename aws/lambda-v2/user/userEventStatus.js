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
        let event_id = event.pathParameters.event_id;

        let whereQry = { user_id: user['id'], event_id: event_id };
        let existingRecords = await DBManager.getData('going_users_in_event', "type_going", whereQry);
        if (existingRecords.length > 0) {
            var goingStatus = { going_status: existingRecords[0].type_going }
        } else {
            var goingStatus = { going_status: 'default' }
        }
        response = { success: true, message: successMessages.GET_USER_GOING_IN_EVENT_STATUS, data: goingStatus }
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
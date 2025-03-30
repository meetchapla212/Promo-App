"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const {
    errorMessages,
    successMessages
} = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        var datetime = new Date();
        var todayDate = datetime.toISOString().slice(0, 10);
        let sqlQuery = `SELECT * from event_master where is_deleted = 0 AND _user_id = ${user['id']} AND start_date_time <'${todayDate}'`;
        let existingRecords = await DBManager.runQuery(sqlQuery);
        if (existingRecords && existingRecords.length) {
            response = { success: true, message: successMessages.GET_PAST_EVENT_LIST, data: existingRecords };
        } else {
            response = { success: true, message: errorMessages.NO_RECORD_FOUND }
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
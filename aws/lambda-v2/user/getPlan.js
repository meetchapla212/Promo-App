"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        await utils.verifyUser(event.headers.Authorization);
        var fieldsObj = "plan_id, plan_name, price_per_month, ticketed_event, event_limit, event_claim_limit";
        let existingRecords = await DBManager.getData('plans_master', fieldsObj);
        if (existingRecords && existingRecords.length) {
            response = { success: true, message: 'Plans', data: existingRecords };
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
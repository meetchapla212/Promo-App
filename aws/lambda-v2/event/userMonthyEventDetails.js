"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const moment = require('moment');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        
        let responseData = {};
        responseData.paid_event = 0;
        responseData.claimed_event = 0;

        let user = await utils.verifyUser(event.headers.Authorization);
        let currentmonth = moment().format('M');
        
        let sqlQuery = `SELECT
            COUNT(CASE WHEN ticket_type = 'paid' then 1 ELSE NULL END) as paid_event,
            COUNT(CASE WHEN claimed_by = 692 then 1 ELSE NULL END) as claimed_event
            FROM event_master
            where MONTH(date_created) = '${currentmonth}' AND _user_id = ${user.id}`;

        let existingRecords = await DBManager.runQuery(sqlQuery);
        if(existingRecords && existingRecords.length){
            if(existingRecords[0].paid_event){
                responseData.paid_event = existingRecords[0].paid_event;
            }
            if(existingRecords[0].claimed_event){
                responseData.claimed_event = existingRecords[0].claimed_event;
            }
        }
        
        response.data = responseData;
        response.message = successMessages.GET_USER_MONTHLY_EVENT_DETAILS;
        response.success = true;
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
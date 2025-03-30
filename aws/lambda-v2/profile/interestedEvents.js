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

        let getUsersInterestedEventsQuery = `SELECT EM.*, GUIE.type_going 
            FROM going_users_in_event as GUIE JOIN event_master as EM
            ON GUIE.event_id = EM.event_id 
            WHERE user_id = ${userId} AND GUIE.is_deleted = 0 
            AND EM.is_deleted = 0 AND EM.is_draft = 0 AND (EM.status = 'active' OR EM.status = 'stop') 
            AND GUIE.type_going = "May be" 
            ORDER BY EM.start_date_time_ms`;

        let existingRecords = await DBManager.runQuery(getUsersInterestedEventsQuery);
        if (existingRecords && existingRecords.length) {
            await Promise.all(
                existingRecords.map(async data => {
                    let EventTickets = await DBManager.getData("event_tickets", "*", { _event_id: data.event_id });
                    if (EventTickets.length > 0) {
                        data.tickets_list = EventTickets;
                    } else {
                        data.tickets_list = []
                    }
                    return data;
                })
            )
            response = { success: true, message: successMessages.GET_INTERESTED_EVENTS, data: existingRecords };
        } else {
            response = { success: true, message: errorMessages.NO_EVENTS_FOUND }
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
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

        // let getUsersInterestedEventsQuery = `SELECT EM.*, GUIE.type_going 
        //     FROM going_users_in_event as GUIE JOIN event_master as EM
        //     ON GUIE.event_id = EM.event_id 
        //     WHERE user_id = ${userId} AND GUIE.is_deleted = 0 
        //     AND EM.is_deleted = 0 AND EM.is_draft = 0 AND (EM.status = 'active' OR EM.status = 'stop') 
        //     AND GUIE.type_going = "Going" 
        //     ORDER BY EM.start_date_time_ms`;

        // let existingRecords = await DBManager.runQuery(getUsersInterestedEventsQuery);
        // if (existingRecords && existingRecords.length) {
        //     response = { success: true, message: successMessages.GET_GOING_EVENTS, data: existingRecords };
        // } else {
        //     response = { success: true, message: errorMessages.NO_EVENTS_FOUND }
        // }

        var datetime = new Date();
        var todayDate = datetime.toISOString().slice(0,10);

        let upcomingEventQuery = `SELECT event_master.* from event_master
            JOIN user_tickets ON user_tickets.event_id = event_master.event_id
            WHERE user_id = ${userId} AND user_tickets.is_deleted = 0 AND event_master.is_deleted = 0 AND user_tickets.status = 'active' AND ticket_details_status != 'cancel' AND ticket_details_status != 'refunded' AND end_date_time >= '${todayDate}'`;

        let pastEventQuery = `SELECT event_master.* from event_master
            JOIN user_tickets ON user_tickets.event_id = event_master.event_id
            WHERE user_id = ${userId} AND user_tickets.is_deleted = 0 AND event_master.is_deleted = 0 AND user_tickets.status = 'active' AND ticket_details_status != 'cancel' AND ticket_details_status != 'refunded' AND end_date_time < '${todayDate}'`;

        let pastEvents = await DBManager.runQuery(pastEventQuery);
        let upcomingEvents = await DBManager.runQuery(upcomingEventQuery);

        await Promise.all(
            await pastEvents.map(async (dataValue) => {
                await DBManager.getData("event_tickets", "*", { _event_id: dataValue.event_id }).then(async (EventTickets) => {
                    if (EventTickets.length > 0) {
                        dataValue.tickets_list = EventTickets;
                    } else {
                        dataValue.tickets_list = [];
                    }
                    return dataValue;
                });
            })
        )

        await Promise.all(
            await upcomingEvents.map(async (dataValue) => {
                await DBManager.getData("event_tickets", "*", { _event_id: dataValue.event_id }).then(async (EventTickets) => {
                    if (EventTickets.length > 0) {
                        dataValue.tickets_list = EventTickets;
                    } else {
                        dataValue.tickets_list = [];
                    }
                    return dataValue;
                });
            })  
        )
        
        response = {
            success: true,
            message: successMessages.GET_GOING_EVENTS,
            data: { upcomingEvents, pastEvents }
        };
        
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
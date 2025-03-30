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

        let fieldsObj = "user_tickets.id, user_tickets.ticket_details_status, user_tickets.ticket_price, user_tickets.id as order_id, user_tickets.user_id, user_tickets.date_created as ticket_created_date, event_master.event_image,event_master.longitude,event_master.latitude, event_master.address, event_master.category,  event_master.description, event_master.event_id, event_master.event_name, event_master.start_date_time, event_master.end_date_time, event_master.status as event_status, user_tickets.ticket_qty , user_tickets.event_status as ticket_status, user_tickets.attendee, user_tickets._ticket_id,user_tickets.txn_id, user_tickets.total_amount, event_master.timezone";

        let existingRecordsQuery = `SELECT ${fieldsObj} FROM user_tickets
            Join event_master ON user_tickets.event_id = event_master.event_id
            WHERE user_id = ${user['id']} AND user_tickets.is_deleted = 0 AND event_master.is_deleted = 0 AND (user_tickets.status = 'cancel' OR ticket_details_status = 'cancel' OR ticket_details_status = 'refunded')`;

        let existingRecords = await DBManager.runQuery(existingRecordsQuery);
        if (existingRecords && existingRecords.length) {
            await Promise.all(
                existingRecords.map(async ticketsArray => {
                    let ticketDetails = `SELECT event_tickets.*
                        FROM user_ticket_details
                        JOIN event_tickets
                        ON event_tickets.ticket_id = user_ticket_details._ticket_id
                        WHERE _purchased_ticket_id = ${ticketsArray.id}
                        GROUP BY user_ticket_details._ticket_id`;
                    await DBManager.runQuery(ticketDetails).then(ticketDetailsRes => {
                        ticketsArray.tickets_details = ticketDetailsRes;
                    })
                })
            )
            response = { success: true, message: successMessages.REFUNDED_AND_CANCELLED_TICKETS, data: existingRecords };
        } else {
            response = { success: true, message: errorMessages.NO_TICKETS_BOOKED }
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
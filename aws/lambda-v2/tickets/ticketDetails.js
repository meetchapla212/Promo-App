const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let ticket_id = event.pathParameters['ticket_id'];
        // let whereQry = ` ticket_id = ${ticket_id} AND user_tickets.user_id = ${user['id']} `;
        let fieldsObj = "event_master.category, event_master.event_id, event_master.event_name, event_master.event_location, event_master.latitude, event_master.longitude,event_master.isPHQ, event_master.start_date_time_ms, event_master.end_date_time_ms, event_master.start_date_time, event_master.end_date_time, user_master.user_id, user_master.username, user_master.about_you, user_master.profile_pic, user_master.city_lat, user_master.full_name, user_master.city, user_master.description, user_master.email, user_master.status, user_tickets.qrcode, user_tickets.event_id, user_tickets._ticket_id, user_tickets.checked_in, user_tickets.checkedin_by, user_tickets.attendee, user_tickets.checkedin_at, user_tickets.event_status, user_tickets.purchased_on, user_tickets.ticket_qty, user_tickets.total_amount, user_tickets.approved_by, user_tickets.txn_id, user_tickets.paypal_email, event_tickets.ticket_name, event_tickets.ticket_type, event_tickets.quantity, event_tickets.remaining_qty, event_tickets.price, event_tickets.currency_code, event_tickets.status";
        let whereQry = " id = " + ticket_id + " AND user_tickets.user_id = " + user['id'] + " ";

        var sqlQry = "SELECT " + fieldsObj + " FROM user_tickets JOIN user_ticket_details ON user_tickets.id = user_ticket_details._purchased_ticket_id JOIN event_tickets ON user_ticket_details._purchased_ticket_id = event_tickets.ticket_id JOIN user_master ON user_tickets.user_id = user_master.user_id JOIN event_master ON user_tickets.event_id = event_master.event_id"
        if (whereQry) {
            sqlQry += ` WHERE ( ${whereQry} )`;
            console.log(whereQry)
            sqlQry += " AND user_tickets.is_deleted = 0";
        } else {
            sqlQry += " WHERE user_tickets.is_deleted = 0";
        }

        let existingRecords = await DBManager.runQuery(sqlQry);
        if (existingRecords && existingRecords.length) {
            return await Promise.all(
                existingRecords.map(async existingRecordsDetails => {
                    var fieldsObjoin = "`user_master`.`user_id`, `user_master`.`username`, `user_master`.`first_name`, `user_master`.`last_name`, `user_master`.`email`, `user_master`.`profile_pic`";
                    // (tableName1, tableName2, table1ColumnName, table2ColumnName, fieldsObj = '*', whereObj = {}, condition = "AND", offset = -1, limit = -1, customWhere = '',orderBy = '')
                    existingRecordsDetails.user = await DBManager.getJoinedData('event_master', 'user_master', '_user_id', 'user_id', fieldsObjoin, { event_id: existingRecordsDetails.event_id });
                    return existingRecordsDetails;
                })
            ).then(responsedetails => {
                console.log('response', responsedetails)
                response = { success: true, message: successMessages.GET_TICKET_DETAILS, data: responsedetails };
                return awsRequestHelper.respondWithJsonBody(200, response);
            })
        } else {
            response = { success: true, message: "No ticket found." }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
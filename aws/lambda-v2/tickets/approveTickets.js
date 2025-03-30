const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const moment = require('moment');
const { errorMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let userTicketId = event.pathParameters['user_ticket_id'];

        let ticketStatus = await DBManager.getData('user_tickets', 'event_status, approved_by', { id: userTicketId});
        if (ticketStatus[0].event_status == 'approved' && ticketStatus[0].approved_by != null ){
            response = {success:false , message:'This ticket already approved.'}
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        var updateJson = { event_status: 'approved', approved_by: user.id, approved_on:moment().valueOf()}
        await DBManager.dataUpdate('user_tickets', updateJson, { id: userTicketId}).then(data=>{
        })
        response = {success:true , message:'This ticket approved successfully.'}
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
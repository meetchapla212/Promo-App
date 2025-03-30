const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
//const utils = require('../common/utils');
const MDBObject = new MDB();
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let eventId = event.pathParameters.event_id;

        let dataResponse = {
            accepted_users: [],
            pending_users: [],
            rejected_users: []
        }

        let getEventAdministratorQuery = `SELECT UM.first_name, UM.last_name, UM.email, EA.administrator_id FROM event_administrator as EA join user_master as UM on EA._user_id = UM.user_id WHERE EA._event_id = ${eventId} AND EA.is_deleted = '0'`;
        await MDBObject.runQuery(getEventAdministratorQuery).then((eventAdministratorResult) => {
            dataResponse["accepted_users"] = eventAdministratorResult;
        })

        let eventRejectedAdministratorQuery = `SELECT invitation_id, email FROM event_administrator_guest WHERE _event_id = ${eventId} AND request_status="2" AND is_deleted = '0'`;
        await MDBObject.runQuery(eventRejectedAdministratorQuery).then((rejectedAdministratorResult) => {
            dataResponse["rejected_users"] = rejectedAdministratorResult;
        })

        let eventPendingAdministratorQuery = `SELECT invitation_id, email FROM event_administrator_guest WHERE _event_id = ${eventId} AND request_status="3"  AND is_deleted = '0'`;
        await MDBObject.runQuery(eventPendingAdministratorQuery).then((pendingAdministratorResult) => {
            dataResponse["pending_users"] = pendingAdministratorResult;
        })

        response = { success: true, message: successMessages.GET_EVENT_ADMINISTATOR_INVITATION_HISTORY, data: dataResponse }
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
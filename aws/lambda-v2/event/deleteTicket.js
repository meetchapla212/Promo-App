const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require("../common/utils");
const FILE_PATH = __filename;
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let ticketId = event.pathParameters.ticket_id;
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        
        return await MDBObject.getData("event_tickets", "_event_id", { ticket_id: ticketId }).then(async (ticketData) => {
            if (ticketData && ticketData.length > 0) {
                let event_details = await MDBObject.getData("event_master", "count(*) as totalCount", { event_id: ticketData[0]._event_id, _user_id: user.id });
                if (!event_details[0].totalCount) {
                    response.success = false;
                    response.message = errorMessages.EVENT_TICKET_NOT_BELONGS_TO_THIS_USER;
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }
                let ticketPurchased = await MDBObject.getData("user_ticket_details", "count(*) as totalCount", { _ticket_id: ticketId });
                if (ticketPurchased[0].totalCount) {
                    response.success = false;
                    response.message = errorMessages.USER_CAN_NOT_DELETE_THIS_EVENT;
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }
                await MDBObject.dataUpdate("event_tickets", { is_deleted: 1 }, { ticket_id: ticketId });
                response.success = true;
                response.message = successMessages.TICKET_DELETED;
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {
                response.success = false;
                response.message = errorMessages.TICKET_NOT_FOUND;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
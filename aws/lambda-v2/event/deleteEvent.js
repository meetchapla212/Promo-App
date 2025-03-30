const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require("../common/utils");
const FILE_PATH = __filename;
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };

    try {
        let eventId = event.pathParameters.event_id;
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        
        var whereQry = { event_id: eventId, _user_id: user.id };
        return await MDBObject.getData("event_master", "count(*) as totalCount", whereQry).then(async (eventDetails) => {
            if (eventDetails[0].totalCount) {
                await MDBObject.dataUpdate("event_master", { is_deleted: 1 }, whereQry);
                response = { success: true, message: successMessages.EVENT_DELETED };
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {
                response = {
                    success: false,
                    message: errorMessages.ONLY_EVENT_ORGANIZER_HAS_ACCESS_TO_DELETE_EVENT
                };
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
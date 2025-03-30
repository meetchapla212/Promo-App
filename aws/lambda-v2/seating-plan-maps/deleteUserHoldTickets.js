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
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        let userId = user.id;

        let whereQry = { _user_id: userId };
        let usersHoldSeats = await MDBObject.getData( "seat_holding_master", "count(*) as totalCount", whereQry );
        if (usersHoldSeats[0].totalCount) {
            let removeUserHoldSeatsQuery = "DELETE FROM seat_holding_master WHERE _user_id = " + userId + " AND status = 'active' AND is_deleted = 0";
            await MDBObject.runQuery(removeUserHoldSeatsQuery);
        }

        response = {
            success: true,
            message: successMessages.USER_HOLD_TICKET_DELETED
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
};
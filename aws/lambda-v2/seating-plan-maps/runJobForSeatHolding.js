const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let currentUTCTimeStamp = new Date().getTime();
        let getHoldSeatsQuery = "SELECT hold_id FROM seat_holding_master WHERE when_removing <= " + currentUTCTimeStamp + " AND status = 'active' AND is_deleted = 0";
        let holdSeatsList = await MDBObject.runQuery(getHoldSeatsQuery);
        if (holdSeatsList.length > 0) {
            await Promise.all(holdSeatsList.map(async (seat) => {
                await MDBObject.dataDelete('seat_holding_master', { hold_id: seat.hold_id });
            }))
        }

        response = { success: true, message: successMessages.HOLD_SEAT_REMOVED }
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
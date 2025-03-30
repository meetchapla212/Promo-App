const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let userId = user.id;
        let eventId = event.pathParameters.event_id;

        let dataContainer = {
            hold_seats: [],
            booked_seats: [],
        };

        var whereQry = { _event_id: eventId };
        var seatingPlanDetails = await MDBObject.getData("seat_layout_master", "layout_id, _event_id, _user_id", whereQry);
        if (seatingPlanDetails.length > 0) {
            var seatingPlanData = seatingPlanDetails[0];
            var layoutId = seatingPlanData.layout_id;

            await MDBObject.getData('seat_holding_master', '_tier_id, _ticket_id, _seat_id, date_created', { _layout_id: layoutId, _user_id: userId }).then(userHoldTickets => {
                if (userHoldTickets.length > 0) {
                    dataContainer["hold_seats"] = userHoldTickets;
                }
            })

            let getUsersBookedSeatsQuery = `SELECT UTD._tier_id, UTD._ticket_id, UTD._seat_id, UTD.date_created FROM user_tickets as UT JOIN user_ticket_details as UTD ON UT.id = UTD._purchased_ticket_id 
                where UT.event_id = ${eventId} and UT.user_id = ${userId} and UT.status ='active' and UT.is_deleted = 0`;

            await MDBObject.runQuery(getUsersBookedSeatsQuery).then(userBookedSeats => {
                if (userBookedSeats.length > 0) {
                    dataContainer["booked_seats"] = userBookedSeats;
                }
            });

            response = { success: true, message: successMessages.GET_USER_HOLD_TICKET, data: dataContainer }
            return awsRequestHelper.respondWithJsonBody(200, response);
        } else {
            response = { success: false, message: errorMessages.SEATING_PLAN_NOT_FOUND }
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
};
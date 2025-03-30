const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require('./../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        await utils.verifyUser(event.headers.Authorization);
        let eventId = event.pathParameters.event_id;

        var fieldsObj = "layout_id, _event_id, _user_id, front_layout_file, back_layout_file, layout_thumbnail_url, venue_map_name, total_seating_capacity, is_draft, tiers_assigned_seats";
        var whereQry = { _event_id: eventId };

        return MDBObject.getData("seat_layout_master", fieldsObj, whereQry).then(async (seatingPlanDetails) => {
            if (seatingPlanDetails.length > 0) {
                var seatingPlanData = seatingPlanDetails[0];
                let fieldsObj = "seat_tier_master.tier_id, seat_tier_master._layout_id, seat_tier_master.name, seat_tier_master.color,seat_tier_master.tier_array_no,seat_tier_master.seating_capacity";
                seatingPlanData["tiers"] = [];
                await MDBObject.getJoinedData("seat_layout_master", "seat_tier_master", "layout_id", "_layout_id", fieldsObj, { layout_id: seatingPlanData.layout_id }).then(sitePlanTires => {
                    if (sitePlanTires.length > 0) {
                        seatingPlanData["tiers"] = sitePlanTires;
                    }
                })

                response = { success: true, message: successMessages.GET_SEATING_PLAN, data: seatingPlanData }
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {
                response = { success: false, message: errorMessages.SEATING_PLAN_NOT_FOUND }
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        }).catch((error) => {
            console.error("error : ", error);
            response = { success: false, message: errorMessages.SOMETHING_WRONG_WHILE_GETTING_SEATING_PLAN, error }
            return awsRequestHelper.respondWithJsonBody(200, response);
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
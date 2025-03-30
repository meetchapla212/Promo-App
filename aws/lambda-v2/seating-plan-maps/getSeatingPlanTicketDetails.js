const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require('./../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

const getReservedBookedSeatsOfTire = async (tier) => {
    return new Promise(async (resolve, reject) => {
        await MDBObject.getData("user_ticket_details", "_tier_id, _seat_id", { _layout_id: tier._layout_id, _tier_id: tier.tier_id, is_deleted: 0, status: 'active' }, "AND").then(reservedBooking => {
            resolve(reservedBooking)
        }).catch(error => {
            reject(error);
        });
    })
}

const getHoldSeatsOfTire = async (tier, planDetails) => {
    return new Promise(async (resolve, reject) => {
        await MDBObject.getData("seat_holding_master", "_tier_id, _seat_id, _user_id", { _layout_id: tier._layout_id, _tier_id: tier.tier_id, is_deleted: 0 }, "AND").then(holdtickets => {
            resolve(holdtickets)
        }).catch(error => {
            reject(error);
        });
    })
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        await utils.verifyUser(event.headers.Authorization);
        let seatingPlanId = event.pathParameters.seating_plan_id;

        var fieldsObj = "layout_id, _event_id, _user_id, front_layout_file, back_layout_file, layout_thumbnail_url, venue_map_name, total_seating_capacity, tiers_assigned_seats";
        var whereQry = { layout_id: seatingPlanId };

        return MDBObject.getData("seat_layout_master", fieldsObj, whereQry).then(async (seatingPlanDetails) => {
            if (seatingPlanDetails.length > 0) {
                var seatingPlanData = seatingPlanDetails[0];
                let fieldsObj = "seat_tier_master.tier_id, seat_tier_master._layout_id, seat_tier_master.name, seat_tier_master.color, seat_tier_master.seating_capacity";
                let sitePlanTires = await MDBObject.getJoinedData("seat_layout_master", "seat_tier_master", "layout_id", "_layout_id", fieldsObj, { layout_id: seatingPlanData.layout_id });
                if (sitePlanTires.length > 0) {
                    return await Promise.all(sitePlanTires.map(async (planTier) => {
                        var planTireDetails = {
                            ...planTier
                        }

                        var reservedSeats = await getReservedBookedSeatsOfTire(planTier);
                        var holdSeats = await getHoldSeatsOfTire(planTier);

                        planTireDetails['total_reserved_seats'] = reservedSeats.length;
                        planTireDetails['total_hold_seats'] = holdSeats.length;
                        let totalSeats = planTier.seating_capacity;
                        let totalBookAndHoldSeats = planTireDetails.total_reserved_seats + planTireDetails.total_hold_seats;
                        planTireDetails['total_available_seats'] = totalSeats - totalBookAndHoldSeats;
                        planTireDetails["reserved_seats"] = reservedSeats;
                        planTireDetails["hold_seats"] = holdSeats;

                        return planTireDetails;
                    })).then((tireDetails) => {
                        seatingPlanData["tiers"] = tireDetails;
                        response = { success: true, message: successMessages.GET_SEATING_PLAN_TICKET, data: seatingPlanData }
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    }).catch((error) => {
                        response = { success: false, message: errorMessages.SOMETHING_WRONG_WHILE_GETTING_SEATING_PLAN_TICKET_DETAILS, error }
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    });
                } else {
                    seatingPlanData["tiers"] = [];
                    response = { success: true, message: successMessages.GET_SEATING_PLAN_TICKET, data: seatingPlanData }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }
            } else {
                response = { success: false, message: errorMessages.SEATING_PLAN_NOT_FOUND }
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        }).catch((error) => {
            console.error("error : ", error);
            return awsRequestHelper.respondWithJsonBody(500, response);
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
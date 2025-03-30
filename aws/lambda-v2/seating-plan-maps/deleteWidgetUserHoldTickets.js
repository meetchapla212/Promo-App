const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const Joi = require('joi');
const { errorMessages, successMessages } = require("../common/constants");

const validate = async (body) => {
    const obj = Joi.object().keys({
        tier_id: Joi.required(),
        seats: Joi.array(),
    })
    const schema = Joi.object().keys({
        layout_id: Joi.required(),
        seatsDetails: Joi.array().items(obj),
    });

    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
        }, function (error, value) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            } else {
                resolve(value);
            }
        });
    });
};

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let requestData = JSON.parse(event.body);
        await validate(requestData);
        let { seatsDetails, layout_id } = requestData;
        return MDBObject.getData("seat_layout_master", "count(*) as totalCount", { layout_id }).then(async (seatingPlanDetails) => {
            if (seatingPlanDetails[0].totalCount) {
                return await Promise.all(seatsDetails.map(async seatDetail => {
                    if (layout_id && ('tier_id' in seatDetail) && ('seats' in seatDetail)) {
                        let tierSeats = seatDetail.seats;
                        let allSeats = tierSeats.map(seat => {
                            seat = "'" + seat + "'"
                            return seat;
                        }).join(",");

                        let removeUserHoldSeatsQuery = "DELETE FROM seat_holding_master WHERE _seat_id IN (" + allSeats + ") and _tier_id = " + seatDetail.tier_id + " and _layout_id = " + layout_id + "";
                        await MDBObject.runQuery(removeUserHoldSeatsQuery);
                    }
                })).then(() => {
                    response = { success: true, message: successMessages.USER_HOLD_TICKET_DELETED }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                })
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
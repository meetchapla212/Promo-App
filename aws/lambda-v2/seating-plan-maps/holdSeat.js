const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require("joi");
const MDB = require("./../common/mysqlmanager");
const utils = require("../common/utils");
const MDBObject = new MDB();
const moment = require("moment");
const FILE_PATH = __filename;
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        layout_id: Joi.required(),
        seats: Joi.array().items(
            Joi.object({
                tier_id: Joi.required(),
                seat_id: Joi.required(),
                ticket_id: Joi.required(),
            }).required()
        ).required(),
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
            allowUnknown: false,
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
};

const verifyUserSelectedSeatsStatus = async ( userSelectedSeats,layoutId,userHoldSeatsArray) => {
    let dataContainer = {
        hold_seats: [],
        booked_seats: [],
    };

    await MDBObject.getData("seat_holding_master", "_tier_id, _ticket_id, _seat_id", { _layout_id: layoutId }).then((seatLayoutHoldTickets) => {
        if (seatLayoutHoldTickets.length > 0) {
            dataContainer["hold_seats"] = seatLayoutHoldTickets;
            userSelectedSeats = userSelectedSeats.filter((selectedSeat) => {
                if (seatLayoutHoldTickets.some((holdSeat) =>
                    holdSeat._tier_id == selectedSeat.tier_id &&
                    holdSeat._seat_id == selectedSeat.seat_id
                )) {
                    userHoldSeatsArray.push(selectedSeat);
                } else {
                    return selectedSeat;
                }
            });
        }
    });

    await MDBObject.getData("user_ticket_details", "_tier_id, _ticket_id, _seat_id", { _layout_id: layoutId }).then((seatLayoutSoldTickets) => {
        if (seatLayoutSoldTickets.length > 0) {
            dataContainer["booked_seats"] = seatLayoutSoldTickets;
            userSelectedSeats = userSelectedSeats.filter((selectedSeat) => {
                if (seatLayoutSoldTickets.some((soldSeat) =>
                    soldSeat._tier_id == selectedSeat.tier_id &&
                    soldSeat._seat_id == selectedSeat.seat_id
                )) {
                    userHoldSeatsArray.push(selectedSeat);
                } else {
                    return selectedSeat;
                }
            });
        }
    });

    dataContainer["user_selected_hold_seats"] = userHoldSeatsArray;
    dataContainer["user_selected_available_seats"] = userSelectedSeats;

    return dataContainer;
};

const holdSeats = async (userSelectedSeats, layoutId, userId) => {
    return Promise.all(
        userSelectedSeats.map(async (seat) => {
            return {
                _layout_id: layoutId,
                _user_id: userId,
                _tier_id: seat.tier_id,
                _ticket_id: seat.ticket_id,
                _seat_id: seat.seat_id,
                when_removing: moment(new Date()).add(8, "minutes").valueOf(),
            };
        })
    ).then(async (seatArray) => {
        return await MDBObject.bulkInsert("seat_holding_master", seatArray);
    });
};

module.exports.handler = async function (event, context, callback) {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };

    try {
        var user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        var userId = user.id;
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        var layoutId = apiData.layout_id;
        return await verifyUserSelectedSeatsStatus(apiData.seats, layoutId, []).then(async (seatStatusResult) => {
            if (seatStatusResult.user_selected_hold_seats && seatStatusResult.user_selected_hold_seats.length > 0) {
                response = {
                    success: false,
                    message: errorMessages.SOME_SELECTED_SEATS_ALREADY_BOOKED,
                    data: seatStatusResult,
                };
                return awsRequestHelper.respondWithJsonBody(200, response);
            }

            //hold user seats
            await holdSeats(apiData.seats, layoutId, userId);
            let currentHoldSeats = [
                ...seatStatusResult.user_selected_available_seats,
            ];
            currentHoldSeats = currentHoldSeats.map((seat) => {
                let newSeat = Object.assign({}, seat);
                newSeat["_tier_id"] = newSeat["tier_id"];
                newSeat["_seat_id"] = newSeat["seat_id"];
                newSeat["_ticket_id"] = newSeat["ticket_id"];
                delete newSeat["tier_id"];
                delete newSeat["seat_id"];
                delete newSeat["ticket_id"];
                return newSeat;
            });
            seatStatusResult.hold_seats = [
                ...seatStatusResult.hold_seats,
                ...currentHoldSeats,
            ];

            response = {
                success: true,
                message: successMessages.SEAT_HOLD,
                data: seatStatusResult,
            };
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
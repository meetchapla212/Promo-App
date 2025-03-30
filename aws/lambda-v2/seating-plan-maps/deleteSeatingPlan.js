const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const utils = require("../common/utils");
const MDBObject = new MDB();
const FILE_PATH = __filename;
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let seatingPlanId = event.pathParameters.seating_plan_id;
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);

        let usersSeatPlanExistsQuery = `SELECT count(*) as totalCount FROM seat_layout_master WHERE layout_id = ${seatingPlanId} AND  _user_id = ${user.id} AND is_deleted = 0`;
        let seatPlan = await MDBObject.runQuery(usersSeatPlanExistsQuery);
        if (!seatPlan[0].totalCount) {
            response.message = "You can not delete this seat plan";
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        var whereQry = { layout_id: seatingPlanId };
        return await MDBObject.getData("seat_layout_master", "layout_id, _event_id", whereQry).then(
            async (seatingPlanDetails) => {
                var seatingPlanData = seatingPlanDetails[0];
                let fieldsObj = "seat_tier_master.tier_id, seat_tier_master._layout_id, seat_tier_master.name";

                return await MDBObject.getJoinedData("seat_layout_master", "seat_tier_master", "layout_id", "_layout_id", fieldsObj, { layout_id: seatingPlanData.layout_id }).then(async (sitePlanTires) => {
                    if (sitePlanTires.length > 0) {
                        var getTiersTicketsQuery = {
                            _event_id: seatingPlanData._event_id,
                            status: "active",
                            is_deleted: 0,
                        };
                        var layoutAllTiersTickets = await MDBObject.getData("event_tickets", "remaining_qty, quantity, ticket_name, _tier_id", getTiersTicketsQuery);
                        if (layoutAllTiersTickets.length > 0) {
                            let ticketException = 0;
                            let ticketExceptionResponse = {};
                            return await Promise.all(
                                sitePlanTires.map((tire) => {
                                    var tierTickets = layoutAllTiersTickets.filter((ticket) => ticket._tier_id === tire.tier_id);
                                    if (tierTickets.length > 0) {
                                        for (let index = 0; index < tierTickets.length; index++) {
                                            if (tierTickets[index].remaining_qty < tierTickets[index].quantity) {
                                                ticketException = 1;
                                                ticketExceptionResponse = {
                                                    success: false,
                                                    message: `${errorMessages.NO_LONGER_ABLE_TO_DELETE_LAYOUT1} ${tierTickets[index].ticket_name} ${errorMessages.NO_LONGER_ABLE_TO_DELETE_LAYOUT2} ${tire.name} tier.`,
                                                    ticket_name: tierTickets[index].ticket_name,
                                                    total_tickets: tierTickets[index].quantity,
                                                    remaining_tickets: tierTickets[index].remaining_qty,
                                                };
                                                break;
                                            }
                                            continue;
                                        }
                                    }
                                    return;
                                })
                            ).then(async () => {
                                if (ticketException > 0) {
                                    return awsRequestHelper.respondWithJsonBody(200, ticketExceptionResponse);
                                } else {
                                    return await Promise.all(
                                        sitePlanTires.map(async (tire) => {
                                            await MDBObject.dataUpdate("event_tickets", { is_deleted: 1 }, { _tier_id: tire.tier_id });
                                            await MDBObject.dataUpdate("seat_tier_master", { is_deleted: 1 }, { tier_id: tire.tier_id });
                                            return;
                                        })
                                    ).then(() => {
                                        return MDBObject.dataUpdate("seat_layout_master", { is_deleted: 1 }, whereQry).then(async (data) => {
                                            response = {
                                                success: true,
                                                message: successMessages.SEATING_PLAN_REMOVED,
                                            };
                                            return awsRequestHelper.respondWithJsonBody(200, response);
                                        }).catch((error) => {
                                            console.error("error : ", error);
                                            return awsRequestHelper.respondWithJsonBody(500, response);
                                        });
                                    });
                                }
                            });
                        } else {
                            return await Promise.all(
                                sitePlanTires.map(async (tire) => {
                                    await MDBObject.dataUpdate("event_tickets", { is_deleted: 1 }, { _tier_id: tire.tier_id });
                                    await MDBObject.dataUpdate("seat_tier_master", { is_deleted: 1 }, { tier_id: tire.tier_id });
                                    return;
                                })
                            ).then(() => {
                                return MDBObject.dataUpdate("seat_layout_master", { is_deleted: 1 }, whereQry).then(async (data) => {
                                    response = {
                                        success: true,
                                        message: successMessages.SEATING_PLAN_REMOVED,
                                    };
                                    return awsRequestHelper.respondWithJsonBody(200, response);
                                }).catch((error) => {
                                    console.error("error : ", error);
                                    return awsRequestHelper.respondWithJsonBody(500, response);
                                });
                            });
                        }
                    } else {
                        return MDBObject.dataUpdate("seat_layout_master", { is_deleted: 1 }, whereQry).then(async (data) => {
                            response = {
                                success: true,
                                message: successMessages.SEATING_PLAN_REMOVED,
                            };
                            return awsRequestHelper.respondWithJsonBody(200, response);
                        }).catch((error) => {
                            console.error("error : ", error);
                            return awsRequestHelper.respondWithJsonBody(500, response);
                        });
                    }
                });
            }
        );
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
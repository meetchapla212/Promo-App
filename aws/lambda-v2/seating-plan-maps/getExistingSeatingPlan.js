const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require('./../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

let searchParamsQuery = (searchParams, userId) => {
    console.log("---", searchParams)

    var fieldsObj = "SLM.layout_id, SLM.venue_map_name, SLM._event_id, SLM._user_id, SLM.is_draft, SLM.front_layout_file, SLM.back_layout_file, SLM.total_seating_capacity, SLM.tiers_assigned_seats, SLM.layout_thumbnail_url";
    var distanceWhere = '';

    if (searchParams.location && typeof searchParams.location === 'object' && searchParams.location.length > 0) {
        let selectLocation = "(6371 * acos ( cos ( radians(" + searchParams.location[0] + ") ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(" + searchParams.location[1] + ") ) + sin ( radians(" + searchParams.location[0] + ") ) * sin( radians( latitude ) ))) AS distance";
        fieldsObj = fieldsObj + ',' + selectLocation;
        distanceWhere = ' HAVING distance = 0';
        // distanceWhere = ' HAVING distance < 1';
        delete searchParams.location;
    }

    var sqlQry = "SELECT " + fieldsObj + " FROM event_master as EM";
    sqlQry += " JOIN seat_layout_master as SLM ON SLM._event_id = EM.event_id and SLM._user_id = EM._user_id  and SLM.is_deleted = 0"
    sqlQry += " WHERE EM._user_id = " + userId + "";
    sqlQry += " AND EM.is_deleted = 0";
    sqlQry += " AND EM.is_draft != 1";

    if (distanceWhere != '') {
        sqlQry += distanceWhere;
    }
    sqlQry += " ORDER BY EM.date_created DESC";

    return sqlQry;
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let eventId = event.pathParameters.event_id;
        let userId = user.id;

        let getUserEventQuery = `SELECT count(*) as totalCount FROM event_master WHERE event_id = ${eventId} AND _user_id = ${userId} AND is_deleted = 0`;
        let eventDetails = await MDBObject.runQuery(getUserEventQuery);
        if (!eventDetails[0].totalCount) {
            response.message = 'Event not belongs to you!';
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        await MDBObject.getData('event_master', 'latitude, longitude', { event_id: eventId }).then(async (eventDetails) => {
            if (eventDetails.length > 0) {
                let eventData = eventDetails[0];
                let latitude = eventData.latitude;
                let longitude = eventData.longitude;

                if (latitude && longitude) {
                    let searchParams = {
                        "location": [
                            latitude,
                            longitude
                        ]
                    };

                    var sqlQry = await searchParamsQuery(searchParams, userId);
                    await MDBObject.runQuery(sqlQry).then(async (userExistingPlans) => {
                        if (userExistingPlans.length > 0) {
                            let siteplan = userExistingPlans[0];
                            let fieldsObj = "seat_tier_master.tier_id,seat_tier_master.tier_array_no, seat_tier_master._layout_id, seat_tier_master.name, seat_tier_master.color, seat_tier_master.seating_capacity";
                            siteplan["tiers"] = [];
                            await MDBObject.getJoinedData("seat_layout_master", "seat_tier_master", "layout_id", "_layout_id", fieldsObj, { layout_id: siteplan.layout_id }).then(sitePlanTires => {
                                if (sitePlanTires.length > 0) {
                                    siteplan["tiers"] = sitePlanTires;
                                }
                            })
                            response = { success: true, message: successMessages.GET_EXISTING_SEATING_PLAN, data: siteplan }
                        } else {
                            response = { success: false, message: errorMessages.EXISTING_SEATING_PLAN_NOT_FOUND, data: null };
                        }
                    }).catch(error => {
                        response = { success: false, message: errorMessages.SOMETHING_WRONG_WHILE_GETTING_EXISTING_SEATING_PLAN, error }
                    })
                } else {
                    response = { success: true, message: "Failure, event coordinates not found to get seating plan!", data: null }
                }
            } else {
                response = { success: true, message: errorMessages.EVENT_NOT_FOUND, data: null }
            }
        })
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
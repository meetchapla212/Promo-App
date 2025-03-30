const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require('./../common/utils');
const moment = require('moment');
const {
    errorMessages,
    successMessages
} = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        var currentDate = moment().add(2, 'day').format("YYYY-MM-DD HH:mm:ss");
        let getActiveEventWithOutReqardQuery = `SELECT event_id, event_name, start_date_time, end_date_time, timezone FROM event_master WHERE event_id NOT IN (SELECT _event_id FROM reward_master) AND DATE_FORMAT(start_date_utc, "%Y-%m-%d %H:%i:%s") > "${currentDate}" AND _user_id= ${user.id} AND status="active" AND is_draft=0`;

        return MDBObject.runQuery(getActiveEventWithOutReqardQuery).then(async (data) => {
            if (data.length > 0) {
                response = { success: true, message: successMessages.GET_EVENT_LIST, data: data }
            } else {
                response = { success: false, message: errorMessages.NO_EVENTS_FOUND }
            }
            return awsRequestHelper.respondWithJsonBody(200, response);
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
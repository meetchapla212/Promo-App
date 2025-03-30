const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require('./../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let eventId = event.pathParameters.event_id;
        var whereQry = { _user_id: user.id, _event_id: eventId };
        return MDBObject.getData('shared_event', 'count(*) as totalCount', whereQry).then(async data => {
            if (data[0].totalCount) {
                response = { success: false, message: errorMessages.USER_ALREADY_SHARED_EVENT }
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {
                insertData = { _user_id: user.id, _event_id: eventId };
                return MDBObject.dataInsert('shared_event', insertData).then(insertedData => {
                    response = { success: true, message: successMessages.USER_SHARED_EVENT }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                })
            }
        })
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
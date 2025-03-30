const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let guestId = event.pathParameters.guest_id;
        return MDBObject.dataUpdate("guest_users", { is_deleted: 1 }, { guest_id: guestId }).then((data) => {
            response = { success: true, message: successMessages.GUEST_DELETED };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch((error) => {
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
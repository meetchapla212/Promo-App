const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require("../common/utils");
const FILE_PATH = __filename;
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };

    try {
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        let commentId = event.pathParameters.comment_id;

        var userId = user["id"];
        var dataObj = { is_deleted: 1 };
        var whereQry = { comment_id: commentId, _user_id: userId };

        // log details if admin login
        // const { proxy_login } = user;
        // if (proxy_login) {
        //     console.log("deleting comment where", whereQry);
        // }

        return MDBObject.dataUpdate("event_comments", dataObj, whereQry).then((data) => {
            response = { success: true, message: successMessages.COMMENT_DELETED };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch((error) => {
            return awsRequestHelper.respondWithJsonBody(500, error);
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
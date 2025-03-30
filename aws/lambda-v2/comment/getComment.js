const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        // let resource = event.requestContext.resourcePath;
        let eventId = event.queryStringParameters.event_id;
        var whereQry = { _event_id: eventId };
        let pageNumber = (event.queryStringParameters && event.queryStringParameters.page && event.queryStringParameters.page > 0) ? event.queryStringParameters.page : 1;
        let pageLimit = (event.queryStringParameters && event.queryStringParameters.limit) ? event.queryStringParameters.limit : 10;
        let pageoffset = (pageNumber * pageLimit) - pageLimit;
        let totalRecords = 0;
        await MDBObject.getJoinedData("event_comments", "user_master", "_user_id", "user_id", fieldsObj, whereQry).then(data => {
            totalRecords = data.length
        });
        var fieldsObj = "user_master.user_id, user_master.username, user_master.first_name, user_master.last_name, user_master.profile_pic, event_comments.*";
        var orderBy = ' ORDER BY comment_id DESC';
        return MDBObject.getJoinedData("event_comments", "user_master", "_user_id", "user_id", fieldsObj, whereQry, 'AND', pageoffset, pageLimit, '', orderBy).then((data) => {
            if (data.length > 0) {
                response = { success: true, message: successMessages.GET_COMMENT_LIST, data: data, total: parseInt(totalRecords), page: parseInt(pageNumber), limit: parseInt(pageLimit) }
            } else {
                response = { success: false, message: errorMessages.NO_COMMENT_FOUND }
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
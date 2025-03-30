const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const {
    errorMessages,
    successMessages
} = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let userId = event.pathParameters.user_id;
        let pageNumber = (event.queryStringParameters && event.queryStringParameters.page && event.queryStringParameters.page > 0) ? event.queryStringParameters.page : 1;
        let pageLimit = (event.queryStringParameters && event.queryStringParameters.limit && event.queryStringParameters.limit > 0) ? event.queryStringParameters.limit : 10;
        let pageoffset = (pageNumber * pageLimit) - pageLimit;
        let totalRecords = 0;
        
        let totalUserEventsQuery = `SELECT
            count(*) as totalCount
            FROM event_master as EM
            LEFT JOIN zone_master as ZM on ZM.zone_id = EM._zone_id
            WHERE EM._user_id = ${userId} AND EM.is_draft = 0 AND EM.status = 'active'`;
            
        return await MDBObject.runQuery(totalUserEventsQuery).then(async (data) => {
            if (data[0].totalCount) {
                totalRecords = data[0].totalCount;
                let getUserEventsQuery = `SELECT
                    EM.*, ZM.name as zone_name, ZM.logo as zone_logo, ZM.location as zone_location, ZM.description as zone_description, ZM.zone_domain as zone_domain, ZM.member_invitation_process as zone_member_invitation_process, ZM.signup_url as zone_signup_url, ZM.date_created as zone_date_created, ZM.date_modified as zone_date_modified, ZM.is_deleted as zone_is_deleted
                    FROM event_master as EM
                    LEFT JOIN zone_master as ZM on ZM.zone_id = EM._zone_id
                    WHERE EM._user_id = ${userId} AND EM.is_draft = 0 AND EM.status = 'active'
                    ORDER BY EM.date_created DESC
                    LIMIT ${pageoffset},${pageLimit}`;

                return await MDBObject.runQuery(getUserEventsQuery).then(async (data) => {
                    if (data && data.length > 0) {
                        response = {
                            success: true,
                            message: successMessages.GET_USER_EVENT_LIST,
                            data: data,
                            total: parseInt(totalRecords),
                            page: parseInt(pageNumber),
                            limit: parseInt(pageLimit)
                        }
                    } else {
                        response = { success: false, message: errorMessages.ERROR_NO_EVENTS_FOUND }
                    }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                })
            } else {
                response = { success: false, message: errorMessages.ERROR_NO_EVENTS_FOUND }
            }
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
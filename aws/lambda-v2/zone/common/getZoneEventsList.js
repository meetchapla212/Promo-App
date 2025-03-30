const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const DBManager = new MDB();
const { errorMessages, successMessages } = require("../../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let zone_id = event.pathParameters['zone_id'];

        let pageNumber = parseInt((event.queryStringParameters && event.queryStringParameters.page && event.queryStringParameters.page > 0) ? event.queryStringParameters.page : 1);
        let pageLimit = parseInt((event.queryStringParameters && event.queryStringParameters.limit) ? event.queryStringParameters.limit : 10);
        let sortOrder = (event.queryStringParameters && event.queryStringParameters.order) ? event.queryStringParameters.order : 'DESC';
        let sortOrderBy = (event.queryStringParameters && event.queryStringParameters.orderBy) ? event.queryStringParameters.orderBy : 'event_id';
        let searchText = (event.queryStringParameters && event.queryStringParameters.search_text) ? event.queryStringParameters.search_text : '';
        let fetchWithoutLimit = (event.queryStringParameters && event.queryStringParameters.fetchWithoutLimit) ? true : false;

        let pageoffset = (pageNumber * pageLimit) - pageLimit;
        let totalRecords = 0;

        let queryZoneEventListingCount = `SELECT count(*) as totalCount from event_master as EM join zone_master as ZM on ZM.zone_id = EM._zone_id where EM.is_deleted = 0 AND EM.is_draft != 1 AND EM.status = 'active'  AND EM._zone_id = ${zone_id}`;
        let queryZoneEventListing = `SELECT EM.*, ZM.zone_id, ZM.name as zone_name from event_master as EM join zone_master as ZM on ZM.zone_id = EM._zone_id where EM.is_deleted = 0 AND EM.is_draft != 1 AND EM.status = 'active'  AND EM._zone_id = ${zone_id}`;
        if (searchText) {
            let serachInFields = ['event_name', 'description', 'address']
            let searchQry = serachInFields.map(function (key, index) {
                return `EM.${key} like '%${searchText}%'`;
            }).join(" OR ");

            queryZoneEventListing += ` AND (${searchQry})`
            queryZoneEventListingCount += ` AND (${searchQry})`
        }

        return await DBManager.runQuery(queryZoneEventListingCount).then(async (data) => {
            if (data[0].totalCount) {
                totalRecords = data[0].totalCount
                queryZoneEventListing += ` ORDER BY EM.${sortOrderBy} ${sortOrder}`;
                if (!fetchWithoutLimit) {
                    queryZoneEventListing += `  LIMIT ${pageoffset},${pageLimit}`
                }

                return DBManager.runQuery(queryZoneEventListing).then(async (data) => {
                    let dataResponse = {
                        page: pageNumber,
                        totalRecord: totalRecords,
                        data: data
                    }
                    response = { success: true, message: successMessages.GET_ZONE_EVENTS_LIST, data: dataResponse }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }).catch((error) => {
                    console.error("error : ", error);
                    return awsRequestHelper.respondWithJsonBody(500, response);
                });
            } else {
                let dataResponse = {
                    page: pageNumber,
                    totalRecord: totalRecords,
                    data: []
                }
                response = { success: true, message: successMessages.GET_ZONE_EVENTS_LIST, data: dataResponse }
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
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
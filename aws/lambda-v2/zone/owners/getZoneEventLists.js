const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const DBManager = new MDB();
const { errorMessages, successMessages } = require("../../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);

        let isUserIsZoneOwner = await DBManager.getData('user_master', 'count(*) as totalCount, is_zone_owner', { user_id: user.id, is_zone_owner: 1 }, "AND");
        if (!isUserIsZoneOwner || !isUserIsZoneOwner.length) {
            response = { success: false, message: errorMessages.NOT_OWNER_OF_ANY_ZONE };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        let pageNumber = parseInt((event.queryStringParameters && event.queryStringParameters.page && event.queryStringParameters.page > 0) ? event.queryStringParameters.page : 1);
        let pageLimit = parseInt((event.queryStringParameters && event.queryStringParameters.limit) ? event.queryStringParameters.limit : 10);
        let sortOrder = (event.queryStringParameters && event.queryStringParameters.order) ? event.queryStringParameters.order : 'DESC';
        let sortOrderBy = (event.queryStringParameters && event.queryStringParameters.orderBy) ? event.queryStringParameters.orderBy : 'event_id';
        let searchText = (event.queryStringParameters && event.queryStringParameters.search_text) ? event.queryStringParameters.search_text : '';
        let fetchWithoutLimit = (event.queryStringParameters && event.queryStringParameters.fetchWithoutLimit) ? true : false;
        let zone_id = event.pathParameters['zone_id'];
        let pageoffset = (pageNumber * pageLimit) - pageLimit;

        let queryZoneEventCount = `SELECT count(*) as totalCount from event_master as EM join zone_master as ZM on ZM.zone_id = EM._zone_id where EM.is_deleted = 0 AND EM.status = 'active' AND EM.is_draft = 0 AND EM._zone_id = ${zone_id}`;

        let queryZoneEventListing = `SELECT EM.event_id, EM._user_id, EM._zone_id, EM.event_name, EM.description, EM.event_type, EM.event_image, EM.address, EM.start_date_time, EM.end_date_time, EM.event_location, EM.longitude, EM.latitude, EM.ticket_type, EM.cancel_reason, EM.status, EM.is_deleted, EM.dynamic_link, EM.venue_is, EM.state, EM.address_state, EM.city, EM.country, EM.date_created, ZM.zone_id, ZM.name as zone_name from event_master as EM join zone_master as ZM on ZM.zone_id = EM._zone_id where EM.is_deleted = 0 AND EM.status = 'active' AND EM.is_draft = 0 AND EM._zone_id = ${zone_id}`;

        if (searchText) {
            let serachInFields = ['event_name', 'description', 'address']
            let searchQry = serachInFields.map(function (key, index) {
                return `EM.${key} like '%${searchText}%'`;
            }).join(" OR ");
            queryZoneEventCount += ` AND (${searchQry})`
            queryZoneEventListing += ` AND (${searchQry})`
        }

        return await DBManager.runQuery(queryZoneEventCount).then(async (data) => {
            if (data[0].totalCount) {
                queryZoneEventListing += ` ORDER BY EM.${sortOrderBy} ${sortOrder}`;
                if (!fetchWithoutLimit) {
                    queryZoneEventListing += `  LIMIT ${pageoffset},${pageLimit}`
                }

                return DBManager.runQuery(queryZoneEventListing).then(async (data) => {
                    let dataResponse = {
                        page: pageNumber,
                        totalRecord: data[0].totalCount,
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
                    totalRecord: 0,
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
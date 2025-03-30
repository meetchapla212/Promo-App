"use strict";
const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const DBManager = new MDB();
const { errorMessages, successMessages } = require("../../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);

        let isUserIsZoneOwner = await DBManager.getData('user_master', 'count(*) as totalCount', { user_id: user.id, is_zone_owner: 1 }, "AND");
        if (!isUserIsZoneOwner[0].totalCount) {
            response = { success: false, message: errorMessages.NOT_OWNER_OF_ANY_ZONE };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        let pageNumber = parseInt((event.queryStringParameters && event.queryStringParameters.page && event.queryStringParameters.page > 0) ? event.queryStringParameters.page : 1);
        let pageLimit = parseInt((event.queryStringParameters && event.queryStringParameters.limit) ? event.queryStringParameters.limit : 10);
        let sortOrder = (event.queryStringParameters && event.queryStringParameters.order) ? event.queryStringParameters.order : 'DESC';
        let sortOrderBy = (event.queryStringParameters && event.queryStringParameters.orderBy) ? event.queryStringParameters.orderBy : 'zone_id';
        let searchText = (event.queryStringParameters && event.queryStringParameters.search_text) ? event.queryStringParameters.search_text : '';
        let fetchWithoutLimit = (event.queryStringParameters && event.queryStringParameters.fetchWithoutLimit) ? true : false;
        let user_id = user.id;
        let pageoffset = (pageNumber * pageLimit) - pageLimit;
        let totalRecords = 0;

        let queryZoneCount = `SELECT count(*) as totalCount from zone_master as ZM join admin_zoneowner_invitation_requests as AZIR on AZIR.zone_id = ZM.zone_id where AZIR.is_deleted = 0 AND AZIR.is_block = 0 AND ZM.is_deleted = 0 AND AZIR.request_status = 1 AND AZIR.user_id = ${user_id}`;
        let queryZoneListing = `SELECT ZM.*, (SELECT count(*) FROM admin_zoneowner_invitation_requests as AZIR  where AZIR.is_deleted = 0 AND AZIR.is_block = 0 AND AZIR.zone_id = ZM.zone_id) as zone_owner_count, (SELECT count(*) FROM member_zonemember_invitation_requests as ZMIR where ZMIR.is_deleted = 0 AND ZMIR.zone_id = ZM.zone_id) as zone_member_count, (SELECT count(*) FROM admin_zoneorganizer_invitation_requests as ZOIR where ZOIR.is_deleted = 0 AND ZOIR.zone_id = ZM.zone_id) as zone_organizer_count, (SELECT count(*) FROM event_master as EM where EM.status="active" AND EM.is_draft = 0 AND EM._zone_id = ZM.zone_id)as zone_events_count from zone_master as ZM join admin_zoneowner_invitation_requests as AZIR on AZIR.zone_id = ZM.zone_id where AZIR.is_deleted = 0 AND AZIR.is_block = 0 AND ZM.is_deleted = 0 AND AZIR.request_status = 1 AND AZIR.user_id = ${user_id}`;
        if (searchText) {
            let serachInFields = ['name', 'location', 'description']
            let searchQry = serachInFields.map(function (key, index) {
                return `ZM.${key} like '%${searchText}%'`;
            }).join(" OR ");

            queryZoneCount += ` AND (${searchQry})`
            queryZoneListing += ` AND (${searchQry})`
        }
        return await DBManager.runQuery(queryZoneCount).then(async (data) => {
            if(data[0].totalCount){
                totalRecords = data[0].totalCount;
        
                queryZoneListing += ` ORDER BY ZM.${sortOrderBy} ${sortOrder}`;
                if (!fetchWithoutLimit) {
                    queryZoneListing += `  LIMIT ${pageoffset},${pageLimit}`
                }
        
                return DBManager.runQuery(queryZoneListing).then(async (data) => {
                    let dataResponse = {
                        page: pageNumber,
                        totalRecord: totalRecords,
                        data: data
                    }
        
                    response = { success: true, message: successMessages.GET_ZONE_LIST, data: dataResponse }
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
                response = { success: true, message: successMessages.GET_ZONE_LIST, data: dataResponse }
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
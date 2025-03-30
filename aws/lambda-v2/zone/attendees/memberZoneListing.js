"use strict";
const awsRequestHelper = require('../../../lambda/common/awsRequestHelper');
const DBM = require('../../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../../common/utils');
const { errorMessages, successMessages } = require("../../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let pageNumber = parseInt((event.queryStringParameters && event.queryStringParameters.page && event.queryStringParameters.page > 0) ? event.queryStringParameters.page : 1);
        let pageLimit = parseInt((event.queryStringParameters && event.queryStringParameters.limit) ? event.queryStringParameters.limit : 10);
        let sortOrder = (event.queryStringParameters && event.queryStringParameters.order) ? event.queryStringParameters.order : 'DESC';
        let sortOrderBy = (event.queryStringParameters && event.queryStringParameters.orderBy) ? event.queryStringParameters.orderBy : 'zone_id';

        let pageoffset = (pageNumber * pageLimit) - pageLimit;
        let totalRecords = 0;
        return await DBManager.runQuery(`SELECT count(*) as totalCount from member_zonemember_invitation_requests JOIN zone_master ON member_zonemember_invitation_requests.zone_id = zone_master.zone_id where member_zonemember_invitation_requests.user_id = ${user.id} AND member_zonemember_invitation_requests.is_deleted = 0 AND member_zonemember_invitation_requests.request_status = 1 and member_zonemember_invitation_requests.is_block = 0 and zone_master.is_deleted = 0`).then(async resTotal => {
            if (resTotal && resTotal.length && resTotal[0].totalCount) {
                totalRecords = resTotal[0].totalCount;
                
                let zoneMemberRecords = await DBManager.runQuery(`SELECT
                    zone_master.*
                    from member_zonemember_invitation_requests
                    JOIN zone_master
                    ON member_zonemember_invitation_requests.zone_id = zone_master.zone_id
                    where member_zonemember_invitation_requests.user_id = ${user.id} AND member_zonemember_invitation_requests.is_deleted = 0 AND member_zonemember_invitation_requests.request_status = 1 and member_zonemember_invitation_requests.is_block = 0 and zone_master.is_deleted = 0
                    ORDER BY member_zonemember_invitation_requests.${sortOrderBy} ${sortOrder} 
                    LIMIT ${pageoffset}, ${pageLimit}`)
                    
                if (zoneMemberRecords.length > 0) {
                    response = {
                        success: true, message: successMessages.GET_USER_MEMBER_ZONE_LIST, page: pageNumber,
                        totalRecord: totalRecords,
                        data: zoneMemberRecords
                    }
                } else {
                    response = { success: false, message: errorMessages.USER_IS_NOT_MEMBER_ZONE_LIST }
                }
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {
                response = { success: false, message: errorMessages.USER_IS_NOT_MEMBER_ZONE_LIST }
            }
            return awsRequestHelper.respondWithJsonBody(200, response);
        })
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
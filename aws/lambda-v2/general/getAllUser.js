"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const ITEMS_PER_PAGE = 10;
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        await utils.verifyUser(event.headers.Authorization);
        let parameters = event.queryStringParameters;
        let offset = 0;
        let zoneId = (event.queryStringParameters && event.queryStringParameters.zone_id) ? event.queryStringParameters.zone_id : '';
        let limit = ITEMS_PER_PAGE;
        if (event.queryStringParameters && Object.keys(event.queryStringParameters).length > 0) {
            if ('limit' in parameters && parameters.limit) {
                limit = parameters.limit;
            }
            if ('offset' in parameters && parameters.offset) {
                offset = (parameters.offset * limit) - limit;
            }
            // let totalRecord = await DBManager.countRecord('user_master');

            var sqlQryTotal = "SELECT  COUNT(*) as total FROM user_master WHERE user_id > 0";

            var fieldsObj = " user_master.user_id, user_master.username, user_master.first_name, user_master.last_name, user_master.about_you, user_master.profile_pic, user_master.city, user_master.description, user_master.email,user_master.quickblox_id, user_master.mobile_number, user_master.country_code";

            // let existingRecords = await DBManager.getLimitData('user_master', fieldsObj, offset, limit);
            var sqlQry = "SELECT " + fieldsObj + " FROM user_master WHERE user_id > 0 LIMIT " + limit + " OFFSET " + offset;
            if (zoneId) {
                sqlQry = `(SELECT ${ fieldsObj } FROM admin_zoneowner_invitation_requests JOIN user_master ON user_master.user_id = admin_zoneowner_invitation_requests.user_id  WHERE admin_zoneowner_invitation_requests.is_block = 0 and admin_zoneowner_invitation_requests.is_deleted = 0 and admin_zoneowner_invitation_requests.request_status = 1 and admin_zoneowner_invitation_requests.zone_id = ${ zoneId }) UNION (SELECT ${ fieldsObj } FROM member_zonemember_invitation_requests JOIN user_master ON user_master.user_id = member_zonemember_invitation_requests.user_id  WHERE member_zonemember_invitation_requests.is_block = 0 and member_zonemember_invitation_requests.is_deleted = 0 and member_zonemember_invitation_requests.request_status = 1 and member_zonemember_invitation_requests.zone_id = ${ zoneId }) LIMIT  ${ limit } OFFSET  ${ offset }`;
                sqlQryTotal = `(SELECT count(*) as totalCount FROM admin_zoneowner_invitation_requests JOIN user_master ON user_master.user_id = admin_zoneowner_invitation_requests.user_id  WHERE admin_zoneowner_invitation_requests.is_block = 0 and admin_zoneowner_invitation_requests.is_deleted = 0 and admin_zoneowner_invitation_requests.request_status = 1 and admin_zoneowner_invitation_requests.zone_id = ${ zoneId }) UNION (SELECT count(*) as totalCount FROM member_zonemember_invitation_requests JOIN user_master ON user_master.user_id = member_zonemember_invitation_requests.user_id  WHERE member_zonemember_invitation_requests.is_block = 0 and member_zonemember_invitation_requests.is_deleted = 0 and member_zonemember_invitation_requests.request_status = 1 and member_zonemember_invitation_requests.zone_id = ${ zoneId })`
            } else {
                sqlQry = "SELECT " + fieldsObj + " FROM user_master WHERE user_id > 0 LIMIT " + limit + " OFFSET " + offset;
                sqlQryTotal = "SELECT  count(*) as totalCount FROM user_master WHERE user_id > 0";
            }
            
            console.log("sqlQryTotal : ", sqlQryTotal);

            let total = 0;
            let totalRecord = await DBManager.runQuery(sqlQryTotal);
            if(totalRecord && totalRecord.length){
                if(totalRecord.length == 2){
                    total = totalRecord[0].totalCount + totalRecord[1].totalCount
                } else {
                    total = totalRecord[0].totalCount;
                }
            }

            if(total){
                let existingRecords = await DBManager.runQuery(sqlQry)
                if (existingRecords && existingRecords.length) {
                    existingRecords = existingRecords.filter(function (el) {
                        return el != null;
                    });

                    if (existingRecords && existingRecords.length) {
                        response = { success: true, message: successMessages.GET_USER_LIST, data: existingRecords, total: total, page: parseInt(offset), limit };
                    } else {
                        response = {
                            success: true, message: errorMessages.USER_NOT_FOUND, data: []
                        }
                    }
                } else {
                    response = { success: true, message: errorMessages.USER_NOT_FOUND, data: [] }
                }
            } else {
                response = { success: true, message: errorMessages.USER_NOT_FOUND, data: [] }
            }
            return awsRequestHelper.respondWithJsonBody(200, response);
        } else {
            awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, errorMessages.REQUIRED_QUERY_PARAMETERS);
        }
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
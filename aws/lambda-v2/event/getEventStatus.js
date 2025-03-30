"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const moment = require('moment');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let userId = user['id'];
        let status = (event.queryStringParameters && event.queryStringParameters.status) ? event.queryStringParameters.status.toLowerCase() : "live";
        let pageNumber = (event.queryStringParameters && event.queryStringParameters.page && event.queryStringParameters.page > 0) ? event.queryStringParameters.page : 1;
        let pageLimit = (event.queryStringParameters && event.queryStringParameters.limit) ? event.queryStringParameters.limit : 10;
        let zoneId = (event.queryStringParameters && event.queryStringParameters.zone_id) ? event.queryStringParameters.zone_id : 0;
        if (!status) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }

        let whereQuery = {};
        let customWhere = '';
        if (status == 'claimed') {
            whereQuery = { claimed_by: userId }
        } else if (status == 'closed') {
            whereQuery = { is_draft: 0, status: "inactive" }
        } else if (status == 'draft') {
            whereQuery = { is_draft: 1 }
        } else {
            whereQuery = { is_draft: 0 }
            customWhere = " AND (event_master.status = 'active' OR event_master.status = 'stop')"
        }

        if (zoneId && zoneId !== '' && zoneId > 0) {
            whereQuery._zone_id = zoneId
        }

        let pageoffset = (pageNumber * pageLimit) - pageLimit;

        let condition = 'AND';
        const wheryQry = Object.keys(whereQuery).map(function (key, index) {
            var value = typeof whereQuery[key] === "string" ? `'${whereQuery[key]}'` : `${whereQuery[key]}`;
            return `event_master.${key} = ${value}`;
        }).join(" " + condition + " ");

        let totalQueryEvent = `SELECT count(*) as totalCount FROM event_master
            WHERE ${wheryQry} AND _user_id = ${userId} AND is_deleted = 0 ${customWhere}`;
        return DBManager.runQuery(totalQueryEvent).then(async (data) => {
            if (data[0].totalCount) {
                let totalRecords = data[0].totalCount;

                let QueryEvent = `(SELECT * 
                    FROM event_master
                    WHERE ${wheryQry} AND _user_id = ${userId} AND is_deleted = 0 ${customWhere} )
                    UNION ALL 
                    (SELECT event_master.*
                        FROM event_administrator
                        JOIN event_master ON event_administrator._event_id = event_master.event_id
                        WHERE ${wheryQry} AND event_administrator._user_id = ${userId} AND event_master.is_deleted = 0 ${customWhere} 
                    )
                    ORDER BY start_date_time_ms DESC
                    LIMIT ${pageoffset},${pageLimit}`;

                return DBManager.runQuery(QueryEvent).then(async (data) => {
                    if (data.length > 0) {
                        await Promise.all(
                            await data.map(async (dataValue) => {
                                let EventTickets = await DBManager.getData("event_tickets", "*", { _event_id: dataValue.event_id });
                                if (EventTickets.length > 0) {
                                    dataValue.tickets_list = EventTickets;
                                } else {
                                    dataValue.tickets_list = []
                                }

                                let rewardGetQuery = `SELECT * FROM reward_master WHERE _event_id = ${dataValue.event_id} AND (status = 'active' OR status = 'completed' )`;
                                let rewardDetails = await DBManager.runQuery(rewardGetQuery);
                                if (rewardDetails.length > 0) {
                                    dataValue.reward_details = rewardDetails[0];
                                    dataValue.reward_details.start_date_ms = moment(dataValue.reward_details.start_date).format("X");
                                    dataValue.reward_details.end_date_ms = moment(dataValue.reward_details.end_date).format("X");
                                } else {
                                    dataValue.reward_details = {};
                                }
                            })
                        )
                        response = { success: true, message: successMessages.GET_EVENT_LIST, data: data, total: parseInt(totalRecords), page: parseInt(pageNumber), limit: parseInt(pageLimit) }
                    } else {
                        response = { success: false, message: errorMessages.NO_EVENTS_FOUND }
                    }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }).catch((error) => {
                    console.error("error : ", error);
                    return awsRequestHelper.respondWithJsonBody(500, response);
                });
            } else {
                response = { success: false, message: errorMessages.NO_EVENTS_FOUND }
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
}
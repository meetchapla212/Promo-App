const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require('./../common/utils');
const {
    errorMessages,
    successMessages
} = require("../common/constants");

module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let userId = (event.queryStringParameters && event.queryStringParameters.userId) ? event.queryStringParameters.userId : user['id'];
        var whereQry = { 'shared_event._user_id': userId };
        let pageNumber = (event.queryStringParameters && event.queryStringParameters.page && event.queryStringParameters.page > 0) ? event.queryStringParameters.page : 1;
        let pageLimit = (event.queryStringParameters && event.queryStringParameters.limit) ? event.queryStringParameters.limit : 10;
        let pageoffset = (pageNumber * pageLimit) - pageLimit;

        let totalRecords = 0;
        return await MDBObject.getJoinedData('shared_event', 'event_master', '_event_id', 'event_id', 'count(*) as totalCount', whereQry).then(data => {
            if (data[0].totalCount) {
                totalRecords = data[0].totalCount;

                // getJoinedData(tableName1, tableName2, table1ColumnName, table2ColumnName, fieldsObj = '*', whereObj = {}, condition = "AND", offset = -1, limit = -1, customWhere = '', orderBy = '')
                return MDBObject.getJoinedData('shared_event', 'event_master', '_event_id', 'event_id', 'event_master.*,shared_event.is_rewardShared', whereQry, "AND", pageoffset, pageLimit, '', ' ORDER BY id DESC').then(async dataGet => {
                    if (dataGet.length > 0) {
                        await Promise.all(
                            dataGet.map(async dataShared => {
                                let EventTickets = await MDBObject.getData("event_tickets", "*", { _event_id: dataShared.event_id });
                                if (EventTickets.length > 0) {
                                    dataShared.tickets_list = EventTickets;
                                } else {
                                    dataShared.tickets_list = []
                                }
                                await MDBObject.getData('reward_master', 'reward_id', { _event_id: dataShared.event_id }).then(data => {
                                    if (data.length > 0) {
                                        dataShared.reward_id = data[0].reward_id;
                                    } else {
                                        dataShared.reward_id = 0
                                    }
                                })
                                return dataShared;
                                // dataShared.rewardDetails = 
                            })
                        )
                        // .then(datareturn => {
                        //     // dataGet = datareturn;
                        // })
                        response = { success: true, message: successMessages.GET_USER_SHARED_EVENTS, data: dataGet, total: parseInt(totalRecords), page: parseInt(pageNumber), limit: parseInt(pageLimit) }
                    } else {
                        response = { success: true, message: errorMessages.NO_SHARED_EVENT }
                    }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                })
            } else {
                response = { success: true, message: errorMessages.NO_SHARED_EVENT }
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
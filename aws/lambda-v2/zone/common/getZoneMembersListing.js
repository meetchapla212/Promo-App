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
        let sortOrderBy = (event.queryStringParameters && event.queryStringParameters.orderBy) ? event.queryStringParameters.orderBy : 'invitation_id';
        let searchText = (event.queryStringParameters && event.queryStringParameters.search_text) ? event.queryStringParameters.search_text : '';
        let fetchWithoutLimit = (event.queryStringParameters && event.queryStringParameters.fetchWithoutLimit) ? true : false;

        let pageoffset = (pageNumber * pageLimit) - pageLimit;
        let totalRecords = 0;

        let queryZonetotalCount = `SELECT count(*) as totalCount from member_zonemember_invitation_requests as MZIR join user_master as UM on MZIR.user_id = UM.user_id join zone_master as ZM on ZM.zone_id = MZIR.zone_id where UM.is_deleted = 0 AND MZIR.is_deleted = 0 AND MZIR.zone_id = ${zone_id} AND MZIR.is_block = 0 AND MZIR.request_status = 1`;
        let queryZoneListing = `SELECT UM.user_id,UM.username, UM.first_name, UM.last_name,UM.profile_pic,UM.email, UM.quickblox_id, MZIR.is_block, MZIR.request_status,MZIR.date_created, ZM.zone_id, ZM.name as zone_name from member_zonemember_invitation_requests as MZIR join user_master as UM on MZIR.user_id = UM.user_id join zone_master as ZM on ZM.zone_id = MZIR.zone_id where UM.is_deleted = 0 AND MZIR.is_deleted = 0 AND MZIR.zone_id = ${zone_id} AND MZIR.is_block = 0 AND MZIR.request_status = 1`;
        if (searchText) {
            let serachInFields = ['first_name', 'last_name', 'email', 'username']
            let searchQry = serachInFields.map(function (key, index) {
                return `UM.${key} like '%${searchText}%'`;
            }).join(" OR ");
            queryZonetotalCount += ` AND (${searchQry})`
            queryZoneListing += ` AND (${searchQry})`
        }

        return await DBManager.runQuery(queryZonetotalCount).then(async (data) => {
            if(data && data.length && data[0].totalCount){
                totalRecords = data[0].totalCount
                //queryZoneListing += ` GROUP BY ZO.promo_user_id`;
                if (sortOrderBy === 'date_created') {
                    queryZoneListing += ` ORDER BY MZIR.${sortOrderBy} ${sortOrder}`;
                } else if (sortOrderBy === 'invitation_id') {
                    queryZoneListing += ` ORDER BY MZIR.${sortOrderBy} ${sortOrder}`;
                } else {
                    queryZoneListing += ` ORDER BY UM.${sortOrderBy} ${sortOrder}`;
                }
        
                if (!fetchWithoutLimit) {
                    queryZoneListing += `  LIMIT ${pageoffset},${pageLimit}`
                }
        
                return DBManager.runQuery(queryZoneListing).then(async (data) => {
                    let dataResponse = {
                        page: pageNumber,
                        totalRecord: totalRecords,
                        data: data
                    }
                    response = { success: true, message: successMessages.GET_ZONE_MEMBER_LIST, data: dataResponse }
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
                response = { success: true, message: successMessages.GET_ZONE_MEMBER_LIST, data: dataResponse }
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
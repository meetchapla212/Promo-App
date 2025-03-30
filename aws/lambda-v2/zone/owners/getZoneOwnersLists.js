const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const DBManager = new MDB();
const { errorMessages, successMessages } = require("../../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);

        let isUserIsZoneOwner = await DBManager.getData('user_master', 'count(*) as totalCount', { user_id: user.id, is_zone_owner: 1 });
        if (!isUserIsZoneOwner[0].totalCount) {
            response = { success: false, message: errorMessages.NOT_OWNER_OF_ANY_ZONE };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        let pageNumber = parseInt((event.queryStringParameters && event.queryStringParameters.page && event.queryStringParameters.page > 0) ? event.queryStringParameters.page : 1);
        let pageLimit = parseInt((event.queryStringParameters && event.queryStringParameters.limit) ? event.queryStringParameters.limit : 10);
        let sortOrder = (event.queryStringParameters && event.queryStringParameters.order) ? event.queryStringParameters.order : 'DESC';
        let sortOrderBy = (event.queryStringParameters && event.queryStringParameters.orderBy) ? event.queryStringParameters.orderBy : 'user_id';
        let searchText = (event.queryStringParameters && event.queryStringParameters.search_text) ? event.queryStringParameters.search_text : '';
        let fetchWithoutLimit = (event.queryStringParameters && event.queryStringParameters.fetchWithoutLimit) ? true : false;
        let zone_id = event.pathParameters['zone_id'];
        let pageoffset = (pageNumber * pageLimit) - pageLimit;
        
        let queryZoneCount = `SELECT count(*) as toalCount from admin_zoneowner_invitation_requests as AZIR join user_master as UM on AZIR.user_id = UM.user_id join zone_master as ZM on ZM.zone_id = AZIR.zone_id where UM.is_deleted = 0 AND AZIR.is_deleted = 0 AND AZIR.is_block = 0 AND AZIR.zone_id = ${zone_id}`;
        let queryZoneListing = `SELECT UM.user_id,UM.username, UM.first_name, UM.last_name,UM.profile_pic,UM.email, AZIR.is_block, AZIR.request_status, AZIR.date_created, ZM.zone_id, ZM.name as zone_name from admin_zoneowner_invitation_requests as AZIR join user_master as UM on AZIR.user_id = UM.user_id join zone_master as ZM on ZM.zone_id = AZIR.zone_id where UM.is_deleted = 0 AND AZIR.is_deleted = 0 AND AZIR.is_block = 0 AND AZIR.zone_id = ${zone_id}`;

        if (searchText) {
            let serachInFields = ['first_name', 'last_name', 'email', 'username']
            let searchQry = serachInFields.map(function (key, index) {
                return `UM.${key} like '%${searchText}%'`;
            }).join(" OR ");
            queryZoneCount += ` AND (${searchQry})`;
            queryZoneListing += ` AND (${searchQry})`;
        }

        return await DBManager.runQuery(queryZoneCount).then(async (data) => {
            if (data && data.length && data[0].toalCount && data[0].toalCount > 0) {
                totalRecords = data[0].toalCount;
                console.log("totalRecords : ", totalRecords);
                if (sortOrderBy === 'date_created') {
                    queryZoneListing += ` ORDER BY AZIR.${sortOrderBy} ${sortOrder}`;
                } else if (sortOrderBy === 'invitation_id') {
                    queryZoneListing += ` ORDER BY AZIR.${sortOrderBy} ${sortOrder}`;
                } else {
                    queryZoneListing += ` ORDER BY UM.${sortOrderBy} ${sortOrder}`;
                }

                if (!fetchWithoutLimit) {
                    queryZoneListing += `  LIMIT ${pageoffset},${pageLimit}`
                }

                return DBManager.runQuery(queryZoneListing).then(async (data) => {
                    response = {
                        success: true,
                        message: successMessages.GET_ZONE_OWNER_LIST,
                        data: {
                            page: pageNumber,
                            totalRecord: data[0].toalCount,
                            data: data
                        }
                    }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }).catch((error) => {
                    console.error("error : ", error);
                    return awsRequestHelper.respondWithJsonBody(500, response);
                });
            } else {
                response = {
                    success: true,
                    message: successMessages.GET_ZONE_OWNER_LIST,
                    data: {
                        page: pageNumber,
                        totalRecord: 0,
                        data: []
                    }
                }
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
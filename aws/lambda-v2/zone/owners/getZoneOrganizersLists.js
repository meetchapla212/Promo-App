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

        let queryZoneOrganizerCount = `SELECT count(*) as totalCount from admin_zoneorganizer_invitation_requests as AZOIR join user_master as UM on AZOIR.user_id = UM.user_id join zone_master as ZM on ZM.zone_id = AZOIR.zone_id where UM.is_deleted = 0 AND AZOIR.is_deleted = 0 AND AZOIR.zone_id = ${zone_id}`;
        let queryZoneOrganizerListing = `SELECT UM.user_id,UM.username, UM.first_name, UM.last_name,UM.profile_pic,UM.email, AZOIR.is_block, AZOIR.request_status,AZOIR.date_created, ZM.zone_id, ZM.name as zone_name from admin_zoneorganizer_invitation_requests as AZOIR join user_master as UM on AZOIR.user_id = UM.user_id join zone_master as ZM on ZM.zone_id = AZOIR.zone_id where UM.is_deleted = 0 AND AZOIR.is_deleted = 0 AND AZOIR.zone_id = ${zone_id}`;

        if (searchText) {
            let serachInFields = ['first_name', 'last_name', 'email', 'username']
            let searchQry = serachInFields.map(function (key, index) {
                return `UM.${key} like '%${searchText}%'`;
            }).join(" OR ");
            queryZoneOrganizerCount += ` AND (${searchQry})`;
            queryZoneOrganizerListing += ` AND (${searchQry})`;
        }

        return await DBManager.runQuery(queryZoneOrganizerCount).then(async (data) => {
            if (data[0].totalCount) {
                if (sortOrderBy === 'date_created') {
                    queryZoneOrganizerListing += ` ORDER BY AZOIR.${sortOrderBy} ${sortOrder}`;
                } else if (sortOrderBy === 'invitation_id') {
                    queryZoneOrganizerListing += ` ORDER BY AZOIR.${sortOrderBy} ${sortOrder}`;
                } else {
                    queryZoneOrganizerListing += ` ORDER BY UM.${sortOrderBy} ${sortOrder}`;
                }
                if (!fetchWithoutLimit) {
                    queryZoneOrganizerListing += `  LIMIT ${pageoffset},${pageLimit}`
                }

                return DBManager.runQuery(queryZoneOrganizerListing).then(async (data) => {
                    response = {
                        success: true,
                        message: successMessages.GET_ZONE_ORGANIZERS_LIST,
                        data: {
                            page: pageNumber,
                            totalRecord: data[0].totalCount,
                            data: data
                        }
                    }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                })
            } else {
                response = {
                    success: true,
                    message: successMessages.GET_ZONE_ORGANIZERS_LIST,
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
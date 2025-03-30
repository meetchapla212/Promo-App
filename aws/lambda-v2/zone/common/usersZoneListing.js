const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const DBManager = new MDB();
const { errorMessages, successMessages } = require("../../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let sortOrder = (event.queryStringParameters && event.queryStringParameters.order) ? event.queryStringParameters.order : 'DESC';
        let sortOrderBy = (event.queryStringParameters && event.queryStringParameters.orderBy) ? event.queryStringParameters.orderBy : 'zone_id';
        let user_id = user.id;
        
        let dataResponse = {
            totalRecords: 0,
            data: {
                organizer_zones: [],
                owner_zones: []
            }
        }
        
        let queryOrganizerZoneListing = `SELECT ZM.* from zone_master as ZM join admin_zoneorganizer_invitation_requests as AZOIR on AZOIR.zone_id = ZM.zone_id where AZOIR.is_deleted = 0 AND AZOIR.is_block = 0 AND AZOIR.request_status = 1 AND ZM.is_deleted = 0 AND AZOIR.user_id = ${user_id} ORDER BY ZM.${sortOrderBy} ${sortOrder}`;

        await DBManager.runQuery(queryOrganizerZoneListing).then(async (organizerZoneRes) => {
            let totalRecord = dataResponse.totalRecords += organizerZoneRes.length;
            dataResponse = {
                ...dataResponse,
                totalRecords: totalRecord,
                data: {
                    ...dataResponse.data,
                    "organizer_zones": organizerZoneRes
                }
            }    
        })

        let queryOwnerZoneListing = `SELECT ZM.* from zone_master as ZM join admin_zoneowner_invitation_requests as ZOIR on ZOIR.zone_id = ZM.zone_id where ZOIR.is_deleted = 0 AND ZOIR.is_block = 0 AND ZOIR.request_status = 1 AND ZM.is_deleted = 0 AND ZOIR.user_id = ${user_id} ORDER BY ZM.${sortOrderBy} ${sortOrder}`;

        await DBManager.runQuery(queryOwnerZoneListing).then(async (ownerZoneRes) => {
            let totalRecord = dataResponse.totalRecords += ownerZoneRes.length;
            dataResponse = {
                ...dataResponse,
                totalRecords: totalRecord,
                data: {
                    ...dataResponse.data,
                    "owner_zones": ownerZoneRes
                }
            }    
        })

        response = { success: true, message: successMessages.GET_USER_ZONE_LIST, data: dataResponse }
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
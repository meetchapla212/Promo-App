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

        let zoneId = event.pathParameters['zone_id'];
        let queryZoneListing = `SELECT *, (SELECT count(*) FROM admin_zoneowner_invitation_requests as AZIR  where AZIR.is_deleted = 0 AND AZIR.zone_id = ${zoneId}) as zone_owner_count, (SELECT count(*) FROM member_zonemember_invitation_requests as ZMIR where ZMIR.is_deleted = 0 AND ZMIR.zone_id = ${zoneId}) as zone_member_count, (SELECT count(*) FROM event_master as EM where EM.status="active" AND EM._zone_id = ${zoneId})as zone_events_count FROM zone_master where zone_id = ${zoneId} `;
        return DBManager.runQuery(queryZoneListing).then(async (data) => {
            if (data.length > 0) {
                let zoneData = data[0];
                let responseData = {
                    zone_id: zoneData.zone_id,
                    name: zoneData.name,
                    logo: zoneData.logo,
                    location: zoneData.location,
                    description: zoneData.description,
                    zone_domain: zoneData.zone_domain,
                    member_invitation_process: zoneData.member_invitation_process,
                    zone_owner_count: zoneData.zone_owner_count,
                    zone_member_count: zoneData.zone_member_count,
                    zone_events_count: zoneData.zone_events_count
                }

                response = { success: true, message: successMessages.GET_ZONE_DETAILS, data: responseData }
            } else {
                response = { success: false, message: errorMessages.ZONE_NOT_FOUND }
            }

            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch((error) => {
            console.error("error : ", error);
            return awsRequestHelper.respondWithJsonBody(500, response);
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
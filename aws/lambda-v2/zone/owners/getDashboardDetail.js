const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const DBManager = new MDB();
const { errorMessages } = require("../../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);

        let isUserIsZoneOwner = await DBManager.getData('user_master', 'count(*) as totalCount', { user_id: user.id, is_zone_owner: 1 });
        if (!isUserIsZoneOwner[0].totalCount) {
            response = { success: false, message: errorMessages.NOT_OWNER_OF_ANY_ZONE };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        let zoneCount = 0;
        let zoneOwnerCount = 0;
        let zoneMemberCount = 0;
        let zoneOrganizerCount = 0;
        let eventCount = 0;
        let latestEvents = [];

        let zoneCountQuery = `SELECT count(*) as zone_count FROM zone_master as ZM join admin_zoneowner_invitation_requests as AZIR on AZIR.zone_id = ZM.zone_id where ZM.is_deleted = 0 AND AZIR.is_deleted = 0 AND AZIR.user_id = ${user.id}`;

        //let zoneOwnerCountQuery = `SELECT UM.user_id, AZIR.user_id from admin_zoneowner_invitation_requests as AZIR join user_master as UM on AZIR.user_id = UM.user_id where UM.is_deleted = 0 AND AZIR.is_deleted = 0 GROUP BY AZIR.user_id`;

        let zoneOwnerCountQuery = `SELECT SUM((SELECT count(*) from admin_zoneowner_invitation_requests as AZR join user_master as UM 
            on AZR.user_id = UM.user_id where UM.is_deleted = 0 AND AZR.is_deleted = 0 AND AZR.request_status = '1' AND AZR.is_block = '0' AND AZR.zone_id = AZIR.zone_id)) as zone_owners_count  from admin_zoneowner_invitation_requests as AZIR join user_master as UM on AZIR.user_id = UM.user_id 
            where UM.is_deleted = 0 AND AZIR.is_deleted = 0 AND AZIR.request_status = '1' AND AZIR.is_block = '0' AND AZIR.user_id = ${user.id}`;

        let zoneEventsCountQery = `SELECT count(*) as event_count FROM event_master as EM join admin_zoneowner_invitation_requests as AZIR 
            on AZIR.zone_id = EM._zone_id where EM.status="active" AND EM.is_deleted = '0' AND AZIR.is_deleted = '0' 
            AND AZIR.request_status = '1' AND AZIR.is_block = '0' AND AZIR.user_id = ${user.id}`;

        // let zoneMembersCountQuery = `SELECT UM.user_id, MZIR.user_id from member_zonemember_invitation_requests as MZIR join user_master as UM on MZIR.user_id = UM.user_id where UM.is_deleted = 0 AND MZIR.request_status = 1 AND MZIR.is_deleted = 0 GROUP BY MZIR.user_id`;

        let zoneMembersCountQuery = `SELECT SUM((SELECT count(*) from member_zonemember_invitation_requests as MZR join user_master as UM 
            on MZR.user_id = UM.user_id where UM.is_deleted = 0 AND MZR.is_deleted = 0 AND MZR.zone_id = MZIR.zone_id)) as zone_members_count  from member_zonemember_invitation_requests as MZIR join user_master as UM on MZIR.user_id = UM.user_id 
            where UM.is_deleted = 0 AND MZIR.is_deleted = 0 AND MZIR.user_id = ${user.id}`;

        let zoneOrganizersCountQuery = `SELECT SUM((SELECT count(*) from admin_zoneorganizer_invitation_requests as OZR join user_master as UM 
            on OZR.user_id = UM.user_id where UM.is_deleted = 0 AND OZR.is_deleted = 0 AND OZR.zone_id = OZIR.zone_id)) as zone_organizers_count  from admin_zoneorganizer_invitation_requests as OZIR join user_master as UM on OZIR.user_id = UM.user_id 
            where UM.is_deleted = 0 AND OZIR.is_deleted = 0 AND OZIR.user_id = ${user.id}`;

        let latestEventsQuery = `SELECT EM.event_id, EM._user_id, EM._zone_id, EM.event_name, EM.description, EM.event_type, EM.event_image, EM.address, EM.start_date_time, EM.end_date_time, EM.event_location, EM.longitude, EM.latitude, EM.ticket_type, EM.cancel_reason, EM.status, EM.is_deleted, EM.dynamic_link, EM.venue_is, EM.state, EM.address_state, EM.city, EM.country, EM.date_created, ZM.zone_id, ZM.name as zone_name from event_master as EM join zone_master as ZM on ZM.zone_id = EM._zone_id join admin_zoneowner_invitation_requests as AZIR on ZM.zone_id = AZIR.zone_id where EM.is_deleted = 0 AND EM.status="active" AND AZIR.request_status = 1 AND AZIR.is_block = 0 AND AZIR.is_deleted = 0 AND AZIR.user_id = ${user.id} ORDER BY EM.date_created DESC LIMIT 0, 3`;

        await DBManager.runQuery(zoneCountQuery).then(async (data) => {
            zoneCount = data[0].zone_count || 0;
        });

        await DBManager.runQuery(zoneOwnerCountQuery).then(async (data) => {
            zoneOwnerCount = data[0].zone_owners_count || 0;
        });

        await DBManager.runQuery(zoneMembersCountQuery).then(async (data) => {
            zoneMemberCount = data[0].zone_members_count || 0;
        });

        await DBManager.runQuery(zoneOrganizersCountQuery).then(async (data) => {
            zoneOrganizerCount = data[0].zone_organizers_count || 0;
        });

        await DBManager.runQuery(zoneEventsCountQery).then(async (data) => {
            eventCount = data[0].event_count || 0;
        });

        await DBManager.runQuery(latestEventsQuery).then(async (eventsResult) => {
            latestEvents = eventsResult;
        })

        let finalresponse = {
            zone_count: zoneCount,
            zone_owner_count: zoneOwnerCount,
            zone_member_count: zoneMemberCount,
            zone_organizers_count: zoneOrganizerCount,
            event_count: eventCount,
            latest_events: latestEvents
        }

        response = { success: true, message: "Zone Owner Dashboard Detail", data: finalresponse }
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
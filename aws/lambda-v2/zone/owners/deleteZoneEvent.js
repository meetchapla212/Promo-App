const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const DBManager = new MDB();
const fs = require('fs');
const AWSManager = require('../../common/awsmanager');
const _ = require('lodash');
const { errorMessages, successMessages, emailAndPushNotiTitles } = require("../../common/constants");

const notifyUserOnRemoveZoneEvent = async (userDetails, eventDetails, zoneDetails) => {
    if (userDetails.email) {
        let tmpl = fs.readFileSync('./lambda-v2/emailTemplates/notify-user-on-remove-zone-event.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.LEAVE_ZONE_EVENT;
        let userName = utils.toTitleCase((userDetails.first_name && userDetails.last_name) ? userDetails.first_name + ' ' + userDetails.last_name : userDetails.username);
        let zoneName = zoneDetails.name;
        let eventName = eventDetails.event_name;

        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL, userName, eventName, zoneName
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([userDetails.email], mailBody, mailSubject);
        return;
    }
    return;
}

const notifyAdminOnRemoveZoneEvent = async (adminDetails, eventDetails, zoneDetails, userDetails) => {
    if (adminDetails.email) {
        let tmpl = fs.readFileSync('./lambda-v2/emailTemplates/notify-admin-on-remove-zone-event.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.LEAVE_ZONE_EVENT;
        let adminName = utils.toTitleCase((adminDetails.first_name && adminDetails.last_name) ? adminDetails.first_name + ' ' + adminDetails.last_name : adminDetails.username);
        let userName = utils.toTitleCase((userDetails.first_name && userDetails.last_name) ? userDetails.first_name + ' ' + userDetails.last_name : userDetails.username);
        let zoneName = zoneDetails.name;
        let eventName = eventDetails.event_name;

        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL, adminName, eventName, userName, zoneName
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([adminDetails.email], mailBody, mailSubject);
        return;
    }
    return;
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);

        let isUserIsZoneOwner = await DBManager.getData('user_master', 'count(*) as totalCount', { user_id: user.id, is_zone_owner: 1 });
        if (!isUserIsZoneOwner[0].totalCount) {
            response = { success: false, message: errorMessages.NOT_OWNER_OF_ANY_ZONE };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        let event_id = event.pathParameters['event_id'];
        let apiData = JSON.parse(event.body);
        
        let isSuperAdmin = await DBManager.getData('zone_admin_master', 'first_name, last_name, username, email', { user_id: 1 });
        let adminDetails = isSuperAdmin[0];

        let eventData = await DBManager.getData('event_master', 'event_name', { event_id: event_id });
        let eventDetails = eventData[0];
        
        let zoneData = await DBManager.getData('zone_master', 'name', { zone_id: apiData.zone_id });
        let zoneDetails = zoneData[0];
        
        let userData = await DBManager.getData('user_master', 'first_name, last_name, username, email', { user_id: user.id });
        let userDetails = userData[0];

        let queryZoneMemberListing = `SELECT UM.user_id,UM.username, UM.first_name, UM.last_name,UM.profile_pic,UM.email, MZIR.is_block, MZIR.request_status,MZIR.date_created, ZM.zone_id, ZM.name as zone_name from member_zonemember_invitation_requests as MZIR join user_master as UM on MZIR.user_id = UM.user_id join zone_master as ZM on ZM.zone_id = MZIR.zone_id where UM.is_deleted = 0 AND MZIR.is_deleted = 0 AND MZIR.request_status = 1 AND MZIR.is_block = 0 AND MZIR.zone_id = ${apiData.zone_id}`;
        let memberRecords = await DBManager.runQuery(queryZoneMemberListing);
        
        let queryZoneOwnerListing = `SELECT UM.user_id,UM.username, UM.first_name, UM.last_name,UM.profile_pic,UM.email, UM.is_block, AZIR.request_status, AZIR.date_created, ZM.zone_id, ZM.name as zone_name from admin_zoneowner_invitation_requests as AZIR join user_master as UM on AZIR.user_id = UM.user_id join zone_master as ZM on ZM.zone_id = AZIR.zone_id where UM.is_deleted = 0 AND AZIR.is_deleted = 0 AND AZIR.request_status = 1 AND AZIR.is_block = 0 AND AZIR.zone_id = ${apiData.zone_id}`;
        let ownerRecords = await DBManager.runQuery(queryZoneOwnerListing);

        await DBManager.dataUpdate("event_master", { _zone_id: 0 }, { event_id: event_id });

        //send notification mail to SuperAdmin
        await notifyAdminOnRemoveZoneEvent(adminDetails, eventDetails, zoneDetails, userDetails);

        //send notification mail to ZoneMember
        if (memberRecords.length > 0) {
            Promise.all(memberRecords.map(async (userDetails) => {
                await notifyUserOnRemoveZoneEvent(userDetails, eventDetails, zoneDetails);
            }));
        }

        //send notification mail to ZoneOwner
        if (ownerRecords.length > 0) {
            Promise.all(ownerRecords.map(async (userDetails) => {
                await notifyUserOnRemoveZoneEvent(userDetails, eventDetails, zoneDetails);
            }));
        }

        response = { success: true, message: successMessages.ZONE_EVENT_DELETED }
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
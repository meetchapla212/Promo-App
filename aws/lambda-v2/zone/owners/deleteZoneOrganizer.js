const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const Joi = require('joi');
const DBManager = new MDB();
const fs = require('fs');
const AWSManager = require('../../common/awsmanager');
const _ = require('lodash');
var moment = require('moment');
const dateFormatDB = "YYYY-MM-DD HH:mm:ss";
const { errorMessages, successMessages, emailAndPushNotiTitles } = require("../../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        zone_id: Joi.required()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
            allowUnknown: true
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
}

const notifyOrganizerOnRemoveFromZone = async (userDetails, zoneDetails) => {
    if (userDetails.email) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify-organizer-on-remove-from-zone.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.REMOVED_FROM_ZONE;
        let userName = utils.toTitleCase((userDetails.first_name && userDetails.last_name) ? userDetails.first_name + ' ' + userDetails.last_name : userDetails.username);
        let zoneName = zoneDetails.name;

        let templateVars = Object.assign({
            base_url: process.env.PROMO_BASE_URL,
            userName,
            zoneName
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([userDetails.email], mailBody, mailSubject);
        return
    }
    return;
}

const notifyAdminOnRemoveZoneOrganizer = async (adminDetails, userDetails, zoneDetails) => {
    if (userDetails.email) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify-admin-on-remove-zone-organizer.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.ORGANIZER_REMOVED_FROM_ZONE;
        let userName = utils.toTitleCase((userDetails.first_name && userDetails.last_name) ? userDetails.first_name + ' ' + userDetails.last_name : userDetails.username);
        let adminName = utils.toTitleCase((adminDetails.first_name && adminDetails.last_name) ? adminDetails.first_name + ' ' + adminDetails.last_name : adminDetails.username);
        let zoneName = zoneDetails.name;

        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            adminName,
            userName,
            zoneName
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([adminDetails.email], mailBody, mailSubject);
        return
    }
    return;
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let organizer_id = event.pathParameters['organizer_id'];
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        //Is User is owner of this zone
        let isUserIsOwnerOfCurrentZone = await DBManager.getData('admin_zoneowner_invitation_requests', 'count(*) as totalCount', {
            user_id: user.id, zone_id: apiData.zone_id, request_status: 1, is_block: 0, is_deleted: 0
        });
        if (!isUserIsOwnerOfCurrentZone[0].totalCount) {
            response = { success: false, message: errorMessages.NOT_OWNER_OF_THIS_ZONE_SO_UNABLE_TO_DELETE_ZONE_ORGANIZERS };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        let curentUtcTime = moment.utc().format(dateFormatDB);
        let isOrganizerEventOngoing = `SELECT count(*) totalCount as FROM event_master WHERE event_master.is_draft = 0 AND _user_id = ${organizer_id} AND is_deleted = 0  AND event_master.status = 'active'  AND (event_master.start_date_utc < '${curentUtcTime}' AND event_master.end_date_utc > '${curentUtcTime}') AND event_master._zone_id = ${apiData.zone_id} `;
        return await DBManager.runQuery(isOrganizerEventOngoing).then(async (organizersOnGoingEvent) => {
            if (organizersOnGoingEvent[0].totalCount) {
                response = {
                    success: false,
                    message: errorMessages.ONGOING_LIVE_EVENT_ASSOCIATED_WITH_ORGANIZE_SO_UNABLE_TO_REMOVE_ORGANIZER_FROM_ZONE_AT_THE_MOMENT
                }
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {

                let adminData = await DBManager.getData('user_master', 'first_name, last_name, username, email', { user_id: user.id });
                let adminDetails = adminData[0];

                let zoneData = await DBManager.getData('zone_master', 'name', { zone_id: apiData.zone_id });
                let zoneDetails = zoneData[0];

                let userData = await DBManager.getData('user_master', 'first_name, last_name, username, email', { user_id: organizer_id });
                let userDetails = userData[0];

                await DBManager.dataUpdate("admin_zoneorganizer_invitation_requests", { is_deleted: 1 }, { user_id: organizer_id, zone_id: apiData.zone_id, is_deleted: 0 });

                //send notification mail to Owner
                await notifyOrganizerOnRemoveFromZone(userDetails, zoneDetails);
                //send notification mail to SuperAdmin
                await notifyAdminOnRemoveZoneOrganizer(adminDetails, userDetails, zoneDetails);

                response = {
                    success: true,
                    message: successMessages.ZONE_ORGANIZER_DELETED
                }

                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        })
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
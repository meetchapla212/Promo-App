const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const Joi = require('joi');
const DBManager = new MDB();
const fs = require('fs');
const AWSManager = require('../../common/awsmanager');
const _ = require('lodash');
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

const notifyUserOnRemoveZoneOwner = async (userDetails, zoneDetails) => {
    if (userDetails.email) {
        let tmpl = fs.readFileSync('./lambda-v2/emailTemplates/notify-user-on-remove-zone-owner.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.LEAVE_ZONE;
        let userName = utils.toTitleCase((userDetails.first_name && userDetails.last_name) ? userDetails.first_name + ' ' + userDetails.last_name : userDetails.username);
        let zoneName = zoneDetails.name;

        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            userName,
            zoneName
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([userDetails.email], mailBody, mailSubject);
        return
    }
    return;
}

const notifyAdminOnRemoveZoneOwner = async (adminDetails, userDetails, zoneDetails) => {
    if (userDetails.email) {
        let tmpl = fs.readFileSync('./lambda-v2/emailTemplates/notify-admin-on-remove-zone-owner.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.LEAVE_ZONE;
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

        let isUserIsZoneOwner = await DBManager.getData('user_master', 'count(*) as totalCount', { user_id: user.id, is_zone_owner: 1 }, "AND");
        if (!isUserIsZoneOwner[0].totalCount) {
            response = { success: false, message: errorMessages.NOT_OWNER_OF_ANY_ZONE };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        let owner_id = user.id;
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        
        let isSuperAdmin = await DBManager.getData('zone_admin_master', 'first_name, last_name, username, email', { user_id: 1 });
        let adminDetails = isSuperAdmin[0];
        
        let zoneData = await DBManager.getData('zone_master', 'name', { zone_id: apiData.zone_id });
        let zoneDetails = zoneData[0];
        
        let userData = await DBManager.getData('user_master', 'first_name, last_name, username, email', { user_id: owner_id });
        let userDetails = userData[0];
        
        await DBManager.dataUpdate("admin_zoneowner_invitation_requests", { is_deleted: 1 }, { user_id: owner_id, zone_id: apiData.zone_id, is_deleted: 0 })

        //send notification mail to Owner
        await notifyUserOnRemoveZoneOwner(userDetails, zoneDetails);
        //send notification mail to SuperAdmin
        await notifyAdminOnRemoveZoneOwner(adminDetails, userDetails, zoneDetails);
  
        let zoneOwnerCountQuery = `SELECT count(*) as zone_owner_count FROM admin_zoneowner_invitation_requests as AZIR where AZIR.is_deleted = 0 AND AZIR.request_status = 1 AND AZIR.is_block = 0 AND AZIR.user_id = ${owner_id}`;
        let ownerInZoneCount = await DBManager.runQuery(zoneOwnerCountQuery);
        if (ownerInZoneCount[0].zone_owner_count <= 0) {
            await DBManager.dataUpdate("user_master", { is_zone_owner: 0, is_block: 0 }, { user_id: owner_id });
        }

        response = { success: true, message: successMessages.ZONE_OWNER_REMOVED }
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
const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const DBManager = new MDB();
const fs = require('fs');
const AWSManager = require('../../common/awsmanager');
const _ = require('lodash');
const { errorMessages, successMessages, emailAndPushNotiTitles } = require("../../common/constants");

const notifyUserOnRemoveZoneMember = async (userDetails, zoneDetails) => {
    if (userDetails.email) {
        let tmpl = fs.readFileSync('./lambda-v2/emailTemplates/notify-user-on-remove-zone-member.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.LEAVE_ZONE_MEMBER;
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

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let zoneId = event.pathParameters['zone_id'];
        let member_id = user.id;

        let isUserIsMemberOfCurrentZone = await DBManager.getData('member_zonemember_invitation_requests', 'user_id', {
            user_id: member_id, zone_id: zoneId, request_status: 1, is_block: 0, is_deleted: 0
        }, "AND");
        if (isUserIsMemberOfCurrentZone.length <= 0) {
            response = { success: false, message: errorMessages.NOT_ZONE_MEMBER_SO_UNABLE_TO_LEAVE };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        let zoneDetails = {}, memberDetails = {};
        let zoneData = await DBManager.getData('zone_master', 'name', { zone_id: zoneId });
        if (zoneData.length > 0) {
            zoneDetails = zoneData[0];
        }

        let memberData = await DBManager.getData('user_master', 'first_name, last_name, username, email', { user_id: member_id });
        if (memberData.length > 0) {
            memberDetails = memberData[0];
        }

        var whereQry = { user_id: member_id, zone_id: zoneId, is_deleted: 0 };
        var dataObj = { is_deleted: 1 };
        await DBManager.dataUpdate("member_zonemember_invitation_requests", dataObj, whereQry);

        //send notification mail to Member
        await notifyUserOnRemoveZoneMember(memberDetails, zoneDetails);

        response = { success: true, message: successMessages.LEFT_ZONE }
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
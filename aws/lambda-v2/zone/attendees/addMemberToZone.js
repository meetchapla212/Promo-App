const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const MDBObject = new MDB();
const fs = require('fs');
const AWSManager = require('../../common/awsmanager');
const _ = require('lodash');
const {
    errorMessages,
    emailAndPushNotiTitles,
    successMessages
} = require("../../common/constants");

const notifyUserOnMemberJoiningRequestSubmitted = async (userDetails, zoneDetails) => {
    if (userDetails.email) {
        let tmpl = fs.readFileSync('./lambda-v2/emailTemplates/notify-user-on-zone-member-joining-request-registered.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.ZONE_JOINING_REQUEST_REGISTERED;
        let userName = utils.toTitleCase((userDetails.first_name && userDetails.last_name) ? userDetails.first_name + ' ' + userDetails.last_name : userDetails.username);
        let zoneName = zoneDetails.name.toLowerCase() || '';

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

const sendCongratulationMailToUser = async (userDetails, zoneDetails) => {
    if (userDetails.email) {
        let tmpl = fs.readFileSync('./lambda-v2/emailTemplates/notify-user-on-become-zone-member.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.BECOME_ZONE_MEMBER;
        let userName = utils.toTitleCase((userDetails.first_name && userDetails.last_name) ? userDetails.first_name + ' ' + userDetails.last_name : userDetails.username);
        let zoneName = zoneDetails.name.toLowerCase() || '';

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
        let userId = user.id;
        let zoneDetails = {}, userDetails = {};

        let userExistInPromo = await MDBObject.getData('user_master', 'count(*) as totalCount', { user_id: userId });
        if (!userExistInPromo[0].totalCount) {
            response.message = "Failure, User not found in the system!"
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
        userDetails = userExistInPromo[0];

        let zoneExist = await MDBObject.getData('zone_master', 'count(*) as totalCount', { zone_id: zoneId });
        if (!zoneExist[0].totalCount) {
            response.message = "Failure, Invalid zone, not found in the system!"
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
        zoneDetails = zoneExist[0];

        let memberExistQuery = `SELECT is_deleted, request_status FROM member_zonemember_invitation_requests WHERE user_id = ${userId} AND zone_id = ${zoneId}`;
        let isUserZoneMember = await MDBObject.runQuery(memberExistQuery);
        if (isUserZoneMember.length > 0) {
            let existedMemberDetails = isUserZoneMember[0];
            if (existedMemberDetails.is_deleted == '0' && existedMemberDetails.request_status == "1") {
                response.message = "Failure, You're already member of this zone. Please login to access the zone!"
                return awsRequestHelper.respondWithJsonBody(200, response);
            }

            //update
            if (zoneDetails.member_invitation_process == 'manual') {
                //manual
                let zoneMemberBody = {
                    request_status: 1,
                    is_member_from_signup_url: 1,
                    is_deleted: 0
                }

                await MDBObject.dataUpdate('member_zonemember_invitation_requests', zoneMemberBody, { zone_id: zoneId, user_id: userId })
                await sendCongratulationMailToUser(userDetails, zoneDetails);

                response = { success: true, message: `${successMessages.BECOME_MEMBER_OF_ZONE} "${zoneDetails.name.toLowerCase()}" zone.` };
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {
                //automated
                if (zoneDetails.zone_domain !== '') {
                    let zoneDomains = zoneDetails.zone_domain.split(",");
                    const address = userDetails.email.split('@').pop()
                    let userFromZone = zoneDomains.includes(address);
                    if (userFromZone) {
                        let zoneMemberBody = {
                            request_status: 1,
                            is_member_from_signup_url: 1,
                            is_deleted: 0
                        }

                        await MDBObject.dataUpdate('member_zonemember_invitation_requests', zoneMemberBody, { zone_id: zoneId, user_id: userId })
                        await sendCongratulationMailToUser(userDetails, zoneDetails);

                        response = { success: true, message: `${successMessages.BECOME_MEMBER_OF_ZONE} "${zoneDetails.name.toLowerCase()}" zone.` };
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    } else {
                        let zoneMemberBody = {
                            request_status: 3,
                            is_member_from_signup_url: 1,
                            is_deleted: 0
                        }
                        await MDBObject.dataUpdate('member_zonemember_invitation_requests', zoneMemberBody, { zone_id: zoneId, user_id: userId });
                        await notifyUserOnMemberJoiningRequestSubmitted(userDetails, zoneDetails);

                        response = { success: true, message: `${successMessages.JOIN_ZONE_REQUEST_REGISTERED1} "${zoneDetails.name.toLowerCase()}" ${successMessages.JOIN_ZONE_REQUEST_REGISTERED2}` };
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    }
                } else {
                    let zoneMemberBody = {
                        request_status: 1,
                        is_member_from_signup_url: 1,
                        is_deleted: 0
                    }

                    await MDBObject.dataUpdate('member_zonemember_invitation_requests', zoneMemberBody, { zone_id: zoneId, user_id: userId })
                    await sendCongratulationMailToUser(userDetails, zoneDetails);

                    response = { success: true, message: `${successMessages.BECOME_MEMBER_OF_ZONE} "${zoneDetails.name.toLowerCase()}" zone.` };
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }
            }
        } else {
            //insert
            if (zoneDetails.member_invitation_process == 'manual') {
                //manual
                let zoneMemberCreateBody = {
                    zone_id: zoneId,
                    user_id: userId,
                    request_status: 1,
                    is_member_from_signup_url: 1,
                    is_deleted: 0
                }

                await MDBObject.dataInsert("member_zonemember_invitation_requests", zoneMemberCreateBody);
                await sendCongratulationMailToUser(userDetails, zoneDetails);

                response = { success: true, message: `${successMessages.BECOME_MEMBER_OF_ZONE} "${zoneDetails.name.toLowerCase()}" zone.` };
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {
                //automated
                if (zoneDetails.zone_domain !== '') {
                    let zoneDomains = zoneDetails.zone_domain.split(",");
                    const address = userDetails.email.split('@').pop();
                    let userFromZone = zoneDomains.includes(address || '')
                    if (userFromZone) {
                        let zoneMemberCreateBody = {
                            zone_id: zoneId,
                            user_id: userId,
                            request_status: 1,
                            is_member_from_signup_url: 1,
                            is_deleted: 0
                        }

                        await MDBObject.dataInsert("member_zonemember_invitation_requests", zoneMemberCreateBody);
                        await sendCongratulationMailToUser(userDetails, zoneDetails);

                        response = { success: true, message: `${successMessages.BECOME_MEMBER_OF_ZONE} "${zoneDetails.name.toLowerCase()}" zone.` };
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    } else {
                        let zoneMemberCreateBody = {
                            zone_id: zoneId,
                            user_id: userId,
                            request_status: 3,
                            is_member_from_signup_url: 1,
                            is_deleted: 0
                        }

                        await MDBObject.dataInsert("member_zonemember_invitation_requests", zoneMemberCreateBody);
                        await notifyUserOnMemberJoiningRequestSubmitted(userDetails, zoneDetails);

                        response = { success: true, message: `Success, Your request for joining the "${zoneDetails.name.toLowerCase()}" zone is registred successfully. We will send next mail for the approval or rejection shortly.` };
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    }
                } else {
                    let zoneMemberCreateBody = {
                        zone_id: zoneId,
                        user_id: userId,
                        request_status: 1,
                        is_member_from_signup_url: 1,
                        is_deleted: 0
                    }

                    await MDBObject.dataInsert("member_zonemember_invitation_requests", zoneMemberCreateBody);
                    await sendCongratulationMailToUser(userDetails, zoneDetails);

                    response = { success: true, message: `${successMessages.BECOME_MEMBER_OF_ZONE} "${zoneDetails.name.toLowerCase()}" zone.` };
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }
            }
        }
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
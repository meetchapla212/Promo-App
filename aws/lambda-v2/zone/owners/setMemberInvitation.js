const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const DBManager = new MDB();
const Joi = require('joi');
const fs = require('fs');
const AWSManager = require('../../common/awsmanager');
const _ = require('lodash');
const { errorMessages, successMessages, emailAndPushNotiTitles } = require("../../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        action: Joi.required(),
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

const notifyUserOnBecomeZoneMember = async (userDetails, zoneDetails) => {
    if (userDetails.email) {
        let tmpl = fs.readFileSync('./lambda-v2/emailTemplates/notify-user-on-become-zone-member.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.BECOME_ZONE_MEMBER;
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

const notifyUserOnRejectZoneMember = async (adminDetails, userDetails, zoneDetails) => {
    if (userDetails.email) {
        let tmpl = fs.readFileSync('./lambda-v2/emailTemplates/notify-user-on-reject-zone-member.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.REJECT_ZONE_MEMBER;
        let userName = utils.toTitleCase((userDetails.first_name && userDetails.last_name) ? userDetails.first_name + ' ' + userDetails.last_name : userDetails.username);
        let adminName = utils.toTitleCase((adminDetails.first_name && adminDetails.last_name) ? adminDetails.first_name + ' ' + adminDetails.last_name : adminDetails.username);
        let zoneName = zoneDetails.name;

        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            userName,
            adminName,
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
        if (user.is_zone_owner === 1) {
            let member_id = event.pathParameters['member_id'];
            let apiData = JSON.parse(event.body);
            await validate(apiData);
            const { action, zone_id } = apiData;

            if (member_id && zone_id && action) {

                let adminDetails = null, userDetails = null, zoneDetails = null;

                await DBManager.getData("zone_master", "name", { zone_id: zone_id }).then(zoneData => {
                    zoneDetails = zoneData[0];
                    return zoneDetails;
                });

                await DBManager.getData("user_master", 'first_name, last_name, username, email', { user_id: member_id }).then(result => {
                    userDetails = result[0];
                    return userDetails;
                });

                await DBManager.getData("user_master", 'first_name, last_name, username, email', { user_id: user.id }).then(result => {
                    adminDetails = result[0];
                    return adminDetails;
                })

                if (userDetails && zoneDetails) {
                    let getUserZoneMemberRequest = await DBManager.getData("member_zonemember_invitation_requests", "invitation_id, zone_id, user_id, request_status", { zone_id: zone_id, user_id: member_id, request_status: 3, is_member_from_signup_url: 1 });
                    if (getUserZoneMemberRequest.length > 0) {
                        let invitationRequestData = getUserZoneMemberRequest[0];
                        //request_status == 3 (pending to accept/reject), request_status == 2 (already rejected), request_status == 1 (alredy accept invitation)
                        if (invitationRequestData.request_status == 3) {
                            //process request
                            if (action === 'accept') {
                                //update request_status === 1
                                let whereQry = { user_id: member_id, zone_id: zone_id, request_status: 3, is_member_from_signup_url: 1 };
                                await DBManager.dataUpdate("member_zonemember_invitation_requests", { "request_status": 1 }, whereQry);

                                //send congratulation mail
                                await notifyUserOnBecomeZoneMember(userDetails, zoneDetails);
                                let dataResponse = {
                                    showLogin: false,
                                    message: `${successMessages.BECOME_MEMBER_OF_ZONE} ${zoneDetails.name} zone`
                                }
                                response = {
                                    success: true,
                                    message: `${successMessages.BECOME_MEMBER_OF_ZONE} ${zoneDetails.name} zone!`,
                                    data: dataResponse
                                }
                            } else if (action === 'reject') {
                                let whereQry = { user_id: member_id, zone_id: zone_id, request_status: 3, is_member_from_signup_url: 1 };
                                await DBManager.dataUpdate("member_zonemember_invitation_requests", { "request_status": 2 }, whereQry);

                                await notifyUserOnRejectZoneMember(adminDetails, userDetails, zoneDetails);
                                let dataResponse = {
                                    showLogin: false,
                                    message: successMessages.INVITATION_REJECTED
                                }

                                response = { success: true, message: successMessages.INVITATION_REJECTED, data: dataResponse }
                            } else {
                                let dataResponse = {
                                    showLogin: false,
                                    message: errorMessages.SOMETHING_WENT_WRONG
                                }
                                response = { success: false, message: errorMessages.SOMETHING_WENT_WRONG, data: dataResponse }
                            }
                        } else if (invitationRequestData.request_status == 2) {
                            // already rejected
                            if (action && action == 'reject') {
                                let dataResponse = {
                                    showLogin: false,
                                    message: errorMessages.ALREADY_REJECTED_ZONE_INVITATION
                                }
                                response = { success: false, message: errorMessages.ALREADY_REJECTED_ZONE_INVITATION, data: dataResponse }
                            } else {
                                let dataResponse = {
                                    showLogin: false,
                                    message: errorMessages.ALREADY_REJECTED_ZONE_MEMBER_INVITATION_TRY_AGAIN_WHEN_GET_NEW_INVITATION
                                }
                                response = {
                                    success: false,
                                    message: errorMessages.ALREADY_REJECTED_ZONE_MEMBER_INVITATION_TRY_AGAIN_WHEN_GET_NEW_INVITATION,
                                    data: dataResponse
                                }
                            }
                        } else if (invitationRequestData.request_status == 1) {
                            //already accepted
                            if (action && action == 'reject') {
                                let dataResponse = {
                                    showLogin: false,
                                    message: errorMessages.ALREADY_ZONE_MEMBER_SO_CAN_NOT_REJECT_INVITATION
                                }
                                response = {
                                    success: false, message: errorMessages.ALREADY_ZONE_MEMBER_SO_CAN_NOT_REJECT_INVITATION, data: dataResponse
                                }
                            } else {
                                let dataResponse = {
                                    showLogin: true,
                                    message: errorMessages.ALREADY_ZONE_MEMBER
                                }
                                response = { success: false, message: errorMessages.ALREADY_ZONE_MEMBER, data: dataResponse }
                            }
                        }
                    } else {
                        let dataResponse = {
                            showLogin: false,
                            message: errorMessages.SOMETHING_WENT_WRONG
                        }
                        response = { success: false, message: errorMessages.SOMETHING_WENT_WRONG, data: dataResponse }
                    }
                } else {
                    let dataResponse = {
                        showLogin: false,
                        message: errorMessages.SOMETHING_WENT_WRONG
                    }
                    response = { success: false, message: errorMessages.SOMETHING_WENT_WRONG, data: dataResponse }
                }

            } else {
                let dataResponse = {
                    showLogin: false,
                    message: errorMessages.INVALID_REQUEST_DATA
                }
                response = { success: false, message: errorMessages.INVALID_REQUEST_DATA, data: dataResponse }
            }

            return awsRequestHelper.respondWithJsonBody(200, response);
        } else {
            response = { success: true, message: errorMessages.NOT_OWNER_OF_ANY_ZONE };
            return awsRequestHelper.respondWithJsonBody(200, response);
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

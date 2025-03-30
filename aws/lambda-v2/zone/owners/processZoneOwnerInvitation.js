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
        token: Joi.required(),
        action: Joi.required(),
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

const notifyAdminOnInvitationAcceptedByUser = async (adminDetails, userDetails, zoneDetails) => {
    if (adminDetails.email) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify-admin-on-zone-owner-invitation-accepted.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.INVITATION_ACCEPTED;
        let adminName = utils.toTitleCase((adminDetails.first_name && adminDetails.last_name) ? adminDetails.first_name + ' ' + adminDetails.last_name : adminDetails.username);
        let userName = utils.toTitleCase((userDetails.first_name && userDetails.last_name) ? userDetails.first_name + ' ' + userDetails.last_name : userDetails.username);
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

const notifyAdminOnInvitationRejectedByUser = async (adminDetails, userDetails, zoneDetails) => {
    if (adminDetails.email) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify-admin-on-zone-owner-invitation-rejected.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.INVITATION_REJECTED;
        let adminName = utils.toTitleCase((adminDetails.first_name && adminDetails.last_name) ? adminDetails.first_name + ' ' + adminDetails.last_name : adminDetails.username);
        let userName = utils.toTitleCase((userDetails.first_name && userDetails.last_name) ? userDetails.first_name + ' ' + userDetails.last_name : userDetails.username);
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

const notifyUserOnRejectZoneOwner = async (userDetails, zoneDetails) => {
    if (userDetails.email) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify-user-on-reject-zone-owner.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.REJECT_ZONE_OWNER;
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

const notifyUserOnBecomeZoneOwner = async (userDetails, zoneDetails) => {
    if (userDetails.email) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify-user-on-become-zone-owner.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.BECOME_ZONE_OWNER;
        let userName = utils.toTitleCase((userDetails.first_name && userDetails.last_name) ? userDetails.first_name + ' ' + userDetails.last_name : userDetails.username);
        let zoneName = zoneDetails.name;
        let loginUrl = `${process.env.UI_BASE_URL}/login`;

        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            userName,
            zoneName,
            loginUrl
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
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        const { token, action } = apiData;
        let tokenDetails = utils.verifyJWT(token);
        let { admin_id, user_id, zone_id } = tokenDetails;

        if (admin_id && user_id && zone_id && action) {
            let adminDetails = null, userDetails = null, zoneDetails = null;

            await DBManager.getData("zone_master", "name", { zone_id: zone_id }).then(zoneData => {
                zoneDetails = zoneData[0];
                return zoneDetails;
            })
            await DBManager.getData("user_master", 'first_name, last_name, username, email', { user_id: user_id }).then(result => {
                userDetails = result[0];
                return userDetails;
            })

            await DBManager.getData("user_master", 'first_name, last_name, username, email', { user_id: admin_id }).then(result => {
                adminDetails = result[0];
                return adminDetails;
            })

            if (adminDetails && userDetails && zoneDetails) {
                let getUserZoneOwnerRequest = await DBManager.getData("admin_zoneowner_invitation_requests", "invitation_id, zone_id, user_id, request_status", { zone_id: zone_id, user_id: user_id }, "AND")
                if (getUserZoneOwnerRequest.length > 0) {
                    let invitationRequestData = getUserZoneOwnerRequest[0];
                    //request_status == 3 (pending to accept/reject), request_status == 2 (already rejected), request_status == 1 (alredy accept invitation)
                    if (invitationRequestData.request_status == 3) {
                        //process request
                        if (action === 'accept') {
                            //update request_status === 1
                            let whereQry = { user_id: user_id, zone_id: zone_id };
                            await DBManager.dataUpdate("admin_zoneowner_invitation_requests", { "request_status": 1 }, whereQry);

                            let userwhereQry = { user_id: user_id };
                            await DBManager.dataUpdate("user_master", { "is_zone_owner": 1 }, userwhereQry);

                            //send congratulation mail
                            await notifyUserOnBecomeZoneOwner(userDetails, zoneDetails);
                            await notifyAdminOnInvitationAcceptedByUser(adminDetails, userDetails, zoneDetails);
                            response = {
                                success: true,
                                message: `${successMessages.BECOME_OWNER_OF_ZONE} ${zoneDetails.name} zone, You can manage the zone from The Promo App.`
                            }
                        } else if (action === 'reject') {
                            let whereQry = { user_id: user_id, zone_id: zone_id };
                            await DBManager.dataUpdate("admin_zoneowner_invitation_requests", { "request_status": 2 }, whereQry);

                            await notifyUserOnRejectZoneOwner(userDetails, zoneDetails);
                            //notify admin on invitation rejected by user
                            await notifyAdminOnInvitationRejectedByUser(adminDetails, userDetails, zoneDetails);
                            response = {
                                success: true,
                                message: successMessages.INVITATION_REJECTED
                            }
                        } else {
                            response = {
                                success: false,
                                message: errorMessages.SOMETHING_WENT_WRONG
                            }
                        }
                    } else if (invitationRequestData.request_status == 2) {
                        // already rejected
                        if (action && action == 'reject') {
                            response = {
                                success: false,
                                message: errorMessages.ALREADY_REJECTED_ZONE_INVITATION
                            }
                        } else {
                            response = {
                                success: false,
                                message: errorMessages.ALREADY_REJECTED_ZONE_OWNER_INVITATION_TRY_AGAIN_WHEN_GET_NEW_INVITATION
                            }
                        }
                    } else if (invitationRequestData.request_status == 1) {
                        //already accepted
                        if (action && action == 'reject') {
                            response = {
                                success: false,
                                message: errorMessages.ALREADY_ZONE_OWNER_SO_CAN_NOT_REJECT_INVITATION
                            }
                        } else {
                            response = {
                                success: false,
                                message: errorMessages.ALREADY_ZONE_OWNER
                            }
                        }
                    }
                } else {
                    response = {
                        success: false,
                        message: errorMessages.SOMETHING_WENT_WRONG
                    }
                }
            } else {
                response = {
                    success: false,
                    message: errorMessages.SOMETHING_WENT_WRONG
                }
            }
        } else {
            response = {
                success: false,
                message: errorMessages.INVALID_REQUEST_DATA
            }
        }

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
const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const Joi = require('joi');
const DBManager = new MDB();
const fs = require('fs');
const AWSManager = require('../../common/awsmanager');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const {
    errorMessages,
    emailAndPushNotiTitles
} = require("../../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        invitationsToUsers: Joi.array().required(),
        invitationToZone: Joi.object().required(),
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

const createJWT = (parsedBody) => {
    //console.log('Inside createJWT', parsedBody);
    return jwt.sign(JSON.stringify(parsedBody), process.env.SHARED_SECRET);
};

const sendInvitationMail = async (userDetails, adminDetails, zoneDetails) => {
    if (userDetails.email) {
        let tokenData = {
            admin_id: adminDetails.user_id,
            user_id: userDetails.user_id,
            zone_id: zoneDetails.zone_id,
        }

        let token = createJWT(tokenData);
        let tmpl = fs.readFileSync('./lambda/emailtemplates/send-zone-owner-invitation.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.INVITATION_BECOME_ZONE_OWNER;

        let invitationAcceptLink = `${process.env.UI_BASE_URL}/zone-owner/invitation/process?token=${token}&action=accept`;
        let invitationDeclineLink = `${process.env.UI_BASE_URL}/zone-owner/invitation/process?token=${token}&action=reject`;
        let userName = utils.toTitleCase((userDetails.first_name && userDetails.last_name) ? userDetails.first_name + ' ' + userDetails.last_name : userDetails.username);
        let adminName = utils.toTitleCase((adminDetails.first_name && adminDetails.last_name) ? adminDetails.first_name + ' ' + adminDetails.last_name : adminDetails.username);
        let zoneName = zoneDetails.name;

        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            invitationAcceptLink,
            invitationDeclineLink,
            userName,
            adminName,
            zoneName
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([userDetails.email], mailBody, mailSubject);
        return;
    }
    return;
}

const saveInvitationRequest = async (body, userDetails, adminDetails, zoneDetails) => {
    let whereQry = { user_id: body.user_id, zone_id: body.zone_id };
    let isInvitationRequestExist = await DBManager.getData('admin_zoneowner_invitation_requests', '*', whereQry, "AND");
    if (isInvitationRequestExist.length <= 0) {
        await DBManager.dataInsert("admin_zoneowner_invitation_requests", body);
        await sendInvitationMail(userDetails, adminDetails, zoneDetails);
    } else {
        let zoneOwnerRequest = isInvitationRequestExist[0];
        if (zoneOwnerRequest.is_deleted == 0) {
            if (zoneOwnerRequest.request_status == 3 || zoneOwnerRequest.request_status == 2) {
                await DBManager.dataUpdate("admin_zoneowner_invitation_requests", { "request_status": 3, "is_block": 0, "is_deleted": 0 }, whereQry);
                await sendInvitationMail(userDetails, adminDetails, zoneDetails);
            }
        } else {
            await DBManager.dataUpdate("admin_zoneowner_invitation_requests", { "request_status": 3, "is_block": 0, "is_deleted": 0 }, whereQry);
            await sendInvitationMail(userDetails, adminDetails, zoneDetails)
        }
    }

    return {
        success: true,
        message: "Sucess, Invitation request saved successfully!"
    };
}

const inviteZoneOwner = async (userDetails, adminDetails, zoneDetails) => {
    let saveRequestData = {
        zone_id: zoneDetails.zone_id,
        user_id: userDetails.user_id,
        request_status: 3,
        is_deleted: 0
    }
    await saveInvitationRequest(saveRequestData, userDetails, adminDetails, zoneDetails);
    return;
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        let loggedInOwnersDetails = {};

        let isUserIsZoneOwner = await DBManager.getData('user_master', 'user_id, is_zone_owner', { user_id: user.id, is_zone_owner: 1 }, "AND");
        if (isUserIsZoneOwner.length <= 0) {
            response = { success: false, message: errorMessages.NOT_OWNER_OF_ANY_ZONE };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        loggedInOwnersDetails = isUserIsZoneOwner[0];

        let { invitationsToUsers, invitationToZone } = apiData;
        if (invitationToZone.zone_id) {
            //Is User is owner of this zone
            let isUserIsOwnerOfCurrentZone = await DBManager.getData('admin_zoneowner_invitation_requests', 'count(*) as totalCount', {
                user_id: user.id, zone_id: invitationToZone.zone_id, request_status: 1, is_block: 0, is_deleted: 0
            });
            if (!isUserIsOwnerOfCurrentZone[0].totalCount) {
                response = { success: false, message: errorMessages.NOT_OWNER_OF_THIS_ZONE_ONLY_ZONE_OWNERS_AUTHORIZED_TO_SEND_INVITATION_TO_OWNER };
                return awsRequestHelper.respondWithJsonBody(200, response);
            }

            if (invitationsToUsers.length > 0 && invitationToZone && loggedInOwnersDetails) {
                let not_existing_users = '';
                let adminDetails = loggedInOwnersDetails;
                await Promise.all(invitationsToUsers.map(async (invitedUser, index) => {
                    if (invitedUser && invitedUser.user_id && invitedUser.user_id != '') {
                        await inviteZoneOwner(invitedUser, adminDetails, invitationToZone);
                    } else {
                        let user = await DBManager.getData('user_master', 'user_id', { email: invitedUser.email });
                        if (user && user.length && user[0].user_id) {
                            invitedUser.user_id = user[0].user_id;
                            await inviteZoneOwner(invitedUser, adminDetails, invitationToZone);
                        } else {
                            not_existing_users += not_existing_users == '' ? `'${invitedUser.email}'` : `, '${invitedUser.email}'`;
                        }
                    }
                }))

                if (not_existing_users && not_existing_users != '') {
                    response = {
                        success: true,
                        message: "Success, Invitation send successfully! " + not_existing_users + " users not exist on our system."
                    }
                } else {
                    response = {
                        success: true,
                        message: "Success, Invitation send successfully!"
                    }
                }
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {
                response = { success: false, message: errorMessages.INVALID_DATA }
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        } else {
            response = { success: false, message: errorMessages.INVALID_ZONE_ID };
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
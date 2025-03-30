const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const Joi = require('joi');
const DBManager = new MDB();
const fs = require('fs');
const AWSManager = require('../../common/awsmanager');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const { errorMessages, emailAndPushNotiTitles } = require("../../common/constants");

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
        let tmpl = fs.readFileSync('./lambda-v2/emailTemplates/send-zone-organizer-invitation.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.INVITATION_BECOME_ZONE_ORGANIZER;

        let invitationAcceptLink = `${ process.env.UI_BASE_URL }/zone-organizer/invitation/process?token=${ token }&action=accept`;
        let invitationDeclineLink = `${ process.env.UI_BASE_URL }/zone-organizer/invitation/process?token=${ token }&action=reject`;
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
    let isInvitationRequestExist = await DBManager.getData('admin_zoneorganizer_invitation_requests', '*', whereQry, "AND");
    if (isInvitationRequestExist.length <= 0) {
        await DBManager.dataInsert("admin_zoneorganizer_invitation_requests", body);
        await sendInvitationMail(userDetails, adminDetails, zoneDetails);
    } else {
        let zoneOwnerRequest = isInvitationRequestExist[0];
        if (zoneOwnerRequest.is_deleted == 0) {
            if (zoneOwnerRequest.request_status == 3 || zoneOwnerRequest.request_status == 2) {
                await DBManager.dataUpdate("admin_zoneorganizer_invitation_requests", { "request_status": 3, "is_block": 0, "is_deleted": 0 }, whereQry);
                await sendInvitationMail(userDetails, adminDetails, zoneDetails);
            }
        } else {
            await DBManager.dataUpdate("admin_zoneorganizer_invitation_requests", { "request_status": 3, "is_block": 0, "is_deleted": 0 }, whereQry);
            await sendInvitationMail(userDetails, adminDetails, zoneDetails)
        }
    }

    return {
        success: true,
        message: "Sucess, Invitation request saved successfully!"
    };
}

const inviteZoneOrganizer = async (userDetails, adminDetails, zoneDetails) => {
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

        let { invitationsToUsers, invitationToZone } = apiData;

        var fieldsObj = "`user_id`, `username`, `email`, `first_name`, `last_name`";
        let existingRecords = await DBManager.getData('user_master', fieldsObj, { user_id: user.id }, "OR");
        if (invitationsToUsers.length > 0 && invitationToZone && existingRecords.length > 0) {
            let not_existing_users = '';
            let adminDetails = existingRecords[0];
            await Promise.all(invitationsToUsers.map(async (invitedUser, index) => {
                if (invitedUser && invitedUser.user_id && invitedUser.user_id != '') {
                    await inviteZoneOrganizer(invitedUser, adminDetails, invitationToZone);
                } else {
                    let user = await DBManager.getData('user_master', 'user_id', { email: invitedUser.email });
                    if (user && user.length && user[0].user_id) {
                        invitedUser.user_id = user[0].user_id;
                        await inviteZoneOrganizer(invitedUser, adminDetails, invitationToZone);
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
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
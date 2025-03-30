const awsRequestHelper = require("../../lambda/common/awsRequestHelper");
const MDB = require("../common/mysqlmanager");
const utils = require('../common/utils');
const Joi = require('joi');
const DBManager = new MDB();
const fs = require('fs');
const AWSManager = require('../common/awsmanager');
const _ = require('lodash');
const { errorMessages, successMessages, emailAndPushNotiTitles } = require("../common/constants");

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

const sendMailToAdminOnInvitationRejectByUser = async (eventDetails, adminDetails, eventId) => {
    if (adminDetails.email) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_admin_on_event_administrator_invitation_rejected_by_user.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.INVITATION_REJECTED;

        let adminName = utils.toTitleCase((adminDetails.first_name && adminDetails.last_name) ? adminDetails.first_name + ' ' + adminDetails.last_name : adminDetails.username);
        let eventName = eventDetails.event_name;
        let eventUrl = `${process.env.UI_BASE_URL}/eventdetails/${eventName}/${eventId}`;
        let manageEventUrl = `${process.env.UI_BASE_URL}/manageevent#liveevents`;

        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            adminName,
            eventName,
            eventUrl,
            manageEventUrl
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([adminDetails.email], mailBody, mailSubject);
        return;
    }
    return;
}


const sendMailToUserOnInvitationReject = async (tokenDetails, eventDetails, eventId) => {
    if (tokenDetails.email) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_user_on_event_administrator_invitation_rejected.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.INVITATION_REJECTED;

        let userName = utils.toTitleCase(tokenDetails.user_name);
        let eventName = eventDetails.event_name;
        let eventUrl = `${process.env.UI_BASE_URL}/eventdetails/${eventName}/${eventId}`;

        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            userName,
            eventName,
            eventUrl
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([tokenDetails.email], mailBody, mailSubject);
        return;
    }
    return;
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        const { token, action } = apiData;
        let tokenDetails = null;
        try {
            tokenDetails = utils.verifyJWT(token);
        } catch (error) {
            console.error("error : ", error);
            response = {
                success: false,
                signup: false,
                message: errorMessages.INVITATION_EXPIRED
            }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        if (tokenDetails) {
            var eventDetails = {}, adminDetails = {};
            if (tokenDetails._event_id && tokenDetails.admin_id) {
                await DBManager.getData("user_master", "first_name, last_name, username, email", { user_id: tokenDetails.admin_id }).then(result => {
                    adminDetails = result[0];
                    return adminDetails;
                })
                await DBManager.getData("event_master", "event_name", { event_id: tokenDetails._event_id }).then(eventData => {
                    eventDetails = eventData[0];
                    return eventDetails;
                })
            }

            let isInvitationSend = await DBManager.getData("event_administrator_guest", "request_status", { invitation_id: tokenDetails.invitation_id });
            if (isInvitationSend.length > 0) {
                let invitationData = isInvitationSend[0];
                //request_status (3 = pending, 2 = reject, 1 = accept)
                if (invitationData.request_status == 3) {
                    if (action && action == "accept") {
                        response = {
                            success: true,
                            signup: true,
                            message: successMessages.EVENT_ADMINISTATOR_INVITATION_PROCEEDED,
                            token
                        }
                    } else if (action && action == "reject") {
                        await DBManager.dataUpdate("event_administrator_guest", { request_status: 2 }, { invitation_id: tokenDetails.invitation_id });
                        await sendMailToUserOnInvitationReject(tokenDetails, eventDetails, tokenDetails._event_id);
                        await sendMailToAdminOnInvitationRejectByUser(eventDetails, adminDetails, tokenDetails._event_id);

                        response = {
                            success: true,
                            signup: false,
                            message: successMessages.EVENT_ADMINISTATOR_REJECT_INVITATION_PROCEEDED
                        }
                    } else {
                        response = { success: false, signup: false, message: errorMessages.SOMETHING_WENT_WRONG }
                    }
                } else if (invitationData.request_status == 2) {
                    if (action && action == "reject") {
                        response = {
                            success: false, signup: false,
                            message: errorMessages.ALREADY_REJECTED_EVENT_ADMINISTRATOR_INVITATION
                        }
                    } else {
                        response = {
                            success: false, signup: false,
                            message: errorMessages.ALREADY_REJECTED_EVENT_ADMINISTRATOR_INVITATION_TRY_AGAIN_WHEN_GET_NEW_INVITATION
                        }
                    }
                } else if (invitationData.request_status == 1) {
                    if (action && action == "reject") {
                        response = {
                            success: false,
                            signup: false,
                            message: errorMessages.ALREADY_EVENT_ADMINISTRATOR_SO_CAN_NOT_REJECT_INVITATION
                        }
                    } else {
                        response = {
                            success: false,
                            signup: false,
                            message: errorMessages.ALREADY_EVENT_ADMINISTRATOR_LOGIN_TO_MANAGE_EVENT
                        }
                    }
                } else {
                    response = { success: false, signup: false, message: errorMessages.SOMETHING_WENT_WRONG }
                }
            } else {
                response = { success: false, signup: false, message: errorMessages.INVITATION_EXPIRED }
            }
        } else {
            response = { success: false, signup: false, message: errorMessages.INVITATION_EXPIRED }
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
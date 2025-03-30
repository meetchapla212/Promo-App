const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("./../common/mysqlmanager");
const utils = require('../common/utils');
const MDBObject = new MDB();
const AWSManager = require('../common/awsmanager');
const fs = require('fs');
const _ = require('lodash');
// const jwt = require('jsonwebtoken');
const {
    errorMessages,
    emailAndPushNotiTitles
} = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        token: Joi.required(),
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

const sendMailToUserOnInvitationAccept = async (tokenDetails, userDetails, eventDetails, eventId) => {
    if (tokenDetails.email) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_user_on_event_administrator_invitation_accepted.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.INVITATION_ACCEPTED;

        let userName = utils.toTitleCase((userDetails.first_name && userDetails.last_name) ? userDetails.first_name + ' ' + userDetails.last_name : userDetails.username);
        let eventName = eventDetails.event_name;
        let eventUrl = `${process.env.UI_BASE_URL}/eventdetails/${eventName}/${eventId}`;

        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            userName,
            eventUrl,
            eventName
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([tokenDetails.email], mailBody, mailSubject);
        return;
    }
    return;
}

const sendMailToAdminOnInvitationAcceptByUser = async (eventDetails, adminDetails, eventId) => {
    if (adminDetails.email) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_admin_on_event_administrator_invitation_accepted_by_user.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.INVITATION_ACCEPTED;

        let adminName = utils.toTitleCase((adminDetails.first_name && adminDetails.last_name) ? adminDetails.first_name + ' ' + adminDetails.last_name : adminDetails.username);
        let eventName = eventDetails.event_name;
        let eventUrl = `${process.env.UI_BASE_URL}/eventdetails/${eventName}/${eventId}`;

        let templateVars = Object.assign({ 
            base_url: process.env.UI_BASE_URL, adminName, eventName, eventUrl
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
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        const { token } = apiData;
        let tokenDetails = null;
        try {
            tokenDetails = utils.verifyJWT(token);
        } catch (error) {
            console.error("error : ", error);
            response = {
                success: false,
                message: errorMessages.INVITATION_EXPIRED
            }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        if (tokenDetails) {
            let { email, _event_id, admin_id } = tokenDetails;
            var eventDetails = {}, adminDetails = {};
            if (_event_id && admin_id) {

                await MDBObject.getData("user_master", "email, first_name, last_name, username", { user_id: admin_id }).then(result => {
                    adminDetails = result[0];
                    return adminDetails;
                })

                await MDBObject.getData("event_master", "event_name", { event_id: _event_id }).then(eventData => {
                    eventDetails = eventData[0];
                    return eventDetails;
                })
            }

            let userExistInPromo = await MDBObject.getData("user_master", "user_id, first_name, last_name, username", { email });
            if (userExistInPromo.length > 0) {
                let userDetails = userExistInPromo[0];
                let isUserIsAdministrator = await MDBObject.getData('event_administrator', 'administrator_id', { _event_id, _user_id: userDetails.user_id }, "AND");
                if (isUserIsAdministrator.length <= 0) {
                    await MDBObject.dataInsert('event_administrator', { _event_id, _user_id: userDetails.user_id });
                    await MDBObject.dataUpdate("event_administrator_guest", { request_status: 1 }, { invitation_id: tokenDetails.invitation_id });

                    await sendMailToUserOnInvitationAccept(tokenDetails, userDetails, eventDetails, _event_id);
                    await sendMailToAdminOnInvitationAcceptByUser(eventDetails, adminDetails, _event_id);
                }

                response = {
                    success: true,
                    message: EVENT_ADMINISTATOR_CREATED
                }
            } else {
                response = {
                    success: false,
                    message: errorMessages.USER_NOT_FOUND_WITH_GIVEN_MAIL_COMPLETE_REGISTRATION_TO_BECOME_EVENT_ADMINISTRATOR
                }
            }
        } else {
            response = { success: false, message: errorMessages.INVITATION_EXPIRED }
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
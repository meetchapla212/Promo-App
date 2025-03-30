const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const utils = require('../common/utils');
const MDBObject = new MDB();
const AWSManager = require('../common/awsmanager');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const _ = require('lodash');
const { errorMessages, successMessages, emailAndPushNotiTitles } = require("../common/constants");

const createJWT = (parsedBody) => {
    console.log('Inside createJWT', parsedBody);
    return jwt.sign(JSON.stringify(parsedBody), process.env.SHARED_SECRET);
};

const sendMailToPromoUserOnBecomeEventAdministrator = async (administratorDetails, adminDetails, eventDetails, eventId) => {
    if (administratorDetails.email) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_user_on_become_event_administrator.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.BECOME_EVENT_ADMINISTRATOR;

        let userName = utils.toTitleCase((administratorDetails.first_name && administratorDetails.last_name) ? administratorDetails.first_name + ' ' + administratorDetails.last_name : administratorDetails.username);
        let adminName = utils.toTitleCase((adminDetails.first_name && adminDetails.last_name) ? adminDetails.first_name + ' ' + adminDetails.last_name : adminDetails.username);
        let eventName = eventDetails.event_name;
        let eventUrl = `${process.env.UI_BASE_URL}/eventdetails/${eventName}/${eventId}`;
        let manageEventUrl = `${process.env.UI_BASE_URL}/manageevent#liveevents`;

        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL, eventUrl, manageEventUrl, userName, adminName, eventName
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([administratorDetails.email], mailBody, mailSubject);
        return;
    }
}

const inviteOldUsers = async (promoUsers, eventId, eventDetails, adminDetails) => {
    return Promise.all(promoUsers.map(async (userId) => {
        let existingRecords = await MDBObject.getData('event_administrator', 'administrator_id', { _event_id: eventId, _user_id: userId }, "AND");
        if (existingRecords.length <= 0) {
            let userExistInPromo = await MDBObject.getData("user_master", "first_name, last_name, username, email", { user_id: userId });
            if (userExistInPromo.length > 0) {
                let administratorDetails = userExistInPromo[0];
                await MDBObject.dataInsert('event_administrator', { _event_id: eventId, _user_id: userId });
                await sendMailToPromoUserOnBecomeEventAdministrator(administratorDetails, adminDetails, eventDetails, eventId);
                return;
            }
        }
        return;
    }))
}


async function sendInvitationToNewUser(userName, userEmail, token, eventDetails, adminDetails, eventId) {
    if (userEmail) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/send-invitation-event-administrator.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.INVITATION_TO_BECOME_EVENT_ADMINISTRATOR;

        let invitationAcceptLink = `${process.env.UI_BASE_URL}/event/administrator/invitation-process?token=${token}&action=accept`;
        let invitationDeclineLink = `${process.env.UI_BASE_URL}/event/administrator/invitation-process?token=${token}&action=reject`;
        let guestName = utils.toTitleCase(userName);
        let adminName = utils.toTitleCase((adminDetails.first_name && adminDetails.last_name) ? adminDetails.first_name + ' ' + adminDetails.last_name : adminDetails.username);
        let eventName = eventDetails.event_name;
        let eventUrl = `${process.env.UI_BASE_URL}/eventdetails/${eventName}/${eventId}`;

        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL, invitationAcceptLink, invitationDeclineLink, userName: guestName, eventUrl, adminName, eventName
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([userEmail], mailBody, mailSubject);
        return;
    }
    return;
}

const inviteNewUsers = async (newUsers, eventId, eventDetails, adminDetails) => {
    return Promise.all(newUsers.map(async (newUser) => {
        let userExistInPromo = await MDBObject.getData("user_master", "user_id, first_name, last_name, username, email", { email: newUser.email });
        if (userExistInPromo.length > 0) {
            let isUserIsAdministrator = await MDBObject.getData('event_administrator', 'count(*) as totalCount', { _event_id: eventId, _user_id: userExistInPromo[0].user_id }, "AND");
            if (!isUserIsAdministrator[0].totalCount) {
                let administratorDetails = userExistInPromo[0];
                await MDBObject.dataInsert('event_administrator', { _event_id: eventId, _user_id: userExistInPromo[0].user_id })
                await sendMailToPromoUserOnBecomeEventAdministrator(administratorDetails, adminDetails, eventDetails, eventId);
                return;
            }
            return;
        } else {
            let isUserInvitationSend = await MDBObject.getData('event_administrator_guest', '*', { email: newUser.email, _event_id: eventId });
            if (isUserInvitationSend.length > 0) {
                if (isUserInvitationSend[0].request_status && (isUserInvitationSend[0].request_status == 3 || isUserInvitationSend[0].request_status == 2)) {
                    let token = createJWT({
                        email: newUser.email,
                        _event_id: eventId,
                        user_name: newUser.name,
                        admin_id: adminDetails.user_id,
                        invitation_id: isUserInvitationSend[0].invitation_id
                    });
                    await MDBObject.dataUpdate("event_administrator_guest", { request_status: 3, token: token }, { email: newUser.email, _event_id: eventId });

                    await sendInvitationToNewUser(newUser.name, newUser.email, token, eventDetails, adminDetails, eventId);
                    return;
                }
                return;
            } else {
                let createInvitationRequest = {
                    email: newUser.email,
                    _event_id: eventId,
                    request_status: 3
                }

                await MDBObject.dataInsert('event_administrator_guest', createInvitationRequest).then(async (saveResponse) => {
                    let invitationId = saveResponse.insertId;

                    let token = createJWT({
                        email: newUser.email,
                        _event_id: eventId,
                        user_name: newUser.name,
                        admin_id: adminDetails.user_id,
                        invitation_id: invitationId
                    });

                    await MDBObject.dataUpdate("event_administrator_guest", { token: token }, { invitation_id: invitationId });
                    await sendInvitationToNewUser(newUser.name, newUser.email, token, eventDetails, adminDetails, eventId);
                })
                return;
            }
        }
    }))
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let eventId = event.pathParameters.event_id;
        let user = await utils.verifyUser(event.headers.Authorization);
        let requestData = JSON.parse(event.body);
        let { existingUsers, newUsers } = requestData;

        var eventDetails = {}, adminDetails = {};
        await MDBObject.getData("event_master", "event_name", { event_id: eventId }).then(eventData => {
            eventDetails = eventData[0];
            return eventDetails;
        })

        await MDBObject.getData("user_master", "first_name, last_name, username, user_id", { user_id: user.id }).then(result => {
            adminDetails = result[0];
            return adminDetails;
        })

        if (existingUsers.length > 0) {
            await inviteOldUsers(existingUsers, eventId, eventDetails, adminDetails);
        }

        if (newUsers.length > 0) {
            await inviteNewUsers(newUsers, eventId, eventDetails, adminDetails);
        }

        response = { success: true, message: successMessages.INVITATION_SENT }
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
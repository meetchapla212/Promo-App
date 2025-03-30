const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const utils = require('../common/utils');
const MDBObject = new MDB();
const AWSManager = require('../common/awsmanager');
const dateFormat = "YYYY-MM-DD HH:mm:SS";
const moment = require('moment');
const _ = require('lodash');
const {
    errorMessages,
    successMessages,
    stringMessages,
    emailAndPushNotiTitles
} = require("../common/constants");

const fetchEvent = async (eventId) => {
    var sqlQry = "SELECT event_id FROM event_master WHERE event_id = " + eventId + " ";
    let eventResult = await MDBObject.runQuery(sqlQry);
    console.log("eventResult : ", eventResult);
    return eventResult[0].event_id;
}

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await MDBObject.getData("app_token_master", "token", { _user_id: userId });
    console.log("userDeviceTokenData: ", userDeviceTokenData);
    return userDeviceTokenData;
}

//When someone who follows the organizer claims an event notify interested users
const notifyInterestedUserOnEventClaim = async (event_id, user, interestedUserId) => {
    var userDeviceTokenData = await getUserDeviceToken(interestedUserId);
    var userName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.EVENT_CLAIMED,
            body: `${userName} ${emailAndPushNotiTitles.USER_CLAIMED_EVENT_MIGHT_BE_INTEREST_TO_YOU}`,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: user.user_id,
        _event_id: event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({
            messageFrom: stringMessages.PROMO_TEAM
        }),
        notify_user_id: interestedUserId,
        notify_text: `${userName} ${emailAndPushNotiTitles.USER_CLAIMED_EVENT_MIGHT_BE_INTEREST_TO_YOU}`,
    }
    return await MDBObject.dataInsert("user_notification", saveObj);
}

module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let eventId = event.pathParameters.event_id;
        let user = await utils.verifyUser(event.headers.Authorization);

        var loggedUserDetails = {};
        await MDBObject.getData("user_master", "first_name, last_name, username, user_id", { user_id: user.id }).then(result => {
            loggedUserDetails = result[0];
            return loggedUserDetails;
        })

        let Params = JSON.parse(event.body);
        Params = {
            ...Params,
            '_user_id': user['id'],
            'claimed_by': user['id'],
            'claimed_on': moment().format(dateFormat),
            'is_draft': 1
        }
        
        return MDBObject.dataUpdate("event_master", Params, { event_id: eventId, _user_id: 0 }).then(async (data) => {

            //When someone who follows the organizer claims an event notify interested users
            let eventInterestedUserQuery = `SELECT user_id FROM going_users_in_event where event_id = ${eventId} AND user_id != ${user.id} AND (type_going = 'May be' OR type_going = 'Going')  AND is_deleted = '0'`;
            let eventInterestedUserList = await MDBObject.runQuery(eventInterestedUserQuery);
            let event_id = await fetchEvent(eventId);
            if (eventInterestedUserList.length > 0 && eventDetails.length > 0) {
                await Promise.all(eventInterestedUserList.map(async (interestedUser) => {
                    var interestedUserId = interestedUser.user_id;
                    return await notifyInterestedUserOnEventClaim(event_id, loggedUserDetails, interestedUserId)
                }))
            }

            if (data.affectedRows > 0) {
                response = { success: true, message: successMessages.EVENT_CLAIMED }
            } else {
                response = { success: false, message: errorMessages.YOU_ARE_NOT_ABLE_TO_CLAIM_THIS_EVENT }
            }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch((error) => {
            console.error("error : ", error);
            return awsRequestHelper.respondWithJsonBody(500, response);
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
"use strict";
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const DBManager = new DBM();
const utils = require("../common/utils");
const FILE_PATH = __filename;
const {
    errorMessages,
    successMessages
} = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };
    try {
        let apiData = JSON.parse(event.body);
        let eventId = event.pathParameters.event_id;
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);

        return await DBManager.getData("user_bank_info", "count(*) as totalCount", { _user_id: user.id, bank_id: apiData.bank_id }).then(async (userBanks) => {
            if (userBanks[0].totalCount) {
                await DBManager.getData("user_tickets", "count(*) as totalCount", { event_id: eventId }).then(async (eventres) => {
                    if (eventres[0].totalCount) {
                        return (response = {
                            success: false,
                            message: successMessages.TICKET_ALREADY_PURCHASED_BY_OTHER,
                        });
                    } else {
                        await DBManager.dataUpdate("event_master", { bank_id: apiData.bank_id }, { event_id: eventId });
                        return (response = {
                            success: true,
                            message: successMessages.PAYOUT_BANK_CHANGED,
                        });
                    }
                });
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {
                response = {
                    success: false,
                    message: errorMessages.USER_NOT_BELONG_WITH_THIS_BANK_ACCOUNT
                };
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
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
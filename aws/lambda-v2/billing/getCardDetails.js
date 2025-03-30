"use strict";
const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        // let fieldsObj = "user_master.user_id, user_master.username, user_master.first_name, user_master.last_name "

        let existingRecords = await DBManager.getData('user_master', 'stripe_customer_id,stripe_defualt_card', { user_id: user['id'] });
        if (existingRecords && existingRecords.length && existingRecords[0].stripe_defualt_card != '') {
            let client_card_Details = await stripe.customers.retrieveSource(
                existingRecords[0].stripe_customer_id,
                existingRecords[0].stripe_defualt_card,
            ).then(res => {
                return res;
            });
            if (client_card_Details) {
                response = { success: true, message: successMessages.GET_USER_CARD, data: client_card_Details }
            } else {
                response = { success: false, message: errorMessages.CARD_DETAILS_NOT_FOUND }
            }
        } else {
            response = { success: true, message: errorMessages.INVALID_USER }
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
}
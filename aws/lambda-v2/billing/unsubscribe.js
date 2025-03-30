"use strict";
const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require("../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const DBManager = new DBM();
const utils = require("../common/utils");
const FILE_PATH = __filename;
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        let userId = user.id;
        let userGetwayId = await DBManager.getData("user_payment_gateway", "gateway_id", { _user_id: userId });
        if (userGetwayId && userGetwayId.length && userGetwayId[0].gateway_id) {
            let subscriptions = await stripe.subscriptions.list({ customer: userGetwayId[0].gateway_id })
            if (subscriptions && subscriptions.data && subscriptions.data.length > 0) {
                await stripe.subscriptions.del(subscriptions.data[0].id);
                await DBManager.dataUpdate("user_master", { current_plan: "free" }, { user_id: userId });
                response = { success: true, message: successMessages.USER_PLAN_UNSUBSCRIBED };
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {
                response = { success: false, message: errorMessages.NOT_SUBSCRIBED_TO_THIS_PLAN };
                return awsRequestHelper.respondWithJsonBody(400, response);
            }
        } else {
            response = { success: false, message: errorMessages.NOT_SUBSCRIBED_ANY_PLAN };
            return awsRequestHelper.respondWithJsonBody(400, response);
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
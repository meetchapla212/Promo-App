"use strict";
const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const DBManager = new DBM();
const utils = require("../common/utils");
const { errorMessages } = require("../common/constants");

const getCustomerGetwayDetails = async function (user_id) {
    return await DBManager.getData("user_payment_gateway", "gateway_id", {
        _user_id: user_id
    }).then(data => {
        return data;
    });
};

module.exports.handler = async (event, context, callback) => {
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let userChargeId = await getCustomerGetwayDetails(user.id);
        if (userChargeId) {
            let charges = await stripe.charges.list({
                customer: userChargeId[0].gateway_id,
                limit: 100
            });
            return awsRequestHelper.respondWithJsonBody(200, charges);
        } else {
            response = {
                success: true,
                message: errorMessages.USER_HAVE_NOT_ANY_TRANSACTION_HISTORY
            };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
    } catch (error) {
        return awsRequestHelper.respondWithSimpleMessage(500, error.message);
    }
};
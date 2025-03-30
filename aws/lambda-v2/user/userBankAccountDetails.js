const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

async function getUserDetails(userId) {
    return new Promise(async (resolve, reject) => {
        let sqlQry = `SELECT stripe_customer_id FROM user_master WHERE user_id = ${userId}`;
        let userDetails = await DBManager.runQuery(sqlQry);
        return resolve(userDetails);
    })
}

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        var userId = user.id;
        let bankToken = event.pathParameters.bank_token;
        var userDetails = await getUserDetails(userId);
        var userCustomerId = userDetails[0].stripe_customer_id;
        if (!userCustomerId) {
            response = { success: false, message: errorMessages.USER_HAVE_NOT_LINKED_ACCOUNT };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
        if (bankToken) {
            let bankAddResponse = await stripe.customers.retrieveSource(userCustomerId, bankToken);
            response = { success: true, message: successMessages.GET_BANK_ACCOUNT_DETAILS, data: bankAddResponse }
            return awsRequestHelper.respondWithJsonBody(200, response);
        } else {
            response = { success: false, message: errorMessages.USER_HAVE_NOT_LINKED_ACCOUNT };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
    } catch (error) {
        response.message = error.message;
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
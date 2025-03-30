const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

// async function getUserDetails(userId) {
//     return new Promise(async (resolve, reject) => {
//         let sqlQry = "SELECT stripe_customer_id FROM user_master WHERE user_id = " + userId + " ";
//         let userDetails = await DBManager.runQuery(sqlQry);
//         return resolve(userDetails);
//     })
// }

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        var userId = user.id;
        let bankToken = event.pathParameters.bank_token;

        // var userDetails = await getUserDetails(userId);
        // var customerID = userDetails[0].stripe_customer_id;
        let userAccId = '';
        let userAccountDetails = await DBManager.getData('user_master', 'stripe_account_id', { user_id: userId });
        if (userAccountDetails.length > 0) {
            if (userAccountDetails[0].stripe_account_id != "") {
                userAccId = userAccountDetails[0].stripe_account_id;
            } else {
                response = { success: false, message: errorMessages.USER_HAVE_NOT_LINKED_ACCOUNT }
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        }

        if (userAccId == "") {
            response = { success: false, message: errorMessages.USER_HAVE_NOT_LINKED_ACCOUNT }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
        // if (!customerID) {
        //     response = { success: false, message: "User have not any account linked yet." };
        //     return awsRequestHelper.respondWithJsonBody(200, response);
        // }

        if (!bankToken) {
            response = { success: false, message: errorMessages.REQUIRED_BANK_TOKEN_TO_DELETE };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        // return await stripe.customers.deleteSource(customerID, bankToken).
        return await stripe.accounts.deleteExternalAccount(userAccId,bankToken).then(async confirmation => {
            await DBManager.dataDelete('user_bank_info', { stripe_bank_id: confirmation.id })
            response = { success: true, message: successMessages.BANK_ACCOUNT_REMOVED };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch(error => {
            console.error("error : ", error);
            response = { success: false, message: error.message };
            return awsRequestHelper.respondWithJsonBody(200, response);
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
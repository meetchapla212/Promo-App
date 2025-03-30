const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

// const getCustomerGetwayDetails = async function (user_id) {
//     return await DBManager.getData("user_payment_gateway", "gateway_id", { "_user_id": user_id }).then(data => {
//         return data;
//     });
// }

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let userId = user.id;
        let bankToken = event.pathParameters.bank_token;
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

        await stripe.accounts.updateExternalAccount(userAccId, bankToken, {
            default_for_currency: true
        });

        let updateQuery = `UPDATE user_bank_info SET is_default =  
            CASE 
                WHEN stripe_bank_id = '${bankToken}'
                THEN 1
                ELSE 0
            END
            WHERE _user_id = ${user.id};`;
        return DBManager.runQuery(updateQuery).then(async (data) => {

        // return await DBManager.dataUpdate('user_bank_info', { is_default: 0 }, { _user_id: user.id }).then(async res => {
        //     await DBManager.dataUpdate('user_bank_info', { is_default: 1 }, { _user_id: user.id, stripe_bank_id: bankToken });
            response = { success: true, message: successMessages.BANK_ACCOUNT_CHANGED }
            return awsRequestHelper.respondWithJsonBody(200, response);
        })
    } catch (error) {
        response.message = error.message;
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
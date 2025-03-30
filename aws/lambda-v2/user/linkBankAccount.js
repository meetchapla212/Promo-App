const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

// const Joi = require('joi');
// const validate = function (body) {
//     const schema = Joi.object().keys({
//         bankToken: Joi.string().required()
//     });
//     return new Promise((resolve, reject) => {
//         Joi.validate(body, schema, {
//             abortEarly: false,
//             allowUnknown: true
//         }, function (error, value) {
//             if (error) {
//                 reject({ status_code: 400, message: error.details[0].message });
//             } else {
//                 resolve(value);
//             }
//         });
//     });
// }

async function getUserDetails(userId) {
    return new Promise(async (resolve, reject) => {
        let sqlQry = "SELECT stripe_customer_id FROM user_master WHERE user_id = " + userId + " ";
        let userDetails = await DBManager.runQuery(sqlQry);
        return resolve(userDetails);
    })
}

const createCustomer = async function (user_id, username) {
    return stripe.customers.create({
        description: 'Create new Customer ' + username,
        metadata: {
            "user": user_id
        }
    }).then(async (res) => {
        let whereQry = { user_id: user_id };
        await DBManager.dataUpdate("user_master", { "stripe_customer_id": res.id }, whereQry);
        return res;
    });
}

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        var userId = user.id;
        let bankToken = event.pathParameters.bank_token;

        var userDetails = await getUserDetails(userId);
        var customerID = userDetails[0].stripe_customer_id;
        if (!customerID) {
            let customerIdResponse = await createCustomer(user.id, user.username);
            if (customerIdResponse) {
                customerID = customerIdResponse.id;
            }
        }
        // acct_1GWJjzB0IBl109zi
        // let bankAddResponse = await stripe.customers.createSource(customerID, { source: bankToken });
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
        let bankAddResponse = await stripe.accounts.createExternalAccount(userAccId, {
            external_account: bankToken
        });

        // let userBankDetails = await DBManager.getData('user_bank_info', '*', { _user_id: user.id, is_default: 1 });

        let userArray = {
            stripe_bank_id: bankAddResponse.id,
            _user_id: user.id,
            account_holder_name: bankAddResponse.account_holder_name,
            account_holder_type: bankAddResponse.account_holder_type,
            bank_name: bankAddResponse.bank_name,
            last4: bankAddResponse.last4,
            routing_number: bankAddResponse.routing_number,
            is_default: 1
        }
        await DBManager.dataUpdate('user_bank_info', { is_default: 0 }, { _user_id: user.id })
        await DBManager.dataInsert('user_bank_info', userArray);
        response = { success: true, message: successMessages.BANK_ACCOUNT_LINKED }
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        response.message = error.message;
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
var Stripe = require("stripe"); //this key should be the private key
const stripe = new Stripe(process.env.STRIPE_KEY, { apiVersion: '2020-03-02' });
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

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        var userId = user.id;
        var userEmail = user.email || '';
        let userAccountId = '';
        let collect = 'eventually_due';
        
        let userDetails = await DBManager.getData('user_master', 'stripe_account_id', { user_id: user.id });
        if (userDetails[0].stripe_account_id == "") {
            let stripeConnectObject = {
                country: apiData.country && apiData.country != '' ? apiData.country : 'US',
                type: "custom",
                business_type: "individual",
                requested_capabilities: ["card_payments", "transfers"]
            };
            if (userEmail != '') {
                stripeConnectObject.email = userEmail;
            }
            let stripeAccount = await stripe.accounts.create(stripeConnectObject);
            let stripeAccId = stripeAccount.id;
            await DBManager.dataUpdate('user_master', { stripe_account_id: stripeAccId, stripe_country: apiData.country && apiData.country != '' ? apiData.country : 'US' }, { user_id: userId });
            userAccountId = stripeAccId;
        } else {
            userAccountId = userDetails[0].stripe_account_id;
            collect = 'currently_due';
        }
        // success_url: 'https://test.thepromoapp.com/stripeaccount/success',
        // failure_url: 'https://test.thepromoapp.com/stripeaccount/failure',    
        let accountLink = await stripe.accountLinks.create({
            account: userAccountId,
            failure_url: apiData.failure_url,
            success_url: apiData.success_url,
            type: 'custom_account_verification',
            collect: collect
        });
        response = { success: true, message: successMessages.STRIPE_ACCOUNT_CREATED, data: accountLink }
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        response.message = error.message;
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
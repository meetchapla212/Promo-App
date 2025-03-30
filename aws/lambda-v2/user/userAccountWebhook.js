const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const { errorMessages, successMessages } = require("../common/constants");
// const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
// const Joi = require('joi');
// const utils = require('../common/utils');

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {

        let ApiData = JSON.parse(event.body);
        let accountId = ApiData.data.object.id;

        if (ApiData.type == 'account.updated') {
            let verifiedStatus = ApiData.data.object.individual.verification.status;
            let chargesEnabled = ApiData.data.object.charges_enabled;
            let payoutsEnabled = ApiData.data.object.payouts_enabled;

            let updateJson = {
                is_verified: verifiedStatus == 'verified' ? 1 : 0,
                charges_enabled: chargesEnabled ? 1 : 0,
                payouts_enabled: payoutsEnabled ? 1 : 0
            }

            // if (verifiedStatus && verifiedStatus != '' && verifiedStatus == 'verified') {
            await DBManager.dataUpdate('user_master', updateJson, { stripe_account_id: accountId })
            // }

        }
        console.log('ApiData', ApiData);

        let insertData = {
            account_id: accountId,
            webhook_req: event.body
        }
        await DBManager.dataInsert('user_acc_webhook', insertData);

        // return accountId;
        response = { success: true, message: successMessages.ACCOUNT_VERIFIED_SUCCESSFULLY };
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        response.message = error.message;
        return response;
    }
}
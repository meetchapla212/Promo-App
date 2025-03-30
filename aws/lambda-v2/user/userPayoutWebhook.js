const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let ApiData = JSON.parse(event.body);
        let payoutId = ApiData.data.object.id;
        if (ApiData.type == 'payout.paid' && ApiData.data.object.status && ApiData.data.object.status == 'paid') {
            await DBManager.dataUpdate('event_payout_master', { payout_status: 'complete' }, { stripe_payout_id: payoutId })
        }
        await DBManager.dataInsert('user_acc_webhook', { account_id: payoutId, webhook_req: event.body });
        response = { success: true, message: successMessages.ACCOUNT_VERIFIED_SUCCESSFULLY };
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        response.message = error.message;
        return response;
    }
}
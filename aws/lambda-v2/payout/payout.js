const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case '/payout/activeEvents':
            const payoutActiveEvents = require('./payoutActiveEvents');
            return await payoutActiveEvents.handler(event, context, callback);
        case '/payout/pending-payment':
            const payoutPendingPayment = require('./payoutPendingPayment');
            return await payoutPendingPayment.handler(event, context, callback);
        case '/payout/completed':
            const payoutCompleted = require('./payoutCompleted');
            return await payoutCompleted.handler(event, context, callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500, errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
}
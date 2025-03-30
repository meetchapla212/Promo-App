const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case '/billing/billingHistory':
            const billingHistoryHandler = require('./getBillingHistory');
            return await billingHistoryHandler.handler(event, context, callback);
        case '/billing/getGatewayId':
            const getGatewayIdHandler = require('./getGatewayId');
            return await getGatewayIdHandler.handler(event, context, callback);
        case '/billing/completetransaction':
            const completeTraxHandler = require('./completePayment');
            return await completeTraxHandler.handler(event, context, callback);
        case '/plan/unsubscribe':
            const unsubscribe = require('./unsubscribe');
            return await unsubscribe.handler(event, context, callback);
        case "/checkCoupon/{coupon_code}":
            const checkCouponCode = require("./getcouponcode");
            return await checkCouponCode.handler(event, context, callback);
        case "/event/highlight/{event_id}":
            const highlightEvent = require("./highlightEvent");
            return await highlightEvent.handler(event, context, callback);
        case "/user/getDefultCardDetails":
            const getCardDetails = require("./getCardDetails");
            return await getCardDetails.handler(event, context, callback);
        case "/account/checkStatus":
            const checkStatus = require("./checkStatus");
            return await checkStatus.handler(event, context, callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500, errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
}
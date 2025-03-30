const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case '/discount/addPromocode':
            const addDiscountHandler = require('./addDiscountCode');
            return await addDiscountHandler.handler(event, context, callback);
        case '/discount/deletePromocode':
            const deleteDiscountHandler = require('./deleteDiscountCode');
            return await deleteDiscountHandler.handler(event, context, callback);
        case '/discount/getPromocode/{event_id}':
            const getDiscountHandler = require('./getEventDiscountCode');
            return await getDiscountHandler.handler(event, context, callback);
        case '/discount/checkPromocode':
            const checkDiscountHandler = require('./checkDiscountCode');
            return await checkDiscountHandler.handler(event, context, callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500, errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
}
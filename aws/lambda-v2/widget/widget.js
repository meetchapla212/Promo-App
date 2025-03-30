const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case '/widget/eventList':
            const eventList = require('./eventList');
            return await eventList.handler(event, context, callback);
        case '/auth/register/widgetUser':
            const registerWidgetUserHandler = require('./registerWidgetUser');
            return await registerWidgetUserHandler.handler(event, context, callback);
        case '/auth/verify/widgetUser':
            const verifyWidgetUserHandler = require('./verifyWidgetUser');
            return await verifyWidgetUserHandler.handler(event, context, callback);
        case '/user/widget_tickets':
            const userPurchaseTicketWidgetHandler = require('./userPurchaseTicketWidget');
            return await userPurchaseTicketWidgetHandler.handler(event, context, callback);
        case '/user/event_list/{user_id}':
            const userEventList = require('./userEventList');
            return await userEventList.handler(event, context, callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500, errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
}
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case '/ticket/getAllTickets':
            const allTicketsHandler = require('./allTickets');
            return await allTicketsHandler.handler(event, context, callback);
        case '/ticket/refundedAndCancelledTickets':
            const refundedAndCancelledTicketsHandler = require('./refundedAndCancelledTickets');
            return await refundedAndCancelledTicketsHandler.handler(event, context, callback);
        case '/ticket/{ticket_id}':
            const ticketdetailsHandler = require('./ticketDetails');
            return await ticketdetailsHandler.handler(event, context, callback);
        case '/user/tickets':
            const userTicketdetailsHandler = require('./userPurchaseTicket');
            return await userTicketdetailsHandler.handler(event, context, callback);
        case '/event/tickets/{event_id}':
            const eventTickets = require('./eventTickets');
            return await eventTickets.handler(event, context, callback);
        case '/approveTicket/{user_ticket_id}':
            const approveTickets = require('./approveTickets');
            return await approveTickets.handler(event, context, callback);
        case '/scanTicket':
            const scanTickets = require('./scanTickets');
            return await scanTickets.handler(event, context, callback);
        case '/ticket/cancel/{purchase_ticketId}':
            const userTicketCancelHandler = require('./userTicketCancel');
            return await userTicketCancelHandler.handler(event, context, callback);
        case '/paymentIntents':
            const userPaymentIntentsHandler = require('./userPaymentIntents');
            return await userPaymentIntentsHandler.handler(event, context, callback);
        case '/user/intent_tickets':
            const intentTickets = require('./intentTickets');
            return await intentTickets.handler(event, context, callback);
        case '/organiser/ticket_cancel/{purchase_ticketId}':
            const organiserTicketCancelHandler = require('./organiserTicketCancel');
            return await organiserTicketCancelHandler.handler(event, context, callback)
        case '/ticket/purchased_details/{purchase_ticketId}':
            const getPurchasedDetails = require('./getPurchasedDetails');
            return await getPurchasedDetails.handler(event, context, callback);
        case '/user/edit/details/{details_id}':
            const saveTicketAttendeeDetails = require('./saveTicketAttendeeDetails');
            return await saveTicketAttendeeDetails.handler(event, context, callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500, errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
}
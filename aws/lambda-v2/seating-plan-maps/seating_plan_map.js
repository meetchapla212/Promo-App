const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case '/seating-plan-maps/add':
            const saveSeatingPlan = require('./addSeatingPlan');
            return await saveSeatingPlan.handler(event, context, callback);
        case '/seating-plan-maps/detail/{event_id}':
            const getSeatingPlan = require('./getSeatingPlan');
            return await getSeatingPlan.handler(event, context, callback);
        case '/seating-plan-maps/update/{seating_plan_id}':
            const updateSeatingPlan = require('./updateSeatingPlan');
            return await updateSeatingPlan.handler(event, context, callback);
        case '/seating-plan-maps/delete/{seating_plan_id}':
            const deleteSeatingPlan = require('./deleteSeatingPlan');
            return await deleteSeatingPlan.handler(event, context, callback);
        case '/seating-plan-maps/existing-plan/detail/{event_id}':
            const getExistingSeatingPlan = require('./getExistingSeatingPlan');
            return await getExistingSeatingPlan.handler(event, context, callback);
        case '/seating-plan-maps/ticket-detail/{seating_plan_id}':
            const getSeatingPlanTicketDetails = require('./getSeatingPlanTicketDetails');
            return await getSeatingPlanTicketDetails.handler(event, context, callback);
        case '/seating-plan-maps/hold-seats':
            const holdSeatHandler = require('./holdSeat');
            return await holdSeatHandler.handler(event, context, callback);
        case '/seating-plan-maps/deleteUserHoldTickets':
            const deleteUserHoldTicketsHandler = require('./deleteUserHoldTickets');
            return await deleteUserHoldTicketsHandler.handler(event, context, callback);
        case '/seating-plan-maps/getUserHoldTickets/{event_id}':
            const getUserHoldTicketHandler = require('./getUserHoldTicket');
            return await getUserHoldTicketHandler.handler(event, context, callback);
        case '/seating-plan-maps/widget/hold-seats':
            const widgetHoldSeatHandler = require('./widgetHoldSeat');
            return await widgetHoldSeatHandler.handler(event, context, callback);
        case '/seating-plan-maps/deleteWidgetUserHoldTickets':
            const deleteWidgetUserHoldTickets = require('./deleteWidgetUserHoldTickets');
            return await deleteWidgetUserHoldTickets.handler(event, context, callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500, errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
}
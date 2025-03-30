const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case '/event/add':
            const addEvent = require('./addEvent');
            return await addEvent.handler(event, context, callback);
        case '/event/detail/{event_id}':
            const getEventDetails = require('./getEvent');
            return await getEventDetails.handler(event, context, callback);
        case '/event/list':
            const getEvents = require('./getEvent');
            return await getEvents.handler(event, context, callback);
        case '/event/updateAddress':
            const updateAddressHandler = require('./updateAddress');
            return await updateAddressHandler.handler(event, context, callback);
        case '/event/goingUsersInEvent':
            const goingUsersInEventHandler = require('./userGoingEvent');
            return await goingUsersInEventHandler.handler(event, context, callback);
        case '/event/getUpcoming':
            const getupcomingHandler = require('./getUpcoming');
            return await getupcomingHandler.handler(event, context, callback);
        case '/event/getPast':
            const getPastHandler = require('./getPast');
            return await getPastHandler.handler(event, context, callback);
        case '/event/search':
            const searchEventHandler = require('./searchEvent');
            return await searchEventHandler.handler(event, context, callback);
        case '/guest/{guest_id}':
            const removeGuestHandler = require('./deleteGuest');
            return await removeGuestHandler.handler(event, context, callback);
        case '/event/update/{event_id}':
            const updateEventHandler = require('./updateEvent');
            return await updateEventHandler.handler(event, context, callback);
        case '/user/event/{user_id}':
            const userEventHandler = require('./getUserEvent');
            return await userEventHandler.handler(event, context, callback);
        case '/event/status':
            const userStatusHandler = require('./getEventStatus');
            return await userStatusHandler.handler(event, context, callback);
        case '/event/claimed/{event_id}':
            const claimedEventHandler = require('./claimEvent');
            return await claimedEventHandler.handler(event, context, callback);
        case '/activeEvent':
            const activeEvents = require('./activeEvents');
            return await activeEvents.handler(event, context, callback);
        case '/userMonthyEventDetails':
            const userMonthyEventDetails = require('./userMonthyEventDetails');
            return await userMonthyEventDetails.handler(event, context, callback);
        case '/shareEvent/{event_id}':
            const userShareEvent = require('./shareEvent');
            return await userShareEvent.handler(event, context, callback);
        case '/event/delete/{event_id}':
            const deleteEvent = require('./deleteEvent');
            return await deleteEvent.handler(event, context, callback);
        case '/userSharedEvents':
            const userSharedEvents = require('./userSharedEvents');
            return await userSharedEvents.handler(event, context, callback);
        case '/event/cancel':
            const organiserEventCancelHandler = require('./organiserEventCancel');
            return await organiserEventCancelHandler.handler(event, context, callback);
        case '/event/payoutChange/{event_id}':
            const changePayout = require('./changePayout');
            return await changePayout.handler(event, context, callback);
        case '/event/addTicket/{event_id}':
            const addTicket = require('./addTicket');
            return await addTicket.handler(event, context, callback);
        case '/event/getReferalLink':
            const getReferalLinkHandler = require('./getReferalLink');
            return await getReferalLinkHandler.handler(event, context, callback);
        case '/deleteTicket/{ticket_id}':
            const deleteTicket = require('./deleteTicket');
            return await deleteTicket.handler(event, context, callback);
        case '/event/getSearchEvent':
            const getSearchEvent = require('./getSearchEvent');
            return await getSearchEvent.handler(event, context, callback);
        case '/event/update/image/{event_id}':
            const updateEventImage = require('./updateEventImage');
            return await updateEventImage.handler(event, context, callback);
        case '/event/addEventvisitor':
            const addEventvisitor = require('./addEventvisitor');
            return await addEventvisitor.handler(event, context, callback);
        case '/event/republish':
            const republishEvent = require('./republishEvent');
            return await republishEvent.handler(event, context, callback);
        case '/event/getAtteneeDetail':
            return await require('./getAtteneeDetail').handler(event, context, callback);
        case '/event/get/detailForm/{event_id}':
            return await require('./getEventCheckoutForm').handler(event, context, callback);
        case '/event/add/detailForm/{event_id}':
            return await require('./addEventCheckoutForm').handler(event, context, callback);
        case '/event/get/questions':
            return await require('./getEventQuestions').handler(event, context, callback);
        case '/event/getFormDetails':
            return await require('./getUserEventDetails').handler(event, context, callback);

        // case '/event/getForm/{event_id}':
        //     return await require('./getUserEventDetails').handler(event, context, callback);
        // case "/event/updateUserInvitations":
        //     return require("./updateUserInvitations").handler(event);
        // case '/event/add/questions/{event_id}':
        //     return await require('./addEventQuestions').handler(event, context, callback);
        // case '/event/delete/questions/{question_id}':
        //     return await require('./deleteEventQuestions').handler(event, context, callback);
        // case '/event/addUpdateCheckoutForm/{event_id}':
        //     return await require('./addEventCheckoutForm').handler(event, context, callback);
        // case '/event/add/questions/answers/{event_id}':
        //     return await require('./addEventQuestionAnswers').handler(event, context, callback);
        // case '/event/get/userData/{event_id}':
        //     return await require('./getEventUserData').handler(event, context, callback);
        
    }
    return awsRequestHelper.respondWithSimpleMessage(500, errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
};
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case '/profile/{user_id}':
            const profileHandler = require('./getProfile');
            return await profileHandler.handler(event, context, callback);
        case '/qb_user/{qb_id}':
            const getQBProfile = require('./getQBProfile');
            return await getQBProfile.handler(event, context, callback);
        case '/profile/update':
            const profileUpdateHandler = require('./updateProfile');
            return await profileUpdateHandler.handler(event, context, callback);
        case '/profile/getFollowerList':
            const followerListHandler = require('./followerList');
            return await followerListHandler.handler(event, context, callback);
        case '/profile/getFollowingList':
            const followingListHandler = require('./followingList');
            return await followingListHandler.handler(event, context, callback);
        case '/profile/getInterestedEventsList':
            const interestedEventsListHandler = require('./interestedEvents');
            return await interestedEventsListHandler.handler(event, context, callback);
        case '/profile/getGoingEventsList':
            const GoingEventsListHandler = require('./goingEvents');
            return await GoingEventsListHandler.handler(event, context, callback);
        case '/profile/updatePaypalEmail':
            const updatePaypalEmail = require('./updatePaypal');
            return await updatePaypalEmail.handler(event, context, callback);
        case '/profile/getFollowList':
            const FollowListHandler = require('./FollowList');
            return await FollowListHandler.handler(event, context, callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500, errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
}
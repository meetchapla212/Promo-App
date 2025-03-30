const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case '/user/followUser':
            const searchEventHandler = require('./followUser');
            return await searchEventHandler.handler(event, context, callback);
        case '/user/unfollowUser':
            const updateAddressHandler = require('./unfollowUser');
            return await updateAddressHandler.handler(event, context, callback);
        case '/user/eventStatus/{event_id}':
            const userEventStatusHandler = require('./userEventStatus');
            return await userEventStatusHandler.handler(event, context, callback);
        case '/user/checkFollow':
            const checkUserFollowHandler = require('./checkUserFollow');
            return await checkUserFollowHandler.handler(event, context, callback);
        case '/users/getPlans':
            const myPlansHandler = require('./getPlan');
            return await myPlansHandler.handler(event, context, callback);
        case '/user/linkBankAccount/{bank_token}':
            const linkBankAccount = require('./linkBankAccount');
            return await linkBankAccount.handler(event, context, callback);
        case '/user/bankAccountDetails/{bank_token}':
            const bankAccountDetails = require('./userBankAccountDetails');
            return await bankAccountDetails.handler(event, context, callback);
        case '/user/removeBankAccount/{bank_token}':
            const removeBankAccount = require('./userBankAccountRemove');
            return await removeBankAccount.handler(event, context, callback);
        case '/user/updateBankDetails':
            const updateBankDetails = require('./updateBankDetails');
            return await updateBankDetails.handler(event, context, callback);
        case '/user/listingBankAccounts':
            const listingAllBankAccounts = require('./listingAllBankAccounts');
            return await listingAllBankAccounts.handler(event, context, callback);
        case '/user/connectStripeAccount':
            const connectStripeAccount = require('./connectStripeAccount');
            return await connectStripeAccount.handler(event, context, callback);
        case '/user/changeDefaultBank/{bank_token}':
            const setDefaultBank = require('./setDefaultBank');
            return await setDefaultBank.handler(event, context, callback);
        case '/ephemeral_keys':
            const ephemeralKeysHandler = require('./userEphemeralKey');
            return await ephemeralKeysHandler.handler(event, context, callback);
        case '/stripeAccountCreate':
            const stripeAccountCreate = require('./stripeAccountCreate');
            return await stripeAccountCreate.handler(event, context, callback);
        case '/user/account/webhook':
            const userAccountWebhook = require('./userAccountWebhook');
            return await userAccountWebhook.handler(event, context, callback);
        case '/user/payout/webhook':
            const userPayoutWebhook = require('./userPayoutWebhook');
            return await userPayoutWebhook.handler(event, context, callback);
        case '/user/groupDetails':
            const getUserGroupDetails = require('./getUserGroupDetails');
            return await getUserGroupDetails.handler(event, context, callback);
        case '/event/inviteAdministrator/{event_id}':
            const inviteEventAdministrator = require('./inviteEventAdministrator');
            return await inviteEventAdministrator.handler(event, context, callback);
        case '/event/verify/eventAdministratorRequest':
            const verifyEventAdministratorRequest = require('./verifyEventAdministratorRequest');
            return await verifyEventAdministratorRequest.handler(event, context, callback);
        case '/event/createEventAdministrator':
            const createEventAdministrator = require('./createEventAdministrator');
            return await createEventAdministrator.handler(event, context, callback);
        case '/event/administrator-invitation/history/{event_id}':
            const eventAdministratorInviteHistory = require('./eventAdministratorInviteHistory');
            return await eventAdministratorInviteHistory.handler(event, context, callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500, errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
}
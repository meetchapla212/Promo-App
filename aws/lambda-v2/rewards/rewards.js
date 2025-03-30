const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const { errorMessages } = require("../common/constants");

module.exports.handler = async function(event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case "/reward-add":
            const addReward = require("./addReward");
            return await addReward.handler(event, context, callback);
        case "/rewards":
            const getRewards = require("./getRewards");
            return await getRewards.handler(event, context, callback);
        case "/reward/{reward_id}":
            const getreward = require("./getRewards");
            return await getreward.handler(event, context, callback);
        case "/reward-update/{reward_id}":
            const updateReward = require("./updateReward");
            return await updateReward.handler(event, context, callback);
        case "/reward-delete/{reward_id}":
            const deleteReward = require("./deleteReward");
            return await deleteReward.handler(event, context, callback);
        case "/add-winner-info":
            const addWinnerInfo = require("./addWinnerInfo");
            return await addWinnerInfo.handler(event, context, callback);
        case "/disqualify-user/{reward_id}":
            const disqualifyUser = require("./disqualifyUser");
            return await disqualifyUser.handler(event, context, callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500,errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
};
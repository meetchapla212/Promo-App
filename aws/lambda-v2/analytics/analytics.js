const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case "/analytics/addSocialShare":
            const addSocialShare = require("./addSocialShare");
            return await addSocialShare.handler(event, context, callback);
        case "/shared-event":
            const userSharedEvent = require("./userSharedEvent");
            return await userSharedEvent.handler(event, context, callback);
        case "/user-analytics/{reward_id}":
            const userAnalytics = require("./userAnalytics");
            return await userAnalytics.handler(event, context, callback);
        case "/analytics/visited":
            const addVisited = require("./addVisited");
            return await addVisited.handler(event, context, callback);
        case "/organiser-analytics/{reward_id}":
            const organiserReport = require("./getReport");
            return await organiserReport.handler(event, context, callback);
        case "/analytics/event":
            const eventAnalytics = require("./eventAnalytics");
            return await eventAnalytics.handler(event, context, callback);
        case "/report/event":
            const eventReports = require("./eventReports");
            return await eventReports.handler(event, context, callback);
        case '/event/singleAnalytic':
            const singleAnalytic = require('./singleAnalytic');
            return await singleAnalytic.handler(event, context, callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500, errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
}
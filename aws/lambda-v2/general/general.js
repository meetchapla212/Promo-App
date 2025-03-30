const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch(resource){
        case '/general/postFeedback':
            const postFeedbackHandler = require('./postFeedback');
            return await postFeedbackHandler.handler(event,context,callback);
        
        case '/general/getNotification':
            const getNotificationHandler = require('./getNotification');
            return await getNotificationHandler.handler(event,context,callback);
        
        case '/general/getAllUser':
            const allUserHandler = require('./getAllUser');
            return await allUserHandler.handler(event,context,callback);

        case '/general/searchUser':
            const searchUserHandler = require('./searchUser');
            return await searchUserHandler.handler(event,context,callback);

        case '/general/pushNotification':
            const pushNotificationHandler = require('./pushNotification');
            return await pushNotificationHandler.handler(event,context,callback);

        case '/general/getEventCategories':
            const getEventCategoriesHandler = require('./getEventCategories');
            return await getEventCategoriesHandler.handler(event,context,callback);
        case '/bugType':
            const getBugTypeHandler = require('./getBugType');
            return await getBugTypeHandler.handler(event, context, callback);
        case '/bugReporting':
            const postBugReportHandler = require('./reportingBug');
            return await postBugReportHandler.handler(event, context, callback);
        case '/contactUs':
            const contactHandler = require('./contact');
            return await contactHandler.handler(event, context, callback);
         
    }
    return awsRequestHelper.respondWithSimpleMessage(500,errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
}
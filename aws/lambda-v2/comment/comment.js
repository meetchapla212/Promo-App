const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case '/comment':
            const getComment = require('./getComment');
            return await getComment.handler(event, context, callback);
        case '/comment/add':
            const addComment = require('./addComment');
            return await addComment.handler(event, context, callback);
        case '/comment/{comment_id}':
            const deleteComment = require('./deleteComment');
            return await deleteComment.handler(event, context, callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500, errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
}
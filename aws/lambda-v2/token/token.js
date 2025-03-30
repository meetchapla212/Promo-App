const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let method = event.httpMethod;
    switch(method){
        case 'POST':
            const postTokenHandler = require('./postToken');
            return await postTokenHandler.handler(event,context,callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500,errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
}
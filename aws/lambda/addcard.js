const stripe = require("stripe")(process.env.STRIPE_KEY);//this key should be the private key
const awsRequestHelper = require('./common/awsRequestHelper');
const Joi = require('joi');
const QBM = require('./common/qbmanager');
const QBManager = new QBM();
const { errorMessages } = require('../lambda-v2/common/constants');

const validate = function (body) {
    const schema = Joi.object().keys({
        gateway_id: Joi.string().required(),
        source: Joi.string().required(),
        id: Joi.string().required()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
        }, function (error, value) {
            if (error) {
                console.error("error : ", error);
                reject({ status_code: 400, message: errorMessages.INVALID_INPUT });
            } else {
                resolve(value);
            }
        });
    });
}

const addCard = function (body) {
    return stripe.customers.update(body.gateway_id, {
        source: body.source,
    });
};

// This function is used to update payment gateway in QB
const updatePaymentGateway = async (body, QBtoken) => {
    console.log('Inside updatePaymentGateway');
    let updateUserPaymentBody = { };

    if ('source' in body && body.source) {
        // Get the token details for last 4 
        let tokenDetails = await stripe.tokens.retrieve(body.source);
        console.log('tokenDetails', tokenDetails);
        if (tokenDetails && 'card' in tokenDetails && tokenDetails.card) {
            updateUserPaymentBody.last4 = tokenDetails.card.last4;
        }
    }

    // Update if qb id for UserPaymentGateway Table is given
    if (body.id) {
        console.log('Updating ', body.id, updateUserPaymentBody);
        let response = await QBManager.updateById('UserPaymentGateway', body.id, updateUserPaymentBody, QBtoken);
        console.log(response);
    }
};

module.exports.handler = async function (event, context, callback) {
    console.log('Got Event::', JSON.stringify(event));
    try {
        let body = JSON.parse(event.body);
        console.log('body', body);

        await validate(body);
        await addCard(body);
        await updatePaymentGateway(body, event.headers.Authorization);
        return awsRequestHelper.respondWithCodeOnly(204);
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
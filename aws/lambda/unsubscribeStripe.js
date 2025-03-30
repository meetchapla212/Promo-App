'use strict';
const stripe = require("stripe")(process.env.STRIPE_KEY);//this key should be the private key
const awsRequestHelper = require('./common/awsRequestHelper');
const Joi = require('joi');
const { errorMessages } = require("../lambda-v2/common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        gateway_id: Joi.string().required()
    });
    return new Promise((resolve, reject) => {

        Joi.validate(body, schema, {
            abortEarly: false
        }, function (error, value) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            } else {
                resolve(value);
            }

        });

    });
}
const getSubscriptions = function (body) {
    return stripe.subscriptions.list({ customer: body.gateway_id });
}

module.exports.handler = async (event, context, callback) => {
    console.log('Got event', event);
    let body = JSON.parse(event.body);
    console.log('body', body);

    try {
        await validate(body);
        let subscriptions = await getSubscriptions(body);
        console.log('list of subscri', subscriptions);
        if (subscriptions && subscriptions.data.length > 0) {
            await stripe.subscriptions.del(subscriptions.data[0].id);
            return awsRequestHelper.respondWithCodeOnly(204);
        } else {
            return awsRequestHelper.respondWithSimpleMessage(400, errorMessages.NOT_SUBSCRIBED_TO_THIS_PLAN);
        }
    } catch (error) {
        console.error("error : ", error);
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithSimpleMessage(400, error.message);
        } else {
            return awsRequestHelper.respondWithSimpleMessage(500, error.message);
        }
    }
}
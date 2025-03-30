'use strict';

const rp = require('request-promise');
const awsRequestHelper = require('./common/awsRequestHelper');
const AWS = require('aws-sdk');
const { successMessages, errorMessages } = require('../lambda-v2/common/constants');
const lambda = new AWS.Lambda();

const addEmailToList = async (user) => {
    console.log('Inside syncEmail', user);

    let body = {
        "api_key": process.env.API_KEY,
        "email_address": user.email
    }

    if (user.username) {
        body['first_name'] = user.username
    }
    let options = {
        method: 'POST',
        uri: `${process.env.EMAIL_BASE_URL}/lists/${process.env.LIST_ID}/contacts`,
        body: body,
        json: true // Automatically stringifies the body to JSON
    };

    return rp(options);
};

// This function is used to invoke add events lambda
const invokeLambda = () => {
    let params = {
        FunctionName: process.env.LAMBDA_SYNC,
        InvocationType: 'Event',
        LogType: 'Tail',
        Payload: JSON.stringify({})
    };
    return lambda.invoke(params).promise();
};

module.exports.handler = async function (event, context, callback) {
    console.log('Got event:', event);
    await invokeLambda();
    // Check if body is present and email is present in it
    let body = JSON.parse(event.body);
    if (body && body.email) {
        // Subscribe to list in email octopus
        try {
            await addEmailToList(body);
            return awsRequestHelper.respondWithSimpleMessage(200, successMessages.EMAIL_ADDED);
        } catch (er) {
            return awsRequestHelper.callbackRespondWithSimpleMessage(500, errorMessages.UNABLE_TO_ADD_EMAIL);
        }
    }
    return awsRequestHelper.respondWithSimpleMessage(callback, 400, errorMessages.EMAIL_REQUIRED);

};
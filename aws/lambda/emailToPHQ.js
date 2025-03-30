"use strict";
const aws = require('aws-sdk');
const Joi = require('joi');
const { successMessages } = require('../lambda-v2/common/constants');
const ses = new aws.SES({ apiVersion: '2010-12-01', region: process.env.Region });
const awsRequestHelper = require('./common/awsRequestHelper');

let commonFooterVariables = {
    FB_LINK: 'http://www.facebook.com/promoappevents',
    INSTA_LINK: 'https://www.instagram.com/georgepromo/',
    BASE_URL: process.env.UI_BASE_URL,
    ABOUT_US: '',
    TERM_OF_USE: `${process.env.UI_BASE_URL}/terms_of_use`,
    COOKIE_POLICY: `${process.env.UI_BASE_URL}/cookies_policy`,
    DOWNLOAD_ON_GOOGLE_PLAY: 'https://play.google.com/store/apps/details?id=com.thepromoapp.promo',
    DOWNLOAD_ON_APP_STORE: 'https://apps.apple.com/us/app/promo-see-whats-going-on-around/id1075964954',
    CONTACT_US: ''
}

const validate = function (body, schema) {
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

// This method is called to send email
// Example input {'from':'','to':[],replyTo:[],'subject':'','body':''}
const sendEmail = async (params) => {
    let params = {
        Destination: {
            ToAddresses: params.to,
        },
        Message: {
            Body: {
                Text: {
                    Data: result.body
                }
            },
            Subject: {
                Data: params.subject
            }
        },
        Source: params.from
    };

    if (result.replyTo) {
        params.ReplyToAddresses = result.replyTo;
    }
    await ses.sendEmail(params).promise();
}

// Get validation schema based on different types
const getValidationSchema = (type) => {
    switch (type) {
        case 'shareEventByEmail':
            return Joi.object().keys({
                from: Joi.string().email().required(),
                to: Joi.array().items(Joi.string().regex(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$/)),
                subject: Joi.string().required(),
                body: Joi.string().required(),
                replyTo: Joi.array().items(Joi.string().regex(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$/))
            });
    }
}

// This function is used to get body if template is passed
const getBodyFromTemplate = async (type, body) => {

}
module.exports.handler = async function (event, context, callback) {

    let body = JSON.parse(event.body);
    console.log('Got event', event);

    try {
        await validate(body, getValidationSchema(event.pathParameters.type));
    } catch (error) {
        console.error("error : ", error);
        return awsRequestHelper.respondWithSimpleMessage(400, error.details);
    }

    if (!('body' in body && body.body)) {
        body.body = await getBodyFromTemplate(event.pathParameters.type, body);
    }

    let input = {
        from: body.from || 'Donotreply@thepromoapp.com',
        to: body.to,
        subject: body.subject,
        body: body.body,
        replyTo: body.replyTo
    }
    await sendEmail(input);
    return awsRequestHelper.respondWithJsonBody(200, { "message": successMessages.EMAIL_SENT });
}
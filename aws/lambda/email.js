"use strict";
const aws = require('aws-sdk');
const Joi = require('joi');
const nodemailer = require('nodemailer');
const ses = require('nodemailer-ses-transport');
const { successMessages } = require('../lambda-v2/common/constants');
const schema = Joi.object().keys({
    name: Joi.string().required(),
    from: Joi.string().email().required(),
    to: Joi.array().items(Joi.string().regex(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$/)),
    subject: Joi.string().required(),
    body: Joi.string().required()
});

const awsRequestHelper = require('./common/awsRequestHelper');

const transporter = nodemailer.createTransport(ses({
    region: process.env.Region
}));

const shareInvite = function (body) {

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


module.exports.handler = function (event, context, callback) {

    let body = JSON.parse(event.body);

    shareInvite(body).then(result => {

        let name = result.name;
        let from = process.env.FROM;
        let to = result.to;
        let subject = result.subject;
        let body = result.body;

        transporter.sendMail({
            from: from,
            to: to,
            subject: subject,
            text: body
        });

        awsRequestHelper.callbackRespondWithJsonBody(callback, 200, {"message": successMessages.EMAIL_SENT});

    }).catch(error => {
        console.error("error : ", error);
        awsRequestHelper.callbackRespondWithSimpleMessage(callback, 500, error.details);
    });

};
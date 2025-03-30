const request = require("request")
const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const Joi = require('joi');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { successMessages, errorMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        code: Joi.string().required()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: errorMessages.INVALID_INPUT });
            } else {
                resolve(value);
            }
        });
    });
}

// This function is used to update stripe_account_id in DB 
const updateStripeAccountId = async (stripe_account_id, user) => {
    let updateUserBody = {
        stripe_account_id: stripe_account_id
    };

    let whereQry = { user_id: user['id'] };
    await DBManager.dataUpdate('user_master', updateUserBody, whereQry);
};

const fetchStripeAccountId = async function (apiData, user) {
    return new Promise((resolve, reject) => {
        request.post('https://connect.stripe.com/oauth/token', {
            json: {
                client_secret: process.env.STRIPE_KEY,
                code: apiData.code,
                grant_type: "authorization_code",
            }
        }, async function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var connected_account_id = body.stripe_user_id;
                await updateStripeAccountId(connected_account_id, user);
                resolve(connected_account_id)
            } else {
                reject(body.error_description)
            }
        });
    });
};

module.exports.handler = async function (event, context, callback) {

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        let account_id = await fetchStripeAccountId(apiData, user);
        return await DBManager.getData('user_master', 'stripe_customer_id', { user_id: user.id }).then(async res => {
            console.log('res=====', res[0])
            console.log('res[0].stripe_customer_id == null', res[0].stripe_customer_id == null);
            if (res[0].stripe_customer_id == null || res[0].stripe_customer_id == 'NULL') {
                console.log('stripe acc')
                return stripe.customers.create({
                    description: 'create user',
                    metadata: {
                        "user": user.id
                    }
                }).then(async response => {
                    await DBManager.dataUpdate('user_master', { stripe_customer_id: response.id }, { user_id: user.id });
                    response = { success: true, message: successMessages.STRIPE_ACCOUNT_ADDED, data: account_id }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                });
            } else {
                response = { success: true, message: successMessages.STRIPE_ACCOUNT_ADDED, data: account_id }
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        })
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
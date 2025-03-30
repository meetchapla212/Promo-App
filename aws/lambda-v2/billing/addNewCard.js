const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const Joi = require('joi');
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

async function getUserDetails(userId) {
    return new Promise(async (resolve, reject) => {
        let sqlQry = "SELECT stripe_customer_id FROM user_master WHERE user_id = " + userId + " ";
        let userDetails = await DBManager.runQuery(sqlQry);
        return resolve(userDetails);
    })
}

const createCustomer = async function (user_id, username) {
    return stripe.customers.create({
        description: 'Create new Customer ' + username,
        metadata: {
            "user": user_id
        }
    }).then(async (res) => {
        let whereQry = { user_id: user_id };
        await DBManager.dataUpdate("user_master", { "stripe_customer_id": res.id }, whereQry);
        return res.id;
    });
}

async function processAddCard(customerId, cardToken) {
    return new Promise(async (resolve, reject) => {
        await stripe.customers.createSource(customerId, {
            source: cardToken
        }, function (error, card) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            }
            resolve(card);
        });
    })
}

const validate = function (body) {
    const schema = Joi.object().keys({
        card_token: Joi.string().required(),
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
            allowUnknown: true
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
}

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        var userId = user.id;
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        var userDetails = await getUserDetails(userId);
        var userCustomerId = userDetails[0].stripe_customer_id;
        var cardToken = apiData.card_token;
        if (!userCustomerId) {
            userCustomerId = await createCustomer(user.id, user.username);
        }

        return await processAddCard(userCustomerId, cardToken).then((cardAddResponse) => {
            return awsRequestHelper.respondWithJsonBody(200, { success: true, message: successMessages.CARD_ADDED, data: cardAddResponse });
        }).catch((error) => {
            return awsRequestHelper.respondWithJsonBody(200, { success: false, message: error.message });
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
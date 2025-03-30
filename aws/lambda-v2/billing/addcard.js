const stripe = require("stripe")(process.env.STRIPE_KEY);//this key should be the private key
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const Joi = require('joi');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { successMessages, errorMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        gateway_id: Joi.string().required(),
        source: Joi.string().required()
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

const addCard = function (apiData) {
    return stripe.customers.update(apiData.gateway_id, {
        source: apiData.source,
    });
};

// This function is used to update payment gateway in QB 
const updatePaymentGateway = async (apiData, user) => {
    let updateUserPaymentBody = {
        _user_id: user['id'],
        gateway_id: apiData['gateway_id']
    };

    if ('source' in apiData || apiData.source) {
        // Get the token details for last 4 
        let tokenDetails = await stripe.tokens.retrieve(apiData.source);
        if (tokenDetails && 'card' in tokenDetails && tokenDetails.card) {
            updateUserPaymentBody.last4 = tokenDetails.card.last4;
        }
    }
    let whereQry = { _user_id: user['id'], gateway_id: apiData['gateway_id'] };

    let existingRecords = await DBManager.getData("user_payment_gateway", 'count(*) as totalCount', whereQry);
    if (existingRecords[0].totalCount) {
        await DBManager.dataUpdate('user_payment_gateway', updateUserPaymentBody, whereQry);
    } else {
        await DBManager.dataInsert('user_payment_gateway', updateUserPaymentBody);
    }
};

module.exports.handler = async function (event, context, callback) {
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);

        await validate(apiData);
        await addCard(apiData);
        response = { success: true, message: successMessages.CARD_ADDED }

        await updatePaymentGateway(apiData, user);
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
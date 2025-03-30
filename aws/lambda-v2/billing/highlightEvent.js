"use strict";
const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const DBManager = new DBM();
const utils = require("../common/utils");
const { errorMessages, successMessages } = require("../common/constants");

async function getUserDetails(userId) {
    return new Promise(async (resolve, reject) => {
        let sqlQry = "SELECT stripe_customer_id FROM user_master WHERE user_id = " + userId + " ";
        let userDetails = await DBManager.runQuery(sqlQry);
        return resolve(userDetails);
    })
}

const updateCustomer = async function (apiData, customerId) {
    if ('token' in apiData && apiData.token) {
        console.log('Updating customer card');
        return await stripe.customers.update(customerId, {
            source: apiData.token,
        });
    }
};

const createCustomer = async function (apiData, userId) {
    return stripe.customers.create({
        description: "create new accout",
        metadata: {
            "user": userId
        },
        source: apiData.token
    });
}

const crateStripeCharge = async function (customerID, totalAmountPay, source, event_name) {
    console.log('stripe------- ', totalAmountPay);
    console.log('stripe calculation ======', ((totalAmountPay * 1) * 100))

    let stripeCharge = await stripe.charges.create({
        customer: customerID,
        amount: Math.round(totalAmountPay * 100),
        currency: 'usd',
        source: source,
        description: `Purchase ticket of ${event_name} event`,
    });
    console.log('stripeCharge', stripeCharge);
    return stripeCharge;
}

module.exports.handler = async (event, context, callback) => {
    var returnResponse = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    let apiData = JSON.parse(event.body);
    let eventId = event.pathParameters.event_id;
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        var userDetails = await getUserDetails(user.id);
        let customerID = '';
        let customer = '';
        customerID = userDetails[0].stripe_customer_id;
        
        let updateQuery = {};
        let updateRequired = 0;
        if (customerID && customerID != '') {
            customer = await updateCustomer(apiData, customerID);
        } else {
            let customerIdResponse = await createCustomer(apiData, user.id);
            if (customerIdResponse) {
                customerID = customerIdResponse.id;
                customer = customerIdResponse;
                updateQuery['stripe_customer_id'] = customerID;
                updateRequired = 1;
            }
        }
        let source = apiData.token && apiData.token != '' ? customer.default_source : apiData.card_id;
        if (apiData.is_saveChecked) {
            updateQuery['stripe_defualt_card'] = source;
            updateRequired = 1;
        }
        if(updateRequired){
            console.log("updateQuery : ", updateQuery);
            await DBManager.dataUpdate('user_master', updateQuery, { user_id: user.id });
        }

        return await crateStripeCharge(customerID, '2.99', source, 'event highlight ' + eventId).then(async response => {
            await DBManager.dataInsert('event_highlight_hostory', {
                _event_id: eventId,
                _user_id: user.id,
                tnx_id: response.balance_transaction,
                charge_id: response.id
            });
            returnResponse = { success: true, message: successMessages.EVENT_HIGHLIGHT_PAYMENT_PAID }
            return awsRequestHelper.respondWithJsonBody(200, returnResponse);
        }).catch(error => {
            console.error("error : ", error);
            return awsRequestHelper.respondWithJsonBody(500, returnResponse);
        })
    } catch (error) {
        console.error("error : ", error);
        return awsRequestHelper.respondWithSimpleMessage(500, error.message);
    }
};
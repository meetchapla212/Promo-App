'use strict';
const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require('./common/awsRequestHelper');
const Joi = require('joi');
const QBM = require('./common/qbmanager');
const { errorMessages } = require("../lambda-v2/common/constants");
const QBManager = new QBM();

const validate = async function (body) {

    const schema = Joi.object().keys({
        gateway_id: Joi.string(),
        plan_id: Joi.string().required(),
        old_plan_id: Joi.string(),
        user_id: Joi.number().required(),
        token: Joi.string(),
        id: Joi.string(),
        amount: Joi.number().required(),
        description: Joi.string().required(),
        subscription: Joi.boolean(),
        coupon: Joi.string(),
        times_redeemed: Joi.number()
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



const createCustomer = async function (body) {
    return stripe.customers.create({
        description: body.description,
        metadata: {
            "user": body.user_id
        },
        source: body.token
    });
}

//for charging customer
const createCharge = async function (body, customerId) {
    let data = {
        amount: (body.amount * 100),
        currency: 'usd',
        description: body.description
    };
    if (customerId) {
        data.customer = customerId;
    } else {
        data.source = body.token;
    }
    let finalResponse = null;
    return Promise.resolve().then(() => {
        if (body.amount > 0) {
            return stripe.charges.create(data);
        } else {
            return Promise.resolve({
                customer: customerId
            });
        }
    }).then((response) => {
        finalResponse = response;
        if (body.coupon) {
            let updateData = {
                metadata: {
                    times_redeemed: (body.times_redeemed) || 1
                }
            };
            return stripe.coupons.update(body.coupon, updateData);
        } else {
            return Promise.resolve(response);
        }
    }).then(res => {
        console.log('coupon updated', res);
        return Promise.resolve(finalResponse);
    });

};

const updateSubscription = async function (body, customerId) {
    console.log('Inside updateSubscription');
    let couponVar = null;
    if (body.coupon && body.coupon.trim() != '') {
        couponVar = body.coupon;
    }
    let subscriptions = await stripe.subscriptions.list({
        customer: customerId
    });
    if (subscriptions && subscriptions.data.length > 0) {
        let sub_id = subscriptions.data[0].id;
        let item_id = subscriptions.data[0]["items"]["data"][0].id;
        console.log(item_id);

        
        return stripe.subscriptions.update(sub_id, {
            items: [{
                id: item_id,
                plan: body.plan_id
            }],
            coupon: couponVar
        });
    } else {
        return Promise.reject({
            'status_code': 400,
            'message': errorMessages.NOT_SUBSCRIBED_TO_THIS_PLAN
        });
    }
};

const updateCustomer = async function(body,customerId){
    // if token in body update customer with new card and then change the subscription
    if('token' in body && body.token){
        console.log('Updating customer card');
        await stripe.customers.update(customerId,{
            source: body.token,
        });
    }
};

const createSubscription = async function (body, customerId) {
    console.log('Inside createSubscription');
    let subscription = {
        customer: customerId,
        items: [{
            plan: body.plan_id,
        }, ]
    };
    if (body.coupon && body.coupon.trim() != '') {
        subscription.coupon = body.coupon;
    }
    return stripe.subscriptions.create(subscription);
};

// This function is used to update payment gateway in QB
const updatePaymentGateway = async (customerID, body, QBtoken) => {
    console.log('Inside updatePaymentGateway');
    let updateUserPaymentBody = {
        gateway_id: customerID,
        user_id: body.user_id
    };

    if(body.plan_id == 'basic' || body.plan_id == 'unlimited'){
        updateUserPaymentBody.current_plan_id = body.plan_id;
    }

    if ('token' in body && body.token) {
        // Get the token details for last 4 
        let tokenDetails = await stripe.tokens.retrieve(body.token);
        console.log('tokenDetails',tokenDetails);
        if (tokenDetails && 'card' in tokenDetails && tokenDetails.card) {
            updateUserPaymentBody.last4 = tokenDetails.card.last4;
        }
    }

    // Update if qb id for UserPaymentGateway Table is given
    if (body.id) {
        console.log('Updating ',body.id, updateUserPaymentBody);
        let response = await QBManager.updateById('UserPaymentGateway', body.id, updateUserPaymentBody, QBtoken);
        console.log(response);
    } else {
        console.log('Creating ',updateUserPaymentBody);
        let response = await QBManager.createObject('UserPaymentGateway', updateUserPaymentBody, QBtoken);
        console.log(response);
    }
};

// This function is called to complete the payment and it will expect token,description of the payment and amount
module.exports.handler = async (event, context, callback) => {
    console.log('Got event', event);
    let body = JSON.parse(event.body);
    console.log('body', body);

    try {
        await validate(body);

        //for checking if the user is new or we have the customer id
        let customerID = null;
        if (!body.gateway_id) {
            let customerIdResponse = await createCustomer(body);
            if (customerIdResponse) {
                customerID = customerIdResponse.id;
            }
        } else {
            customerID = body.gateway_id;
            await updateCustomer(body,customerID);
        }

        let response = {
            "message": "Payment is successful",
            'customerID': customerID
        };
        if (body.subscription) {
            if (!body.old_plan_id) {
                // Create the subscription
                await createSubscription(body, customerID);
            } else {
                await updateSubscription(body, customerID);
            }
        } else {
            await createCharge(body, customerID);
        }

        await updatePaymentGateway(customerID, body, event.headers.Authorization);
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        console.error("error : ", error);
        return awsRequestHelper.respondWithSimpleMessage(500, error.message);
    }
};
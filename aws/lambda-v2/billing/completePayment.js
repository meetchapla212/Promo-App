'use strict';
const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const Joi = require('joi');
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const AWSManager = require('../common/awsmanager');
const utils = require('../common/utils');
const { errorMessages, stringMessages, emailAndPushNotiTitles } = require("../common/constants");

const validate = async function (body) {
    const schema = Joi.object().keys({
        gateway_id: Joi.string(),
        plan_id: Joi.string().required(),
        old_plan_id: Joi.string(),
        token: Joi.string(),
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

const createCustomer = async function (apiData) {
    return stripe.customers.create({
        description: apiData.description,
        metadata: {
            "user": apiData.user_id
        },
        source: apiData.token
    });
}

// const getCustomerGetwayDetails = async function(user_id){
//     return await DBManager.getData("user_payment_gateway", "gateway_id",{"_user_id":user_id}).then(data =>{
//         return data;
//     });
// }

async function getUserDetails(userId) {
    return new Promise(async (resolve, reject) => {
        let sqlQry = "SELECT stripe_customer_id FROM user_master WHERE user_id = " + userId + " ";
        let userDetails = await DBManager.runQuery(sqlQry);
        return resolve(userDetails);
    })
}

//for charging customer
const createCharge = async function (apiData, customerId) {
    let data = {
        amount: (apiData.amount * 100),
        currency: 'usd',
        description: apiData.description
    };
    if (customerId) {
        data.customer = customerId;
    } else {
        data.source = apiData.token;
    }
    let finalResponse = null;
    return Promise.resolve().then(() => {
        if (apiData.amount > 0) {
            return stripe.charges.create(data);
        } else {
            return Promise.resolve({ customer: customerId });
        }
    }).then((response) => {
        finalResponse = response;
        if (apiData.coupon) {
            let updateData = {
                metadata: {
                    times_redeemed: (apiData.times_redeemed) || 1
                }
            };
            return stripe.coupons.update(apiData.coupon, updateData);
        } else {
            return Promise.resolve(response);
        }
    }).then(res => {
        console.log('coupon updated', res);
        return Promise.resolve(finalResponse);
    });
};

const updateSubscription = async function (apiData, customerId) {
    console.log('Inside updateSubscription');
    
    let couponVar = null;
    if (apiData.coupon && apiData.coupon.trim() != '') {
        couponVar = apiData.coupon;
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
                plan: apiData.plan_id
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

const updateCustomer = async function (apiData, customerId) {
    if ('token' in apiData && apiData.token) {
        console.log('Updating customer card');
        await stripe.customers.update(customerId, {
            source: apiData.token,
        });
    }
};

const createSubscription = async function (apiData, customerId) {
    console.log('Inside createSubscription');
    let subscription = {
        customer: customerId,
        items: [{
            plan: apiData.plan_id,
        },]
    };
    if (apiData.coupon && apiData.coupon.trim() != '') {
        subscription.coupon = apiData.coupon;
    }
    return stripe.subscriptions.create(subscription);
};

// This function is used to update payment gateway in QB
const updatePaymentGateway = async (customerID, apiData, QBtoken) => {
    await utils.verifyUser(QBtoken);
    let updateUserPaymentBody = {
        gateway_id: customerID,
        _user_id: apiData.user_id
    };

    if (apiData.plan_id == 'basic' || apiData.plan_id == 'unlimited') {
        updateUserPaymentBody.current_plan_id = apiData.plan_id;
    }

    if ('token' in apiData && apiData.token) {
        // Get the token details for last 4 
        let tokenDetails = await stripe.tokens.retrieve(apiData.token);
        console.log('tokenDetails', tokenDetails);
        if (tokenDetails && 'card' in tokenDetails && tokenDetails.card) {
            updateUserPaymentBody.last4 = tokenDetails.card.last4;
        }
    }
    await DBManager.dataInsert('user_payment_gateway', updateUserPaymentBody);
};

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await DBManager.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
}
//When a user changes his plan
const notifyUserOnPlanChange = async (user, oldPlanId, newPlanId) => {
    var userDeviceTokenData = await getUserDeviceToken(user.user_id);
    var userName = utils.toTitleCase((user.first_name && user.last_name) ? user.first_name + ' ' + user.last_name : user.username);
    
    let USER_HAS_CHANGED_HIS_PLAN = emailAndPushNotiTitles.USER_HAS_CHANGED_HIS_PLAN;
    USER_HAS_CHANGED_HIS_PLAN = USER_HAS_CHANGED_HIS_PLAN
        .replace('<userName>', userName)
        .replace('<oldPlanId>', oldPlanId)
        .replace('<newPlanId>', newPlanId);

    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var message = {
            title: emailAndPushNotiTitles.PLAN_CHANGED,
            body: USER_HAS_CHANGED_HIS_PLAN,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        await AWSManager.sendPushNotification(message, token);
    }

    let saveObj = {
        _user_id: user.user_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify({
            messageFrom: stringMessages.PROMO_TEAM
        }),
        notify_user_id: user.user_id,
        notify_text: USER_HAS_CHANGED_HIS_PLAN,
    }

    return await DBManager.dataInsert("user_notification", saveObj);
}

module.exports.handler = async (event, context, callback) => {
    let apiData = JSON.parse(event.body);

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        var userId = user.id;
        await validate(apiData);
        apiData.user_id = user.id;

        var loggedUserDetails = {};
        await DBManager.getData("user_master", "user_id, first_name, last_name, username", { user_id: user.id }).then(result => {
            loggedUserDetails = result[0];
            return loggedUserDetails;
        })

        var userDetails = await getUserDetails(userId);
        var customerID = userDetails[0].stripe_customer_id;
        if (customerID) {
            await updateCustomer(apiData, customerID);
        } else {
            let customerIdResponse = await createCustomer(apiData);
            if (customerIdResponse) {
                customerID = customerIdResponse.id;
            }
        }

        let response = { "message": "Payment is successful", 'customerID': customerID };
        if (apiData.subscription) {
            if (!apiData.old_plan_id) {
                // Create the subscription
                await createSubscription(apiData, customerID);
            } else {
                //When a user changes his plan
                await notifyUserOnPlanChange(loggedUserDetails, apiData.old_plan_id, apiData.plan_id);
                await updateSubscription(apiData, customerID);
            }
            var updateUserPlanWhere = { user_id: user.id };
            let updatedValue = { current_plan: apiData.plan_id };
            await DBManager.dataUpdate("user_master", updatedValue, updateUserPlanWhere);
        } else {
            await createCharge(apiData, customerID);
        }
        await updatePaymentGateway(customerID, apiData, event.headers.Authorization);
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        console.error("error : ", error);
        return awsRequestHelper.respondWithSimpleMessage(500, error.message);
    }
};
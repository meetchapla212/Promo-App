'use strict';
const stripe = require("stripe")(process.env.STRIPE_KEY);//this key should be the private key
const { errorMessages } = require("../lambda-v2/common/constants");
const awsRequestHelper = require('./common/awsRequestHelper');

const getCoupon = function (coupon) {
    console.log('Inside getCoupon', coupon);
    return stripe.coupons.retrieve(coupon);
}

module.exports.handler = (event, context, callback) => {
    console.log('Got event', event);
    getCoupon(event.pathParameters.id).then(coupon => {
        if (coupon) {
            let isValid = true;
            let nowInSec = (new Date().valueOf() / 1000);
            console.log(nowInSec);
            if (coupon.times_redeemed <= coupon.max_redemptions && coupon.valid) {
                if (coupon.metadata && coupon.metadata.times_redeemed && (( parseInt(coupon.metadata.times_redeemed) + coupon.times_redeemed) > coupon.max_redemptions)) {
                    console.log('here');
                    isValid = false;
                }
            } else {
                isValid = false;
            }
            if (isValid) {
                awsRequestHelper.callbackRespondWithJsonBody(callback, 200, coupon);
            } else {
                awsRequestHelper.callbackRespondWithSimpleMessage(callback, 404, errorMessages.COUPON_CODE_NOT_FOUND);
            }
        } else {
            awsRequestHelper.callbackRespondWithSimpleMessage(callback, 404, errorMessages.COUPON_CODE_NOT_FOUND);
        }
    }).catch(error => {
        console.error("error : ", error);
        if (error.status_code == 400) {
            awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, error.message);
        } else {
            awsRequestHelper.callbackRespondWithSimpleMessage(callback, 500, error.message);
        }
    });
}
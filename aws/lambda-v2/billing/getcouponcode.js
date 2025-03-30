'use strict';
const stripe = require("stripe")(process.env.STRIPE_KEY);//this key should be the private key
const { successMessages, errorMessages } = require("../common/constants");
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");

module.exports.handler = (event, context, callback) => {
    return stripe.coupons.retrieve(event.pathParameters.coupon_code).then(coupon => {
        if (coupon) {
            if ((coupon.times_redeemed > coupon.max_redemptions && coupon.valid) || (coupon.metadata && coupon.metadata.times_redeemed && ((parseInt(coupon.metadata.times_redeemed) + coupon.times_redeemed) > coupon.max_redemptions))) {
                var response = { status: false, message: errorMessages.INVALID_COUPON_CODE }
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {
                var response = { status: true, message: successMessages.VALID_COUPON_CODE, data: coupon }
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        } else {
            var response = { status: false, message: errorMessages.COUPON_CODE_NOT_FOUND }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
    }).catch(error => {
        console.error("error :", error);
        var response = { status: false, message: error.message }
        if (error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        } else {
            return awsRequestHelper.respondWithJsonBody(500, response);
        }
    });
}
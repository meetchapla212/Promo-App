'use strict';
const stripe = require("stripe")(process.env.STRIPE_KEY);//this key should be the private key
const awsRequestHelper = require('./common/awsRequestHelper');


module.exports.handler = async (event,context,callback)=>{
    console.log('Got event',event);
    let charges = await stripe.charges.list({
        customer:event.pathParameters.id,
        limit: 100
    })
    return awsRequestHelper.respondWithJsonBody( 200,charges);
};
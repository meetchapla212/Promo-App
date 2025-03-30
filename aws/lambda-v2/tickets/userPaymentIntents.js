const stripe = require("stripe")(process.env.STRIPE_KEY);
const Joi = require('joi');
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        ticketDetails: Joi.array().items(
            Joi.object({
                ticket_id: Joi.number().required(),
                ticket_qty: Joi.number().optional(),
            })
        ).required(),
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

async function getEventTicketDetails(ticketId) {
    return new Promise(async (resolve, reject) => {
        let sqlQry = "SELECT total_price, price FROM event_tickets WHERE ticket_id = " + ticketId + " ";
        let eventTicket = await DBManager.runQuery(sqlQry);
        return resolve(eventTicket);
    })
}

async function getPaymentIntentAmount(ticketsArray) {
    return Promise.all(ticketsArray.map(async ticket => {
        var ticketDetails = await getEventTicketDetails(ticket.ticket_id);
        if (ticketDetails.length > 0) {
            if (ticket.amount && ticket.amount > 0) {
                var ticketTotalPrice = ticket.amount;
                return ticketTotalPrice;
            } else {
                var ticketTotalPrice = ticketDetails[0].total_price > 0 ? ticketDetails[0].total_price : ticketDetails[0].price;
                var ticketQunatity = ticket.ticket_qty;
                var ticketTotalAmount = ticketQunatity * ticketTotalPrice
                return ticketTotalAmount;
            }
        } else {
            return 0;
        }
    })).then(allTicketsTotalAmounts => {
        let totalIntentAmount = allTicketsTotalAmounts.reduce((totalAmount, ticketAmount) => {
            return totalAmount + ticketAmount;
        })
        return totalIntentAmount * 100;
    }).catch(error => {
        return error
    })
}

async function processPaymentIntent(amount, userCustomerId) {
    return new Promise(async (resolve, reject) => {
        const paymentIntent = await stripe.paymentIntents.create({
            customer: userCustomerId,
            amount: Math.round(amount),
            currency: 'usd',
        });
        resolve(paymentIntent.client_secret)
    })
}

async function getUserDetails(userId) {
    return new Promise(async (resolve, reject) => {
        let sqlQry = "SELECT stripe_customer_id FROM user_master WHERE user_id = " + userId + " ";
        let userDetails = await DBManager.runQuery(sqlQry);
        return resolve(userDetails);
    })
}

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        var user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        var totalIntentAmount = await getPaymentIntentAmount(apiData.ticketDetails);
        var userDetails = await getUserDetails(user.id);
        var userCustomerId = userDetails[0].stripe_customer_id;
        return processPaymentIntent(totalIntentAmount, userCustomerId).then(paymentIntentResponse => {
            return awsRequestHelper.respondWithJsonBody(200, { success: true, message: successMessages.PAYMENT_INTENT, data: paymentIntentResponse });
        }).catch((error) => {
            console.error("error : ", error);
            return awsRequestHelper.respondWithJsonBody(200, { success: false, message: error.message });
        })
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
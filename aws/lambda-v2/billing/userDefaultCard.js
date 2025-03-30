const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
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

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let cardId = event.pathParameters.card_id;
        var userId = user.id;
        var userDetails = await getUserDetails(userId);
        var userCustomerId = userDetails[0].stripe_customer_id;

        if (!userCustomerId) {
            userCustomerId = await createCustomer(user.id, user.username);
        }

        const customer = await stripe.customers.update(userCustomerId, {
            default_source: cardId
        });

        response = { success: true, message: successMessages.USER_CARD_CHANGED, confirmation: customer }
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        response.message = error.message;
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages } = require("../common/constants");

// async function getEphemeralKeys(customerId, api_version) {
//     return new Promise(async (resolve, reject) => {
//         try {
//             var key = await stripe.ephemeralKeys.create({ customer: customerId }, { stripe_version: api_version });
//             resolve(key);
//         } catch (error) {
//             reject(error);
//         }
//     })
// }

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
        var api_version = event.queryStringParameters.api_version;
        // console.log('========' + event.queryStringParameters.api_version)
        var userId = user.id;
        var userDetails = await getUserDetails(userId);
        var userCustomerId = userDetails[0].stripe_customer_id;
        if (userCustomerId == '') {
            userCustomerId = await createCustomer(user.id, user.username);
            // return await getEphemeralKeys(userCustomerId, api_version).then((ephemeralKeysRes) => {
            //     return awsRequestHelper.respondWithJsonBody(200, ephemeralKeysRes);
            // }).catch((error) => {
            //     return awsRequestHelper.respondWithJsonBody(200, { success: false, message: error.message });
            // })
        }
        // else {

        // return await getEphemeralKeys(userCustomerId).then((ephemeralKeysRes) => {
        //     return awsRequestHelper.respondWithJsonBody(200, ephemeralKeysRes);
        // }).catch((error) => {
        //     return awsRequestHelper.respondWithJsonBody(200, { success: false, message: error.message });
        // })
        // }
        console.log('userCustomerId', userCustomerId)
        console.log('api_version', api_version)
        var key = await stripe.ephemeralKeys.create({ customer: userCustomerId },{ apiVersion: api_version });
        return { body: JSON.stringify(key) }
        // return awsRequestHelper.respondWithJsonBody(200, key);
    } catch (error) {
        response.message = error.message;
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
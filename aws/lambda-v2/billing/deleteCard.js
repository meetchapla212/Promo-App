const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const DBManager = new DBM();
const utils = require("../common/utils");
const FILE_PATH = __filename;
const { errorMessages, successMessages } = require("../common/constants");

async function getUserDetails(userId) {
    return new Promise(async (resolve, reject) => {
        let sqlQry = `SELECT stripe_customer_id FROM user_master WHERE user_id = ${userId}`;
        let userDetails = await DBManager.runQuery(sqlQry);
        return resolve(userDetails);
    });
}

const processRemoveCard = (customerId, cardId) => {
    return new Promise(async (resolve, reject) => {
        await stripe.customers.deleteSource(customerId, cardId, function (error, confirmation) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            }
            resolve(confirmation);
        });
    });
};

const createCustomer = async function (user_id, username) {
    return stripe.customers.create({
        description: "Create new Customer " + username,
        metadata: {
            user: user_id,
        },
    }).then(async (res) => {
        let whereQry = { user_id: user_id };
        await DBManager.dataUpdate("user_master", { stripe_customer_id: res.id }, whereQry);
        return res.id;
    });
};

module.exports.handler = async (event, context, callback) => {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };
    try {
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        var userId = user.id;
        let cardId = event.pathParameters.card_id;
        var userDetails = await getUserDetails(userId);
        var userCustomerId = userDetails[0].stripe_customer_id;

        if (!userCustomerId) {
            userCustomerId = await createCustomer(user.id, user.username);
        }

        console.log("REMOVE_CARD", userCustomerId, cardId);
        return await processRemoveCard(userCustomerId, cardId).then((cardRemoveConfirmation) => {
            return awsRequestHelper.respondWithJsonBody(200, {
                success: true,
                message: successMessages.CARD_REMOVED,
                confirmation: cardRemoveConfirmation,
            });
        }).catch((error) => {
            return awsRequestHelper.respondWithJsonBody(200, {
                success: false,
                message: error.message,
            });
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
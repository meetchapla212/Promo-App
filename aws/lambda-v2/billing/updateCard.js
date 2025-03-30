const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const Joi = require("joi");
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

const createCustomer = async function (user_id, username) {
    return stripe.customers.create({
        description: "Create new Customer " + username,
        metadata: {
            user: user_id,
        },
    }).then(async (res) => {
        let whereQry = { user_id: user_id };
        await DBManager.dataUpdate("user_master", {
            stripe_customer_id: res.id
        }, whereQry);
        return res.id;
    });
};

const updateCardDetails = (cardId, userCustomerId, cardDetailsUpdateObj) => {
    return new Promise(async (resolve, reject) => {
        await stripe.customers.updateSource(userCustomerId, cardId, {
            ...cardDetailsUpdateObj
        }, function (error, card) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            }
            resolve(card);
        });
    });
};

const validate = function (body) {
    const schema = Joi.object().keys({
        card_id: Joi.string().required(),
        update_body: Joi.object({
            exp_month: Joi.string().min(2).max(2),
            exp_year: Joi.string().min(4).max(4),
        }),
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
            allowUnknown: true,
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
};

module.exports.handler = async (event, context, callback) => {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };
    try {
        var user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        var userId = user.id;
        var apiData = JSON.parse(event.body);
        await validate(apiData);
        var cardId = apiData.card_id;
        var cardDetailsUpdateObj = apiData.update_body;
        var userDetails = await getUserDetails(userId);
        var userCustomerId = userDetails[0].stripe_customer_id;

        if (!userCustomerId) {
            userCustomerId = await createCustomer(user.id, user.username);
        }

        return await updateCardDetails(cardId, userCustomerId, cardDetailsUpdateObj).then((cardUpdateResult) => {
            return awsRequestHelper.respondWithJsonBody(200, {
                success: true,
                message: successMessages.CARD_UPDATED,
                data: cardUpdateResult,
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
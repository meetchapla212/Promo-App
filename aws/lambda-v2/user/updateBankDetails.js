const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const Joi = require("joi");
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const DBManager = new DBM();
const utils = require("../common/utils");
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        account_holder_name: Joi.string(),
        account_holder_type: Joi.string(),
        bank_token: Joi.string(),
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
            allowUnknown: false,
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
        let user = await utils.verifyUser(event.headers.Authorization);
        var userId = user.id;
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        if (!apiData.bank_token) {
            response = {
                success: false,
                message: errorMessages.REQUIRED_BANK_TOKEN_TO_UPDATE
            };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        var updateUserBankDetails = {};
        if (apiData.account_holder_name) {
            updateUserBankDetails["account_holder_name"] = apiData.account_holder_name;
        }

        if (apiData.account_holder_type) {
            updateUserBankDetails["account_holder_type"] = apiData.account_holder_type;
        }

        let userAccId = "";
        let userAccountDetails = await DBManager.getData("user_master", "stripe_account_id", { user_id: userId });
        if (userAccountDetails.length > 0) {
            if (userAccountDetails[0].stripe_account_id != "") {
                userAccId = userAccountDetails[0].stripe_account_id;
            } else {
                response = {
                    success: false,
                    message: errorMessages.USER_HAVE_NOT_LINKED_ACCOUNT
                };
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        }

        if (userAccId == "") {
            response = {
                success: false,
                message: errorMessages.USER_HAVE_NOT_LINKED_ACCOUNT
            };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
        return await stripe.accounts.updateExternalAccount(userAccId, apiData.bank_token, {
            ...updateUserBankDetails,
        }).then(async (bankAccount) => {
            let userArray = {
                stripe_bank_id: bankAccount.id,
                _user_id: user.id,
                account_holder_name: bankAccount.account_holder_name,
                account_holder_type: bankAccount.account_holder_type,
                bank_name: bankAccount.bank_name,
                last4: bankAccount.last4,
                routing_number: bankAccount.routing_number,
            };

            await DBManager.dataUpdate("user_bank_info", userArray, {
                _user_id: user.id, stripe_bank_id: bankAccount.id,
            });
            response = { success: true, message: successMessages.BANK_DETAILS_UPDATED };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch((error) => {
            console.error("error : ", error);
            response = { success: false, message: error.message };
            return awsRequestHelper.respondWithJsonBody(200, response);
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
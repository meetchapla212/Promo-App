// const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        return await DBManager.getData('user_bank_info', '*', { _user_id: user.id }).then(async bankAccounts => {
            if (bankAccounts && bankAccounts.length > 0) {
                return Promise.all(
                    bankAccounts.map(async bankdetails => {
                        var getBankEventCountQuery = "SELECT count(*) as totalEvent FROM event_master WHERE bank_id = " + bankdetails.bank_id + " AND status = 'active' AND is_draft = 0";
                        return await DBManager.runQuery(getBankEventCountQuery).then(response => {
                            bankdetails.total_events = response[0].totalEvent;
                            return bankdetails;
                        })
                    })
                ).then(promiseresponse => {
                    response = { success: true, message: successMessages.GET_BANK_ACCOUNT_LIST, data: promiseresponse };
                    return awsRequestHelper.respondWithJsonBody(200, response);
                })
            } else {
                response = { success: true, message: "No bank account found" };
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        }).catch(error => {
            console.error("error : ", error);
            response = { success: false, message: error.message };
            return awsRequestHelper.respondWithJsonBody(200, response);
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
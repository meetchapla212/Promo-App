const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

let createLink = async (accountId, apiData) => {
    var link = await stripe.accountLinks.create({
        account: accountId,
        failure_url: apiData.failure_url,
        success_url: apiData.success_url,
        type: 'custom_account_verification',
        collect: 'eventually_due',
    });
    return link
}

let retrieve = async (userId, accountId, apiData) => {
    return await stripe.accounts.retrieve(
        accountId
    ).then(async res => {
        var newAccountStatus = 'unverified';

        if (res.verification.pending_verification.length > 0) {
            newAccountStatus = 'pending'
        }
        if (res.payouts_enabled && res.charges_enabled) {
            newAccountStatus = 'verified'
        }

        if (newAccountStatus === 'unverified') {
            const accountLinks = await createLink(accountId, apiData)
            var data = { success: true, message: 'some information are required please fill them!', link: accountLinks.url, stripe_verification_status: 'reject' }
        } else if (newAccountStatus === 'verified') {
            await DBManager.dataUpdate('user_master', { payouts_enabled: 1, charges_enabled: 1 }, { user_id: userId });
            var data = { success: true, message: successMessages.ACCPUNT_VERIFIED, stripe_verification_status: 'approve' }
        } else if (newAccountStatus === 'pending') {
            var data = { success: true, message: successMessages.ACCOUNT_STATUS_IS_UNDER_REVIEW, stripe_verification_status: 'pending' }
        }
        return data
    }).catch(error => {
        console.error("error : ", error);
        var data = { success: false, message: errorMessages.DATA_NOT_FOUND }
        return data
    })
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        console.log("user.id : ", user.id);
        return await DBManager.getData('user_master', 'charges_enabled, payouts_enabled, stripe_account_id', { user_id: user.id }).then(async userDetails => {
            if (userDetails && userDetails.length) {
                if (userDetails[0].charges_enabled == 1 && userDetails[0].payouts_enabled == 1) {
                    response = { success: true, message: successMessages.ACCOUNT_APPROVED, stripe_verification_status: 'approve' }
                } else {
                    response = await retrieve(user.id, userDetails[0].stripe_account_id, apiData)
                }
            } else {
                response.message = errorMessages.INCORRECT_USER_OR_UNAUTHORIZED;
            }
            return awsRequestHelper.respondWithJsonBody(200, response);
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('./../common/utils');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const AWSManager = require('../common/awsmanager');
const _ = require('lodash');
const { errorMessages, successMessages, emailAndPushNotiTitles } = require("../common/constants");
const moment = require('moment');

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        var userId = user.id;

        return await DBManager.getData("user_master", "email, first_name, last_name, username", { user_id: userId }).then(async (userDetails) => {
            if (userDetails.length > 0) {
                let userData = userDetails[0];
                if (userData.email) {
                    let emailToken = uuidv4();
                    await DBManager.dataUpdate('user_master', {
                        email_token: emailToken,
                        otp_generate_time: moment().format("YYYY-MM-DD HH:mm:ss")
                    }, { user_id: userId });

                    let tmpl = fs.readFileSync('./lambda/emailtemplates/verify-email.html', 'utf8');
                    let mailSubject = emailAndPushNotiTitles.VERIFY_EMAIL;

                    let verify_email_url = `${process.env.UI_BASE_URL}/verify-email?token=${emailToken}&email=${userData.email}`;
                    let templateVars = Object.assign({
                        base_url: process.env.UI_BASE_URL,
                        verifyEmailUrl: verify_email_url,
                        name: utils.toTitleCase((userData.first_name && userData.last_name) ? userData.first_name + ' ' + userData.last_name : userData.username),
                    }, AWSManager.MAIL_PARAMS);

                    let mailBody = _.template(tmpl)(templateVars);
                    await AWSManager.sendEmail([userData.email], mailBody, mailSubject);

                    response.success = true;
                    response.message = successMessages.VERIFY_EMAIL_LINK_SENT_TO_MAIL;
                    return awsRequestHelper.respondWithJsonBody(200, response);
                } else {
                    response.success = false;
                    response.message = successMessages.EMAIL_NOT_EXIST_IN_YOUR_ACCOUNT;
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }
            } else {
                response.success = false;
                response.message = errorMessages.USER_NOT_FOUND;
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        })
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
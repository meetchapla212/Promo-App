const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const utils = require('./../common/utils');
const fs = require('fs');
const AWSManager = require('../common/awsmanager');
const _ = require('lodash');
var md5 = require('md5');
const QBM = require('./../common/qbmanager');
const QBMObject = new QBM();
let QbSessionToken = '';
const {
    errorMessages,
    successMessages,
    emailAndPushNotiTitles
} = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        email: Joi.string().required(),
        otp: Joi.string().required(),
        first_name: Joi.string().optional('').allow(''),
        last_name: Joi.string().optional('').allow(''),
        city: Joi.string().optional('').allow(''),
        event_id: Joi.number().required(),
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

const makeUniqUserName = (oldUsername, length) => {
    var result = '';
    var characters = 'abcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return oldUsername + '' + result;
}

const generatePassword = () => {
    var length = 8, charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

const sendWelcomeMailToUserOnSignUp = async (user, organiser) => {
    let organiserWebsiteUrl = (organiser && organiser.url) ? organiser.url : '';
    let organiserWebsiteLogo = (organiser && organiser.logo) ? organiser.logo : '';
    let userName = '';
    if (user.first_name && user.last_name) userName = utils.toTitleCase(user.first_name + ' ' + user.last_name);
    else if (user.first_name) userName = utils.toTitleCase(user.first_name);
    else if (user.last_name) userName = utils.toTitleCase(user.last_name);
    else if (user.username) userName = utils.toTitleCase(user.username);

    if (user.email && user.email !== '') {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/send_welcome_mail_to_widget_user.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.WELCOME_TO_PROMO_APP;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            userName: userName,
            userEmail: user.email,
            userPassword: user.password,
            changePasswordLink: `${process.env.UI_BASE_URL}/changepassword`,
            organiserWebsiteUrl,
            organiserWebsiteLogo
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([user.email], mailBody, mailSubject);
    }
}


module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        var eventId = apiData.event_id;
        delete apiData.event_id;
        var eventOrganiser = {};

        let getEventOrganiserQuery = `SELECT user_master.url, user_master.logo
            from event_master
            join user_master on event_master._user_id = user_master.user_id
            where event_master.event_id = ${eventId}`;
        await DBManager.runQuery(getEventOrganiserQuery).then(async (eventOrg) => {
            eventOrganiser = eventOrg[0];
            return eventOrg;
        })

        let userEmail = apiData.email;
        let oneTimePassword = apiData.otp;
        delete apiData.email;
        delete apiData.otp;
        let userData = apiData;

        //check user exist in promo
        let promoUserQry = { email: userEmail };
        var promoUserFieldsObj = "`user_id`, `first_name`, `last_name`, `full_name`, `email`, `username`, `profile_pic`, `city`, `logo`, `website_name`, `url`, `widget_otp`, `is_widget_otp_verified`";
        let isPromoUserExist = await DBManager.getData('user_master', promoUserFieldsObj, promoUserQry, "OR");
        if (isPromoUserExist.length > 0) {
            //compare otp
            if (isPromoUserExist[0].widget_otp && isPromoUserExist[0].widget_otp == oneTimePassword) {

                let updatePromoUser = {
                    ...userData,
                    is_widget_otp_verified: 1,
                    is_email_verified: 1
                };

                await DBManager.dataUpdate('user_master', updatePromoUser, promoUserQry);

                let promoUser = await DBManager.getData('user_master', promoUserFieldsObj, promoUserQry, "OR");
                let promoUserData = promoUser[0];
                let userToken = {
                    id: promoUserData['user_id'],
                    username: promoUserData['username'],
                    email: promoUserData['email'],
                    first_name: promoUserData["first_name"],
                    last_name: promoUserData["last_name"],
                    is_email_verified: 1,
                };

                let token = utils.createJWT(userToken);

                let responseData = {
                    user_id: promoUserData["user_id"],
                    email: promoUserData["email"],
                    first_name: promoUserData["first_name"],
                    last_name: promoUserData["last_name"],
                    city: promoUserData["city"],
                    logo: promoUserData['logo'],
                    website_name: promoUserData['website_name'],
                    url: promoUserData['url'],
                    token
                };

                response = {
                    success: true,
                    message: successMessages.ACCOUNT_VERIFIED_SUCCESSFULLY,
                    data: responseData
                };
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {
                response.message = "Failure, Invalid verification code doesn't match, please try again!";
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        }


        //check guest user already created
        let guestUserQry = { email: userEmail };
        var guestUserFieldsObj = "`guest_id`, `first_name`, `last_name`, `email`, `widget_otp`, `is_widget_otp_verified`";
        let isWidgetGuestUserExist = await DBManager.getData('guest_widget_users', guestUserFieldsObj, guestUserQry, "OR");
        if (isWidgetGuestUserExist.length > 0) {
            //compare otp

            if (isWidgetGuestUserExist[0].widget_otp && isWidgetGuestUserExist[0].widget_otp == oneTimePassword) {
                //register guest user on promo app
                let userPassword = generatePassword();
                let user = {
                    ...userData,
                    email: userEmail,
                    password: md5(userPassword),
                    widget_otp: isWidgetGuestUserExist[0].widget_otp,
                    is_widget_otp_verified: 1,
                    is_email_verified: 1,
                    is_guest: 1
                };

                if ('first_name' in userData && userData.first_name !== '') {
                    user.username = userData.first_name;
                } else {
                    user.username = makeUniqUserName('', 10);
                }

                let userNameExists = await DBManager.getData('user_master', 'user_id, username', { username: user.username });
                if (userNameExists.length) {
                    user.username = makeUniqUserName(user.username, 5);
                }

                let quickBloxSession = await QBMObject.session();
                QbSessionToken = quickBloxSession.token;
                return await QBMObject.createUser('users', {
                    user: {
                        full_name: user.username,
                        login: user.username,
                        password: "thepromoappqb",
                    }
                }, QbSessionToken).then(async (QBuserDetails) => {
                    user.quickblox_id = QBuserDetails.user.id;
                    user.current_plan = "free";

                    //register user
                    await DBManager.dataInsert("user_master", user);

                    //update widget user
                    let guestUserUpdateData = {
                        first_name: userData.first_name,
                        last_name: userData.last_name,
                        is_widget_otp_verified: 1
                    }

                    await DBManager.dataUpdate("guest_widget_users", guestUserUpdateData, guestUserQry);

                    var queryfieldsObj = "`user_id`, `first_name`, `last_name`, `full_name`, `email`, `username`, `profile_pic`, `city`, `logo`, `website_name`, `url`, `is_widget_otp_verified`, `is_email_verified`";
                    let res = await DBManager.getData("user_master", queryfieldsObj, promoUserQry, "OR");
                    let newPromoUser = res[0];
                    newPromoUser.password = userPassword;

                    //welcome mail on singup with initial credential
                    await sendWelcomeMailToUserOnSignUp(newPromoUser, eventOrganiser);

                    let userToken = {
                        id: newPromoUser['user_id'],
                        username: newPromoUser['username'],
                        email: newPromoUser['email'],
                        first_name: newPromoUser["first_name"],
                        last_name: newPromoUser["last_name"],
                        is_email_verified: newPromoUser["is_email_verified"],
                    };

                    let token = utils.createJWT(userToken);

                    let responseData = {
                        user_id: newPromoUser["user_id"],
                        email: newPromoUser["email"],
                        first_name: newPromoUser["first_name"],
                        last_name: newPromoUser["last_name"],
                        city: newPromoUser["city"],
                        logo: newPromoUser['logo'],
                        website_name: newPromoUser['website_name'],
                        url: newPromoUser['url'],
                        token
                    };

                    response = {
                        success: true,
                        message: successMessages.ACCOUNT_VERIFIED_SUCCESSFULLY,
                        data: responseData
                    };
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }).catch((error) => {
                    if (error.statusCode == 422) {
                        response.message = "Failure, user already registered on quickblox!";
                    } else {
                        response.message = error.message;
                    }
                    return awsRequestHelper.respondWithJsonBody(error.statusCode, response);
                });
            } else {
                response.message = "Failure, Invalid verification code doesn't match, Please try again!";
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        } else {
            response.message = "Failure, User not found with given email, Something went wrong!";
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
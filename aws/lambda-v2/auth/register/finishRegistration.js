"use strict";
var md5 = require("md5");
const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const DBM = require("../../common/mysqlmanager");
const DBManager = new DBM();
const Joi = require("joi");
const utils = require("../../common/utils");
const QBM = require("../../common/qbmanager");
const _ = require("lodash");
const QBMObject = new QBM();
const fs = require("fs");
const AWSManager = require("../../common/awsmanager");
var AWS = require("aws-sdk");
const {
    errorMessages,
    successMessages,
    emailAndPushNotiTitles
} = require("../../common/constants");

// Set region us-east-1
AWS.config.update({
    region: "us-east-1",
});

const preValidate = async (body) => {
    const schema = Joi.object().keys({
        username: Joi.string().required(),
        first_name: Joi.string().required(),
        last_name: Joi.string().required(),
        password: Joi.string().required(),
        city: Joi.string().required(),
        city_lat: Joi.string().required(),
        city_long: Joi.string().required(),
    });

    return await Joi.validate(body, schema, { abortEarly: false });
};

const makeUniqueUserName = (oldUsername, length) => {
    var result = "";
    var characters = "abcdefghijklmnopqrstuvwxyz";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return oldUsername + "" + result;
};

const createQbUser = async (userName) => {
    const quickBloxSession = await QBMObject.session();
    const QbSessionToken = quickBloxSession.token;
    return await QBMObject.createUser("users", {
        user: {
            full_name: userName,
            login: userName,
            password: "thepromoappqb",
        },
    }, QbSessionToken);
};

const sendWelcomeMailToUserOnSignUp = async (user) => {
    let userName = utils.toTitleCase(
        user.first_name && user.last_name ? user.first_name + " " + user.last_name : user.username
    );
    if (user.email && user.email !== "") {
        let tmpl = fs.readFileSync("./lambda/emailtemplates/welcome_mail_on_user_signup.html", "utf8");
        let mailSubject = emailAndPushNotiTitles.WELCOME_TO_PROMO_APP;
        let signin_url = `${process.env.UI_BASE_URL}/login`;
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            signinUrl: signin_url,
            userName: userName,
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([user.email], mailBody, mailSubject);
    }
};

// handler
module.exports.handler = async function (event, context, callback) {
    let response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };

    try {
        const user = utils.verifyJWT(event.headers.Authorization);

        if (!user.unfinishedRegistration) {
            return awsRequestHelper.respondWithJsonBody(422, { ...response, message: errorMessages.AUTHORIZATION_ERROR });
        }
        let apiData = JSON.parse(event.body);

        // validate data
        const validationErrors = await preValidate(apiData);
        if (validationErrors.error) {
            if(validationErrors.error.details && validationErrors.error.details.length){    
                if((validationErrors.error.details[0].message == '"city_lat" is not allowed to be empty') || 
                    (validationErrors.error.details[0].message == '"city_long" is not allowed to be empty')){
                    response.message = errorMessages.CITY_LAT_LONG_REQUIRED;
                } else {
                    response.message = validationErrors.error.details[0].message;
                }
            } else {
                response.message = errorMessages.VALIDATION_ERROR;
            }
            return awsRequestHelper.respondWithJsonBody(422, response);
        }

        const userData = user;

        delete user.exp;
        delete user.unfinishedRegistration;

        // destructure validated apiData
        const { username, first_name, last_name, password, city, city_lat, city_long } = apiData;

        let isUsernameUnique = false;
        let userName = username;
        while (!isUsernameUnique) {
            const getSimilarUsernames = await DBManager.getData("user_master", "user_id", {
                username: userName,
            });
            console.log(getSimilarUsernames);
            if (getSimilarUsernames.length) {
                userName = makeUniqueUserName(userName, 5);
            } else {
                isUsernameUnique = true;
            }
        }

        // create quickBlox account

        let qbUser = undefined;

        // additional check because of inconsistent databse
        while (!qbUser) {
            try {
                console.log("before create");
                qbUser = await createQbUser(userName);
            } catch (e) {
                if (e.message.toString().includes("already been taken")) {
                    console.log("username taken");
                    userName = makeUniqueUserName(userName, 5);
                    console.log("new", userName);
                    qbUser = await createQbUser(userName);
                    console.log(qbUser);
                } else {
                    throw e;
                }
            }
        }

        // insert data into database
        const newUserData = {
            username: userName,
            first_name,
            last_name,
            password: md5(password),
            city,
            city_lat,
            city_long,
            ...userData,
            is_otp_verified: userData.mobile_number ? 1 : 0,
            is_email_verified: userData.email ? 1 : 0,
            current_plan: "free",
            quickblox_id: qbUser.user.id,
        };
        const newUser = await DBManager.dataInsert("user_master", newUserData);
        await DBManager.dataUpdate("user_contact_verification", { is_deleted: 1, }, user);

        let profileData = {
            id: newUser.insertId,
            username: userName,
            first_name,
            last_name,
            ...userData,
        };
        if (userData.email) {
            await sendWelcomeMailToUserOnSignUp(profileData);
        }

        let token = utils.createJWT(profileData);

        let data = {
            profile: { ...newUserData, id: newUser.insertId },
            token,
        };

        response = {
            success: true,
            message: successMessages.REGISTERED,
            data: data,
        };
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
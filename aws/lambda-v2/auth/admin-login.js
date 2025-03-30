// @ts-check
"use strict";
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const QBM = require("./../common/qbmanager");
const DBManager = new DBM();
const QBMObject = new QBM();
const utils = require("./../common/utils");
const Joi = require("joi");
const { errorMessages, stringMessages } = require("../common/constants");

// joi validation
const validate = async (body) => {
    const schema = Joi.object().keys({
        admin_key: Joi.string().required(),
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
    return await QBMObject.createUser("users",{
        user: {
            full_name: userName,
            login: userName,
            password: "thepromoappqb",
        },
    },QbSessionToken);
};

const createQuickBloxUser = async (userName, user_id) => {
    let qbUser = undefined;

    // additional check because of inconsistent databse
    while (!qbUser) {
        try {
            qbUser = await createQbUser(userName);
            await DBManager.dataUpdate("user_master",{ quickblox_id: qbUser.user.id, username: qbUser.user.login },{ user_id });
            return qbUser;
        } catch (e) {
            if (e.message.toString().includes("already been taken")) {
                console.log("username taken");
                userName = makeUniqueUserName(userName, 5);
                console.log("new", userName);
                qbUser = await createQbUser(userName);
                await DBManager.dataUpdate("user_master",{ quickblox_id: qbUser.user.id, username: qbUser.user.login },{ user_id });
                console.log(qbUser);
                return qbUser;
            } else {
                throw e;
            }
        }
    }
};

module.exports.handler = async (event) => {
    let response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };
    try {
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        const { admin_key } = apiData;

        // get all user details
        const query = `SELECT 
            u.user_id,
            u.username,
            u.email,
            u.mobile_number,
            u.username,
            u.first_name,
            u.last_name,
            u.profile_pic,
            u.about_you,
            u.city,
            u.city_lat,
            u.city_long,
            u.quickblox_id,
            u.current_plan,
            u.stripe_account_id,
            u.stripe_customer_id,
            u.is_verified,
            u.charges_enabled,
            u.payouts_enabled,
            u.country_code,
            u.mobile_number,
            u.stripe_country,
            u.stripe_defualt_card,
            u.logo,
            u.website_name,
            u.url,
            (SELECT COUNT(1)
                FROM admin_zoneowner_invitation_requests azir
                WHERE u.user_id = azir.user_id
                    AND azir.request_status = 1
                    AND azir.is_deleted = 0
                    AND azir.is_block = 0 
            ) AS is_zone_owner,
            (SELECT COUNT(1)
                FROM member_zonemember_invitation_requests mzir
                WHERE u.user_id = mzir.user_id
                    AND mzir.request_status = 1
                    AND mzir.is_deleted = 0
                    AND mzir.is_block = 0 
            ) AS is_zone_member,
            aal.admin_id
        FROM admin_account_login aal
        INNER JOIN user_master u 
            ON u.user_id = aal.user_id
        WHERE 
            aal.admin_key = '${admin_key}'
            AND aal.is_deleted = 0;`;

        const [result] = await DBManager.runQuery(query, false);
        if (!result) {
            response.message = errorMessages.NO_SUCH_KEY_OR_ALREADY_USED;
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        // set is_zone_owner and is_zone_member
        let { is_zone_member, is_zone_owner, admin_id, quickblox_id, username, user_id, email } = result;
        is_zone_member = !!is_zone_member;
        is_zone_owner = !!is_zone_owner;

        if (!quickblox_id || quickblox_id.length < 1) {
            if (!email) email = "";
            if (!username) username = makeUniqueUserName(email.split("@")[0], 7);
            const qbUser = await createQuickBloxUser(username, user_id);
            quickblox_id = qbUser.user.id;
            username = qbUser.user.login;
        }

        // user logged in as admin
        const admin_login = !!admin_id;

        // create jwt
        const userTokenData = {
            id: result.user_id,
            username: result.username,
            email: result.email,
            first_name: result.first_name,
            last_name: result.last_name,
            is_email_verified: result.is_email_verified,
            proxy_login: true,
            login_type: stringMessages.ADMIN_LOGIN_TYPE,
            proxy_user_id: admin_id,
        };
        const token = utils.createJWT(userTokenData);

        return awsRequestHelper.respondWithJsonBody(200, {
            ...result,
            is_zone_member,
            is_zone_owner,
            admin_login,
            quickblox_id,
            username,
            token,
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
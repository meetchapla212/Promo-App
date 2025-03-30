const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("./../common/mysqlmanager");
const utils = require('../common/utils');
const MDBObject = new MDB();
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        follow_user_id: Joi.number().required()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
}

module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);;
        await validate(apiData);
        let followuserId = apiData.follow_user_id;
        var whereQry = { _user_id: user['id'], 'follow_user_id': followuserId };
        
        return MDBObject.getData("follow_users", "count(*) as totalCount", whereQry).then(async (data) => {
            if (data[0].totalCount) {
                followStatus = { is_follow: true }
            } else {
                followStatus = { is_follow: false }
            }
            response = { success: true, message: successMessages.GET_FOLLOW_STATUS, data: followStatus }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch((error) => {
            console.error("error : ", error);
            return awsRequestHelper.respondWithJsonBody(500, response);
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
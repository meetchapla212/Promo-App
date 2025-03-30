const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require("joi");
const MDB = require("./../common/mysqlmanager");
const utils = require("../common/utils");
const MDBObject = new MDB();
const FILE_PATH = __filename;
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        user_id: Joi.number().required(),
        is_disqualify: Joi.number().required(),
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

module.exports.handler = async function (event, context, callback) {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };

    try {
        let apiData = JSON.parse(event.body);

        await validate(apiData);
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        let rewardId = event.pathParameters.reward_id;
        let userReward = await MDBObject.getData("reward_master", "count(*) as totalCount", { _user_id: user.id, reward_id: rewardId, });
        if (!userReward[0].totalCount) {
            response = { success: false, message: errorMessages.REWARD_IS_NOT_BELONG_TO_THIS_USER };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
        let updateValue = { is_disqualify: apiData.is_disqualify };
        let whereQuery = { _user_id: apiData.user_id, _reward_id: rewardId };

        return await MDBObject.dataUpdate("reward_applied_master", updateValue, whereQuery).then((rewardDetails) => {
            response.success = true;
            response.message = apiData.is_disqualify == 1 ? successMessages.USER_DISQUALIFY : successMessages.USER_QUALIFY;
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
const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const Joi = require('joi');
const DBManager = new MDB();
const { errorMessages, successMessages } = require("../../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        zone_id: Joi.required(),
        is_block: Joi.required()
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

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);

        let isUserIsZoneOwner = await DBManager.getData('user_master', 'user_id, is_zone_owner', { user_id: user.id, is_zone_owner: 1 }, "AND");
        if (isUserIsZoneOwner.length <= 0) {
            response = { success: false, message: errorMessages.NOT_OWNER_OF_ANY_ZONE };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        let organizer_id = event.pathParameters['organizer_id'];
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        //Is User is owner of this zone
        let isUserIsOwnerOfCurrentZone = await DBManager.getData('admin_zoneowner_invitation_requests', 'count(*) as totalCount', { 
            user_id: user.id, zone_id: apiData.zone_id, request_status: 1, is_block: 0, is_deleted: 0 
        });
        if (!isUserIsOwnerOfCurrentZone[0].totalCount) {
            response = { success: false, message: errorMessages.NOT_OWNER_OF_THIS_ZONE_SO_UNABLE_TO_BLOCK_ZONE_ORGANIZERS };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        await DBManager.dataUpdate("admin_zoneorganizer_invitation_requests", {
            is_block: apiData.is_block
        }, {
            user_id: organizer_id, zone_id: apiData.zone_id, is_deleted: 0
        });

        if (apiData.is_block === false) {
            response = { success: true, message: successMessages.ZONE_ORGANIZER_UNBLOCKED }
        } else {
            response = { success: true, message: successMessages.ZONE_ORGANIZER_BLOCKED }
        }
        
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
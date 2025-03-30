const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require("joi");
const MDB = require("../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require("../common/utils");
const FILE_PATH = __filename;
const { successMessages, errorMessages } = require('../common/constants');
// const sentryManager = require("../common/sentrymanager");

module.exports.handler = async function (event, context, callback) {
    var response = {
        success: false,
        message: "Server error! Please try again later",
    };

    try {
        await utils.verifyUser(event.headers.Authorization);
        let codeId = event.queryStringParameters.code_id ? event.queryStringParameters.code_id : '';
        let bulkDelete = event.queryStringParameters.bulk_delete;
        let whereQry = {}
        console.log(bulkDelete)
        // Condition for bulk delete
        if (bulkDelete == "true") {
            whereQry = {
                key: `code_limit`,
                value: 'remaining_qty'
            };
        } else {
            whereQry = {
                key: `id`,
                value: codeId
            };
        }
        return await MDBObject.runQuery(`SELECT count(*) as totalCount FROM promo_codes WHERE ${whereQry.key} = ${whereQry.value} AND is_deleted = 0`).then(
            async (codeDetails) => {
                console.log(whereQry)
                if (codeDetails && codeDetails.length && codeDetails[0].totalCount) {
                    await MDBObject.runQuery(`UPDATE promo_codes SET is_deleted=1 WHERE ${whereQry.key} = ${whereQry.value} AND is_deleted = 0`);
                    response = {
                        success: true,
                        message: successMessages.DISCOUNT_CODE_DELETED,
                    };
                } else {
                    response = {
                        success: false,
                        message: errorMessages.DISCOUNT_CODE_NOT_FOUND,
                    };
                }
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        );

    } catch (error) {
        response.message = error.message;
        // // Sentry Error Reporting
        // sentryManager.handler(err, response, event.path)
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};

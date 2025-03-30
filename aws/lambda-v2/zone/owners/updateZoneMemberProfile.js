const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require("../../common/utils");
const DBManager = new MDB();
const FILE_PATH = __filename;
const { errorMessages, successMessages } = require("../../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN, };
    try {
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        let isUserIsZoneOwner = await DBManager.getData("user_master", "count(*) as totalCount", { user_id: user.id, is_zone_owner: 1 });
        if (!isUserIsZoneOwner.length.totalCount) {
            response = { success: false, message: errorMessages.NOT_OWNER_OF_ANY_ZONE };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        let zoneMemberId = event.pathParameters["member_id"];
        let apiData = JSON.parse(event.body);
        return DBManager.getData("user_master", "count(*) as totalCount", whereQry).then(async (data) => {
            if (data[0].totalCount) {
                await DBManager.dataUpdate("user_master", apiData, { user_id: zoneMemberId });
                response = { success: true, message: successMessages.ZONE_MEMBER_DETAIL_UPDATED };
            } else {
                response = { success: false, message: "Failure, zone member not found." };
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
};
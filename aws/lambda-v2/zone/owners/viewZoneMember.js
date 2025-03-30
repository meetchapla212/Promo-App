const awsRequestHelper = require("../../../lambda/common/awsRequestHelper");
const MDB = require("../../common/mysqlmanager");
const utils = require('../../common/utils');
const DBManager = new MDB();
const { errorMessages, successMessages } = require("../../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);

        let isUserIsZoneOwner = await DBManager.getData('user_master', 'user_id, is_zone_owner', { user_id: user.id, is_zone_owner: 1 }, "AND");
        if (isUserIsZoneOwner.length <= 0) {
            response = { success: false, message: errorMessages.NOT_OWNER_OF_ANY_ZONE };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
        let zoneMemberId = event.pathParameters['member_id'];

        let viewZoneMemberQuery = `SELECT UM.user_id,UM.username, UM.first_name, UM.last_name,UM.profile_pic,UM.email, UM.is_block, UM.city, UM.about_you
            from member_zonemember_invitation_requests as MZIR join user_master as UM 
            on MZIR.user_id = UM.user_id where MZIR.is_deleted = 0 and UM.is_deleted = 0 and UM.user_id = ${zoneMemberId} group by MZIR.user_id`;

        return DBManager.runQuery(viewZoneMemberQuery).then(async (data) => {
            if (data.length > 0) {
                let zoneMemberData = data[0];
                let responseData = {
                    user_id: zoneMemberData.user_id,
                    first_name: zoneMemberData.first_name,
                    last_name: zoneMemberData.last_name,
                    email: zoneMemberData.email,
                    profile_pic: zoneMemberData.profile_pic,
                    city: zoneMemberData.city,
                    about_you: zoneMemberData.about_you
                }
                response = { success: true, message: successMessages.GET_ZONE_MEMBER, data: responseData }
            } else {
                response = { success: false, message: errorMessages.ZONE_MEMBER_NOT_FOUND }
            }
            return awsRequestHelper.respondWithJsonBody(200, response);
        })
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
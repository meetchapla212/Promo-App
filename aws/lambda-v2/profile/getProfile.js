const awsRequestHelper = require("../../lambda/common/awsRequestHelper");
const MDB = require("../common/mysqlmanager");
const DBManager = new MDB();
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let userId = event.pathParameters['user_id'];
        var whereQry = { user_id: userId };
        var fieldsObj = "`user_id`, `username`, `first_name`, `last_name`, `email`, `profile_pic`, `about_you`, `city`, `city_lat`, `city_long`,`quickblox_id`,`stripe_account_id`,`stripe_customer_id`,`is_verified`,`charges_enabled`,`payouts_enabled`, `mobile_number`, `country_code`,`stripe_country`,`stripe_defualt_card`, `logo`, `website_name`, `url`, `is_email_verified`";
        return DBManager.getData("user_master", fieldsObj, whereQry).then(async (data) => {
            if (data.length > 0) {
                data[0].is_feedback = false;
                await DBManager.getData('user_feedback', 'count(*) as totalCount', { _user_id: userId }).then(res => {
                    if (res[0].totalCount) {
                        data[0].is_feedback = true;
                    }
                })
                data[0].is_zone_owner = false;
                data[0].is_zone_member = false;

                await DBManager.getData('admin_zoneowner_invitation_requests', 'count(*) as totalCount', { user_id: userId, request_status: 1, is_deleted: 0, is_block: 0 }).then(resZoneAdmin => {
                    if (resZoneAdmin[0].totalCount) {
                        data[0].is_zone_owner = true;
                    }
                })
                await DBManager.getData('member_zonemember_invitation_requests', 'count(*) as totalCount', { user_id: userId, request_status: 1, is_deleted: 0, is_block: 0 }).then(resZoneAdminMember => {
                    if (resZoneAdminMember[0].totalCount) {
                        data[0].is_zone_member = true;
                    }
                })
                let ticketsDetailQuery = `SELECT count(*) as totalCount FROM user_tickets
                    Join event_master ON user_tickets.event_id = event_master.event_id
                    WHERE user_id = ${userId} AND user_tickets.is_deleted = 0 AND event_master.is_deleted = 0 AND user_tickets.status = 'active' AND ticket_details_status != 'cancel' AND ticket_details_status != 'refunded'`;
                await DBManager.runQuery(ticketsDetailQuery).then(ticketsDetail => {
                    data[0].tickets_count = ticketsDetail[0].totalCount;
                })
                response = { success: true, message: successMessages.GET_PROFILE, data: data[0] }
            } else {
                response = { success: false, message: errorMessages.USER_NOT_FOUND }
            }
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
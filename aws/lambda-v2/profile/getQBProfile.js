const awsRequestHelper = require("../../lambda/common/awsRequestHelper");
const MDB = require("../common/mysqlmanager");
const DBManager = new MDB();
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let qb_id = event.pathParameters['qb_id'];
        var whereQry = { quickblox_id: qb_id };
        // stripe_account_id: userResult["stripe_account_id"],
        //   stripe_customer_id: userResult["stripe_customer_id"],
        var fieldsObj = "`user_id`, `username`, `first_name`, `last_name`, `email`, `profile_pic`, `about_you`, `city`, `city_lat`, `city_long`,`quickblox_id`,`stripe_account_id`,`stripe_customer_id`,`is_verified`, `logo`, `website_name`, `url`";
        return DBManager.getData("user_master", fieldsObj, whereQry).then((data) => {
            if (data.length > 0) {
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
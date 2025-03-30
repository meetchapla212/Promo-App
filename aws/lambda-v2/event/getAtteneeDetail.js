const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const DBManager = new DBM();
const utils = require("../common/utils");
const Joi = require("joi");
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        event_id: Joi.string().required(),
        checkedin_device_id: Joi.string().optional(),
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

    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };
    try {
        await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        let pageNumber = parseInt((apiData && apiData.page && apiData.page > 0) ? apiData.page : 1);
        let pageLimit = parseInt((apiData && apiData.limit) ? apiData.limit : 10);
        let fetchWithoutLimit = (apiData && apiData.fetchWithoutLimit) ? true : false;
        let pageoffset = (pageNumber * pageLimit) - pageLimit;
        let totalRecords = 0;
        
        let whereQuery = `WHERE event_id = ${apiData.event_id}`;
        let sqlQuery = `SELECT
            count(*) as totalCount
            FROM user_ticket_details
            LEFT JOIN user_tickets ON (user_ticket_details._purchased_ticket_id = user_tickets.id)
            LEFT JOIN event_tickets ON (user_ticket_details._ticket_id = event_tickets.ticket_id)
            LEFT JOIN user_master ON (user_tickets.user_id = user_master.user_id)
            ${whereQuery}`;
        return await DBManager.runQuery(sqlQuery).then(async (data) => {
            if (data[0].totalCount) {
                totalRecords = data[0].totalCount
            }

            let sqlQuery = `SELECT
                id, details_id, user_ticket_details.checkedin_at, username, first_name, last_name, email, event_tickets.ticket_name, event_tickets.ticket_type
                FROM user_ticket_details
                LEFT JOIN user_tickets ON (user_ticket_details._purchased_ticket_id = user_tickets.id)
                LEFT JOIN event_tickets ON (user_ticket_details._ticket_id = event_tickets.ticket_id)
                LEFT JOIN user_master ON (user_tickets.user_id = user_master.user_id)
                ${whereQuery}`;

            if (!fetchWithoutLimit) {
                sqlQuery += ` LIMIT ${pageoffset},${pageLimit}`
            }

            let attendee_details = await DBManager.runQuery(sqlQuery);
            let checkedin_on_this_device = 0;
            if(apiData.checkedin_device_id){
                let checkedinQuery = `SELECT
                    count(*) as totalCount
                    FROM user_ticket_details
                    LEFT JOIN user_tickets ON (user_ticket_details._purchased_ticket_id = user_tickets.id)
                    WHERE event_id = ${apiData.event_id} AND checkedin_device_id = '${apiData.checkedin_device_id}'`;
                await DBManager.runQuery(checkedinQuery).then(data => {
                    if(data[0].totalCount){
                        checkedin_on_this_device = data[0].totalCount;
                    }
                });
            }
            response = {
                success: true,
                message: successMessages.GET_ATTENDEE_DETAILS,
                page: pageNumber,
                totalRecord: totalRecords,
                data: {
                    checkedin_on_this_device,
                    attendee_details
                },
            };
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
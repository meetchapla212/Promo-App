const awsRequestHelper = require("../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("../common/mysqlmanager");
const utils = require('../common/utils');
const MDBObject = new MDB();
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        event_id: Joi.required(),
        front_layout_file: Joi.string().required(),
        back_layout_file: Joi.string().required(),
        layout_thumbnail_url: Joi.string().required(),
        venue_map_name: Joi.string().required(),
        total_seating_capacity: Joi.number().optional(),
        tiers_assigned_seats: Joi.number().optional(),
        is_draft: Joi.optional(),
        tiers: Joi.array().items(
            Joi.object({
                name: Joi.string().required(),
                seating_capacity: Joi.number().required(),
                color: Joi.string().required(),
                tier_array_no: Joi.optional()
            })
        ).optional()
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

const saveLayoutTier = async (tier, layoutId) => {
    let tierData = {
        _layout_id: layoutId,
        name: tier.name,
        color: tier.color,
        seating_capacity: tier.seating_capacity,
        tier_array_no: tier.tier_array_no
    };

    return MDBObject.dataInsert("seat_tier_master", tierData);
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        let seatingPlan = {
            _event_id: apiData.event_id,
            _user_id: user.id,
            front_layout_file: apiData.front_layout_file,
            back_layout_file: apiData.back_layout_file,
            layout_thumbnail_url: apiData.layout_thumbnail_url,
            venue_map_name: apiData.venue_map_name
        }

        if (apiData.total_seating_capacity) {
            seatingPlan.total_seating_capacity = apiData.total_seating_capacity;
        }

        if (apiData.tiers_assigned_seats) {
            seatingPlan.tiers_assigned_seats = apiData.tiers_assigned_seats;
        }

        if ('is_draft' in apiData) {
            seatingPlan.is_draft = apiData.is_draft
        }

        return await MDBObject.getData('seat_layout_master', 'count(*) as totalCount', { _event_id: apiData.event_id }).then(async (layoutDetails) => {
            if (layoutDetails[0].totalCount) {
                response = { success: false, message: errorMessages.LAYOUT_ALREADY_CREATED_FOR_THIS_EVENT }
                return awsRequestHelper.respondWithJsonBody(200, response);
            }

            return MDBObject.dataInsert("seat_layout_master", seatingPlan).then(async (data) => {
                if (apiData.tiers && apiData.tiers.length > 0) {
                    var layoutId = data.insertId;
                    await Promise.all(apiData.tiers.map(async (tier) => {
                        return await saveLayoutTier(tier, layoutId);
                    }))

                    response = { success: true, message: successMessages.SEATING_PLAN_SAVED, layout_id: data.insertId }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                } else {
                    response = { success: true, message: successMessages.SEATING_PLAN_SAVED, layout_id: data.insertId }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }
            }).catch((error) => {
                console.error("error : ", error);
                response = { success: false, message: errorMessages.SOMETHING_WRONG_WHILE_SAVING_SEATING_DATA, error }
                return awsRequestHelper.respondWithJsonBody(error.status_code, response);
            });
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
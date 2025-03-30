const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require("joi");
const MDB = require("./../common/mysqlmanager");
const utils = require("../common/utils");
const MDBObject = new MDB();
const FILE_PATH = __filename;
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        front_layout_file: Joi.string().optional(),
        back_layout_file: Joi.string().optional(),
        layout_thumbnail_url: Joi.string().optional(),
        venue_map_name: Joi.string().optional(),
        total_seating_capacity: Joi.number().optional(),
        tiers_assigned_seats: Joi.number().optional(),
        is_draft: Joi.optional(),
        tiers: Joi.array().items(
            Joi.object({
                tier_id: Joi.number().optional(),
                name: Joi.string().optional(),
                seating_capacity: Joi.number().optional(),
                color: Joi.string().optional(),
                tier_array_no: Joi.optional(),
            })
        ).optional(),
        deleted_tier: Joi.array().optional(),
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
        let seatingPlanId = event.pathParameters.seating_plan_id;
        let user = await utils.verifyUser(event.headers.Authorization, FILE_PATH);
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        let usersSeatPlanExistsQuery = `SELECT count(*) as totalCount FROM seat_layout_master WHERE layout_id = ${seatingPlanId} AND  _user_id = ${user.id} AND is_deleted = 0`;
        let seatPlan = await MDBObject.runQuery(usersSeatPlanExistsQuery);
        if (!seatPlan[0].totalCount) {
            response.message = "You can not edit this seat plan, seat plan is not belong to you!";
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        if (apiData.deleted_tier && "deleted_tier" in apiData) {
            //need to check if any user booked with this tier or not (later)
            let seatPlanDeletedTiers = apiData.deleted_tier;
            delete apiData.deleted_tier;
            if (seatPlanDeletedTiers.length > 0) {
                await Promise.all(
                    seatPlanDeletedTiers.map(async (tierId) => {
                        return await MDBObject.dataUpdate("seat_tier_master", { is_deleted: 1 }, { _layout_id: seatingPlanId, tier_id: tierId });
                    })
                ).catch((error) => {
                    response = {
                        success: false,
                        message: errorMessages.SOMETHING_WRONG_WHILE_UPDATING_SEATING_PLAN,
                        error,
                    };
                    return awsRequestHelper.respondWithJsonBody(200, response);
                });
            }
        }

        let seatPlanTiers = [];
        if (apiData.tiers && apiData.tiers.length > 0) {
            seatPlanTiers = apiData.tiers;
            delete apiData.tiers;
        }

        let whereQry = { layout_id: seatingPlanId };
        return await MDBObject.dataUpdate("seat_layout_master", apiData, whereQry).then(async (data) => {
            if (seatPlanTiers.length > 0) {
                await Promise.all(
                    seatPlanTiers.map(async (tier) => {
                        if (tier.tier_id && "tier_id" in tier && tier.tier_id !== "") {
                            let tierId = tier.tier_id;
                            delete tier.tier_id;
                            return await MDBObject.dataUpdate("seat_tier_master", tier, { _layout_id: seatingPlanId, tier_id: tierId });
                        } else {
                            tier._layout_id = seatingPlanId;
                            return await MDBObject.dataInsert("seat_tier_master", tier);
                        }
                    })
                );
            }

            response = {
                success: true,
                message: successMessages.SEATING_PLAN_UPDATED,
            };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch((error) => {
            response = {
                success: false,
                message: errorMessages.SOMETHING_WRONG_WHILE_UPDATING_SEATING_PLAN,
                error,
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
const awsRequestHelper = require("../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("../../lambda-v2/common/mysqlmanager");
const MDBObject = new MDB();

const validate = function (body) {
    const schema = Joi.object().keys({
        prefix: Joi.optional(),
        first_name: Joi.optional(),
        last_name: Joi.optional(),
        suffix: Joi.optional(),
        email_address: Joi.optional(),
        home_phone: Joi.optional(),
        cell_phone: Joi.optional(),
        tax_and_business_info: Joi.optional(),
        home_address: Joi.optional(),
        shipping_address: Joi.optional(),
        job_title: Joi.optional(),
        company_organization: Joi.optional(),
        work_address: Joi.optional(),
        work_phone: Joi.optional(),
        website: Joi.optional(),
        blog: Joi.optional(),
        gender: Joi.optional(),
        birth_date: Joi.optional(),
        age: Joi.optional()
    });

    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
            allowUnknown: true
        }, function (err, value) {
            if (err) {
                reject({ status_code: 400, message: err.details[0].message });
            }
            else {
                resolve(value);
            }
        });
    });
}

const getFormatedInfo = function (body) {
    return new Promise((resolve, reject) => {
        let formInfo = ""
        for(const keys in body){
            if(body[`${keys}`] && body[`${keys}`].length > 0){
                formInfo =  formInfo + `${keys}` + ':' + body[`${keys}`] + ";"
            }
         }
         resolve(formInfo)
    }).catch(error => {
        reject(error)
    });;
}

module.exports.handler = async function (data, event_id, ticket_id) {
    var response = { success: false, message: "Server error! Please try again later" };

    try {
        // let formDetails = data
        let details_id = data.pathParameters ? (data.pathParameters.details_id ? data.pathParameters.details_id : "") : ""
        let formDetails = details_id ? JSON.parse(data.body) : data
        ticket_id = !details_id ? ticket_id : ""
        event_id = !details_id ? event_id : "" 

        customQuestionsDetails = formDetails.custom ? formDetails.custom : ''
      
        await validate(formDetails);

        formDetails.home_address = formDetails.home_address ? await getFormatedInfo(formDetails.home_address) : "";
        formDetails.shipping_address = formDetails.shipping_address ? await getFormatedInfo(formDetails.shipping_address) : "";
        formDetails.work_address = formDetails.work_address ? await getFormatedInfo(formDetails.work_address) : "";
        formDetails.custom_question = formDetails.custom ? await getFormatedInfo(formDetails.custom) : "";
        delete formDetails.custom

        if(details_id){
            await MDBObject.dataUpdate("tickets_attendee_details", formDetails, {details_id : details_id});
            response = { success: true, message: 'form updated successfully'}
            return awsRequestHelper.respondWithJsonBody(200, response);
        } else{
            formDetails._purchased_ticket_id = ticket_id
            formDetails._event_id = event_id
            let detailInfo = await MDBObject.dataInsert("tickets_attendee_details", formDetails);
            return detailInfo;
        }  
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
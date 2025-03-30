const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("./../common/mysqlmanager");
const utils = require('./../common/utils');
const MDBObject = new MDB();

const getFormatedInfo =  function (data) {
    return new Promise((resolve, reject) => {
        let formArray = data.split(";")
        let addressDetails = {}
         Promise.all(formArray.map(async details => {
             if(details){
                let value = details.split(":");
                addressDetails[`${value[0]}`] = value[1];
             }
         }))
        console.log("addressDetails", addressDetails)
         resolve(addressDetails)
    }).catch(err => {
        return (err)
    });;
}


module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: "Server error! Please try again later" };

    try {
        await utils.verifyUser(event.headers.Authorization);
        let eventId = event.pathParameters.event_id;
        let tickets_attendee_details = await MDBObject.getData('tickets_attendee_details', '*', { _event_id: eventId});
        tickets_attendee_details = tickets_attendee_details
        await Promise.all(tickets_attendee_details.map(async details => {
            details.home_address = details.home_address ? await getFormatedInfo(details.home_address) : "";
            details.shipping_address = details.shipping_address ? await getFormatedInfo(details.shipping_address) : "";
            details.work_address = details.work_address ? await getFormatedInfo(details.work_address) : "";
            details.custom_question = details.custom_question ? await getFormatedInfo(details.custom_question) : "";
        }))
        

        response = { success: true, message: "Checkout form data get succesfully", data: tickets_attendee_details };
        return awsRequestHelper.respondWithJsonBody(200, response);

    } catch (err) {
        console.log("catchError", err);
        response.message = err.message;
        if (err && err.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
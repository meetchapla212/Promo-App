"use strict";
const QB = require('quickblox');
const Joi = require('joi');
const AWS = require('aws-sdk');
const awsRequestHelper = require('./common/awsRequestHelper');
const { errorMessages } = require('../lambda-v2/common/constants');
const className = 'Events';
const CREDENTIALS = {
    appId: process.env.QB_APP_ID,
    authKey: process.env.QB_AUTH_KEY,
    authSecret: process.env.QB_AUTH_SECRET
};
const QB_EVENTS_LIMIT = 10;
const ITEM_PER_PAGE = 10;
let SORT_DIRECTION = "sort_asc";
const SORT_BY_VALUES = {
    "category":"category",
    "start":"start_date_time_ms"
}
QB.init(CREDENTIALS.appId, CREDENTIALS.authKey, CREDENTIALS.authSecret);

const schema = Joi.object().keys({
    lat: Joi.number().required(),
    long: Joi.number().required(),
    radius: Joi.number().required(),
    start: Joi.number().required(),
    end: Joi.number().required(),
    categories:Joi.string(),
    sort:Joi.string(),
    sort_direction: Joi.string(),
    page:Joi.number(),
    src:Joi.string()
});

const validateBody = function (body) {
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
        }, function (error, value) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            } else {
                resolve(value);
            }
        });
    });
}

const session = function (params) {
    return new Promise((resolve, reject) => {
        QB.createSession(params, function (error, result) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            }

            if (result) {
                resolve(result);
            }
        });
    });
};

const getDataFromQB = function(filter){
    return new Promise((resolve, reject) => {
        QB.data.list(className, filter, function(error, result){
            if (error) {
                console.error("error : ", error);
                reject(error);
            } else {
                resolve(result.items);
            }
        });
    });
}

module.exports.handler =  async (event, context, callback) => {
    console.log('Inside getEventsFromQB', event);
    try{
        console.log('Got event',event);
        if(event.queryStringParameters && Object.keys(event.queryStringParameters).length > 0){
            let finalResponse = {};
            let filter = {};
            let parameters = event.queryStringParameters;
            const params = { login: process.env.QB_LOGIN, password: process.env.QB_PASSWORD };
            await validateBody(parameters);
            let sessionResponse = await session(params);
            console.log("Session Created",sessionResponse);
            //to get only promoapp events, phq should be false
            if(('src' in parameters) && (parameters.src) && (parameters.src == "promo")){
                filter.isPHQ = {ne:true};
            }

//            adding event location coordinates and radius in QB filter
            filter.eventLocation = {near: parameters.long + "," + parameters.lat + ";"+parameters.radius}
//            adding start date and end date in QB filter
            filter.end_date_time_ms = {gte: parameters.start, lte: parameters.end};
//            adding category in QB filter
            if('categories' in parameters && parameters.categories){
                filter.category = {in: parameters.categories}
            }
//            adding limit in QB Filter
            filter.limit = QB_EVENTS_LIMIT;
            if('sort_direction' in parameters && parameters.sort_direction){
                SORT_DIRECTION = "sort_desc";
            }
            if('sort' in parameters && parameters.sort){
                filter[SORT_DIRECTION] = SORT_BY_VALUES[parameters.sort];
            }
//            adding skip filter for pagination handling in QB filter
            if('page' in parameters && parameters.page){
                filter.skip = parameters.page * ITEM_PER_PAGE;
            }

            console.log("Filter for QB",filter);
            let QBResponse = await getDataFromQB(filter);
            if(QBResponse && QBResponse.length > 0){
                console.log("Total QB Response Length",QBResponse.length);
                finalResponse.results = QBResponse;
                delete filter.limit;
                filter.count = 1;
                let QBResponseCount = await getDataFromQB(filter);
                finalResponse.count = QBResponseCount.count;
            }else{
                finalResponse.results = [];
            }
            awsRequestHelper.callbackRespondWithJsonBody(callback, 200, finalResponse);
        }else{
            awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, errorMessages.REQUIRED_QUERY_PARAMETERSs);
        }
    }catch(error){
        console.error("error : ", error);
        awsRequestHelper.callbackRespondWithSimpleMessage(callback, 500, error.message);
    }
}
"use strict";
const aws = require('aws-sdk');
const Joi = require('joi');
aws.config.setPromisesDependency(require('bluebird'));
const awsRequestHelper = require('./common/awsRequestHelper');
const dynamodb = new aws.DynamoDB.DocumentClient({
    region: process.env.REGION
});

const rp = require('request-promise');
const { successMessages } = require('../lambda-v2/common/constants');

const getCityCoOrdinates = (body) => {
    // Using google API
    let options = {
        method: 'GET',
        uri: `https://maps.googleapis.com/maps/api/geocode/json?latlng=${body.lat},${body.long}&sensor=true&key=AIzaSyBd8e7QtxhKPN-8eAKECUi19RvOUYSWIDg`
    };
    return rp(options).then((response) => {
        console.log(response);
        if (response) {
            response = JSON.parse(response);
            let results = response.results.filter(r => r.types.includes('locality'));
            console.log('results', results);
            if (results && results.length > 0) {
                return Promise.resolve({
                    'lat': results[0].geometry.location.lat,
                    'long': results[0].geometry.location.lng,
                    'city': results[0].formatted_address
                });
            }
        } else {
            return Promise.resolve(null);
        }
    }).catch((error) => {
        console.error("error : ", error);
        return Promise.resolve(null);
    });
};

const validate = function (body) {
    const schema = Joi.object().keys({
        lat: Joi.number().required(),
        long: Joi.number().required(),
        address: Joi.string().required(),
    });

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
};

const addNewLocationAccess = (body) => {
    return getCityCoOrdinates(body).then((coResponse) => {
        let row = {
            location: body.lat + ',' + body.long,
            lat: body.lat,
            long: body.long,
            city: body.address,
            count: 1
        };

        if (coResponse) {
            row['city_lat'] = coResponse.lat;
            row['city_long'] = coResponse.long;
            row['cityName'] = coResponse.city;
        }
        let addParams = {
            TableName: process.env.LOCATION_TABLE,
            Item: row
        };
        return dynamodb.put(addParams).promise();
    })
};


module.exports.handler = function (event, context, callback) {
    console.log('Inside handler', JSON.stringify(event));
    let body = JSON.parse(event.body);
    validate(body).then(result => {
        // Check if row is present
        console.log('validate result', result);
        let getParams = {
            TableName: process.env.LOCATION_TABLE,
            Key: {
                "location": body.lat + ',' + body.long
            }
        };
        console.log('params:', getParams);

        return dynamodb.get(getParams).promise();
    }).then((response) => {
        if ('Item' in response && response.Item) {
            let params = {
                TableName: process.env.LOCATION_TABLE,
                Key: {
                    "location": body.lat + ',' + body.long
                },
                UpdateExpression: 'Add #a :b',
                ExpressionAttributeNames: {
                    "#a": 'count'
                },
                ExpressionAttributeValues: {
                    ":b": 1
                }
            }
            return dynamodb.update(params).promise();
        } else {
            return addNewLocationAccess(body);
        }
    }).then(() => {
        let getParams = {
            TableName: process.env.LOCATION_TABLE_TILL_DATE,
            Key: {
                "location": body.lat + ',' + body.long
            }
        };
        console.log('params:', getParams);

        return dynamodb.get(getParams).promise();
    }).then((response) => {
        if ('Item' in response && response.Item) {
            let paramsForTillDate = {
                TableName: process.env.LOCATION_TABLE_TILL_DATE,
                Key: {
                    "location": body.lat + ',' + body.long
                },
                UpdateExpression: 'Add #a :b',
                ExpressionAttributeNames: {
                    "#a": 'count'
                },
                ExpressionAttributeValues: {
                    ":b": 1
                }
            };
            return dynamodb.update(paramsForTillDate).promise();
        } else {
            let row = {
                location: body.lat + ',' + body.long,
                lat: body.lat,
                long: body.long,
                city: body.address,
                count: 1
            };
            let addParams = {
                TableName: process.env.LOCATION_TABLE_TILL_DATE,
                Item: row
            };
            return dynamodb.put(addParams).promise();
        }
    }).then(res => {
        awsRequestHelper.callbackRespondWithJsonBody(callback, 200, { "message": successMessages.LOCATION_ADDED });
    }).catch(error => {
        console.error("error : ", error);
        awsRequestHelper.callbackRespondWithSimpleMessage(callback, 500, error.message);
    });
}
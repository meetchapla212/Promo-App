"use strict";
const MARSHALER = require("dynamodb-marshaler");
const aws = require('aws-sdk');
aws.config.setPromisesDependency(require('bluebird'));
const dynamodb = new aws.DynamoDB.DocumentClient({
    region: process.env.REGION
});

const handleLocationAccess = (body) => {
    console.log('Inside handleLocationAccess', body);
    if (body.city_lat && body.city_long) {
        let getParams = {
            TableName: process.env.CITY_TABLE,
            Key: {
                "location": body.city_lat + ',' + body.city_long
            }
        };
        console.log('params:', getParams);

        return dynamodb.get(getParams).promise()
            .then((response) => {
                if ('Item' in response && response.Item) {
                    let paramsForTillDate = {
                        TableName: process.env.CITY_TABLE,
                        Key: {
                            "location": body.city_lat + ',' + body.city_long
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
                        location: body.city_lat + ',' + body.city_long,
                        lat: body.city_lat,
                        long: body.city_long,
                        city: body.cityName,
                        count: 1
                    };
                    let addParams = {
                        TableName: process.env.CITY_TABLE,
                        Item: row
                    };
                    return dynamodb.put(addParams).promise();
                }
            })
    } else {
        return Promise.resolve("Unable to update table");
    }

};

module.exports.handler = (event, context, callback) => {
    console.log('Event:', JSON.stringify(event));
    // Get dynamo event details
    if (event && event.Records && event.Records.length > 0) {
        let promises = [];
        event.Records.forEach(record => {
            // For each record check the type of operation
            if ('eventName' in record) {
                let tableName = null;
                // Get the Id
                let hashKey = Object.keys(record.dynamodb.Keys);
                let valueKeys = Object.keys(record.dynamodb.Keys[hashKey[0]]);
                let id = record.dynamodb.Keys[hashKey[0]][valueKeys[0]];
                console.log('id:' + id);
                let newRow = null;
                switch (record.eventName) {
                    case 'INSERT':
                        console.log("Inside insert");
                        newRow = JSON.parse(MARSHALER.unmarshalJson(record.dynamodb.NewImage));
                        promises.push(handleLocationAccess(newRow));
                        break;

                    case 'MODIFY':
                        console.log("Inside modify");
                        newRow = JSON.parse(MARSHALER.unmarshalJson(record.dynamodb.NewImage));
                        promises.push(handleLocationAccess(newRow));
                        break;
                }
            }
        });
        Promise.all(promises).then(() => {
            context.succeed();
        }).catch((error) => {
            console.error("error : ", error);
            context.succeed();
        });
    } else {
        context.succeed();
    }
}
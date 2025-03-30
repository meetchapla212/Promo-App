'use strict';

const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(require('bluebird'));
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.REGION
});
const lambda = new AWS.Lambda({
    region: process.env.REGION
});

// function to invoke lambda to get events from PHQ 
const invokeLambda = (event) => {
    let params = {
        FunctionName: process.env.LAMBDA_GET_EVENTS_FROM_PHQ,
        InvocationType: 'Event',
        LogType: 'Tail',
        Payload: JSON.stringify(event)
    };
    return lambda.invoke(params).promise();
};

// function to invoke lambda to get events from GPL
const invokeGPLEventsLambda = (event) => {
    console.log("Get events from GPL",event);
    let params = {
        FunctionName: process.env.LAMBDA_GET_EVENTS_FROM_GPL,
        InvocationType: 'Event',
        LogType: 'Tail',
        Payload: JSON.stringify(event)
    };
    return lambda.invoke(params).promise();
};


// This function is called every monday to get events for major cities
module.exports.handler = (event, context, callback) => {
    console.log('Got events:', JSON.stringify(event));

    // Get rows from dynamo
    let params = {
        TableName: 'majorcities'
    }

    dynamodb.scan(params).promise()
        .then((response) => {
            if (response && response.Count > 0) {
                let promises = [];
                response.Items.forEach((city) => {
                    promises.push(invokeLambda(city));
                    // promises.push(invokeGPLEventsLambda(city));
                });
                return Promise.all(promises);

            } else {
                return Promise.resolve(true);
            }
        })
        .then(() => {
            callback(null, "done");
        })
};
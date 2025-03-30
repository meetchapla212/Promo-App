'use strict';

const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(require('bluebird'));
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.REGION
});
const lambda = new AWS.Lambda({
    region: process.env.REGION
});

const invokeLambda = (event) => {
    let params = {
        FunctionName: process.env.LAMBDA_GET_EVENTS_FROM_PHQ,
        InvocationType: 'Event',
        LogType: 'Tail',
        Payload: JSON.stringify(event)
    };
    return lambda.invoke(params).promise();
};

// This function is called to get Top cities
module.exports.handler = (event, context, callback) => {
    let params = {
        TableName: process.env.CITY_TABLE
    }
    dynamodb.scan(params).promise().then((response) => {
        if (response && response.Count > 0) {
            let promises = [];
            this.response = JSON.parse(JSON.stringify(response.Items));
            let topCityArray = response.Items.sort((a, b) => (b.count) - (a.count));
            topCityArray = topCityArray.splice(0, 50);
            topCityArray.forEach((city) => {
                promises.push(invokeLambda(city));
            });
            return Promise.all(promises);

        } else {
            return Promise.resolve(true);
        }
    }).then(() => {
        let inputForBatchDelete = this.response;
        let promiseArray = [];
        console.log('input for batch delete::', inputForBatchDelete);
        for (let i = 0; i < inputForBatchDelete.length; i = i + 25) {
            let end = (inputForBatchDelete.length > (i + 25)) ? i + 25 : (inputForBatchDelete.length % (i + 25));
            let batchDeleteSlice = inputForBatchDelete.slice(i, end);
            let deleteRequests = [];
            let requestItem = {};
            batchDeleteSlice.forEach(element => {
                let temp = {};
                temp['DeleteRequest'] = {
                    Key: { 'location': element.location }
                };
                deleteRequests.push(temp);
            });
            requestItem[process.env.CITY_TABLE] = deleteRequests;
            let delParams = {
                RequestItems: requestItem
            };

            promiseArray.push(dynamodb.batchWrite(delParams).promise());
        }
        return Promise.all(promiseArray);
    }).then(res => {
        console.log('response of deleting data:', res);
        callback(null, "done");
    }).catch(error => {
        console.error("error : ", error);
    })
};
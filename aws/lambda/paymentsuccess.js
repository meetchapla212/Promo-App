const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();

// function to invoke lambda to get events from PHQ 
const invokeLambda = (event) => {
    let params = {
        FunctionName: process.env.LAMBDA_APPROVE_TICKET,
        InvocationType: 'RequestResponse',
        LogType: 'Tail',
        Payload: JSON.stringify(event)
    };
    return lambda.invoke(params).promise();
};

const getQueryParams = (body) => {
    return body.split("&").reduce(function(prev, curr, i, arr) {
        var p = curr.split("=");
        prev[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
        return prev;
    }, {});
};

// This function is called every day to delete old events
module.exports.handler = async (event, context, callback) => {
    console.log('Inside handler',JSON.stringify(event));
    let queryParams = {};
    if(event && event.body){
        queryParams = getQueryParams(event.body);
        console.log('queryParams',queryParams);
        // Make call to approve tickets lambda so that tickets are approved
        let payload = {
        };
        if('invoice' in queryParams && queryParams.invoice){
            payload.pathParameters={
                id: queryParams.invoice
            }
        }
        if('txn_id' in queryParams && queryParams.txn_id){
            payload.body = JSON.stringify({
                txn_id:queryParams.txn_id
            });
            let responseFromLambda = await invokeLambda(payload);
            console.log('responseFromLambda',responseFromLambda);
        }
    }
    return {
        statusCode: 302,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers":"*",
            "Access-Control-Allow-Credentials": true,
            "Location":`${process.env.UI_BASE_URL}/eventdetails/${queryParams.custom}?order_success=1`
        }
    }
}
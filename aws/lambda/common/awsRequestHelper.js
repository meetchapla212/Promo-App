'use strict';

exports.callbackRespondWithCodeOnly = function (callback, code) {
    callback(null, {
        statusCode: code,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true
        }
    });
};

exports.callbackRespondWithSimpleMessage = function (callback, code, message) {
    callback(null, {
        statusCode: code,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true
        },
        body: JSON.stringify({
            message: message
        })
    });
};

exports.callbackRespondWithJsonBody = function (callback, code, body) {
    callback(null, {
        statusCode: code,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true
        },
        body: JSON.stringify(body)
    });
};


exports.respondWithCodeOnly = function ( code) {
    return {
        statusCode: code,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true
        }
    };
};

exports.respondWithSimpleMessage = function (code, message) {
    return {
        statusCode: code,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true
        },
        body: JSON.stringify({
            message: message
        })
    };
};

exports.respondWithJsonBody = function (code, body) {
    return {
        statusCode: code,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true
        },
        body: JSON.stringify(body)
    };
};


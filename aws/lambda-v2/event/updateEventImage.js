"use strict";
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.REGION
});
const BATCH_SIZE = 25;
let pexelImagesMapping = {};
const { errorMessages, successMessages } = require("../common/constants");

const getImageFromPexel = async function (category) {

    let categoryToSend = category;
    if (category && category == 'concerts') {
        categoryToSend = 'concert';
    } else if (category && category == 'festivals') {
        categoryToSend = 'festival';
    }
    let imageParams = {
        TableName: process.env.IMAGES_TABLE,
        KeyConditionExpression: "category = :ct",
        ExpressionAttributeValues: {
            ":ct": categoryToSend
        }
    };

    try {
        let imageRows = await dynamodb.query(imageParams).promise();
        if ("Items" in imageRows && imageRows.Items.length > 0) {
            let resultImagesURL = imageRows.Items;
            resultImagesURL.map((item) => {
                item.src = {
                    "landscape": item.image
                };
                return item;
            });
            pexelImagesMapping[category] = resultImagesURL;
            return resultImagesURL[Math.floor(Math.random() * resultImagesURL.length)].image;
        } else {
            let options = {
                method: 'GET',
                uri: `https://api.pexels.com/v1/search?query=${ categoryToSend }&per_page=80&page=1`,
                headers: {
                    'Authorization': process.env.PEXELS_AUTHORIZATION_KEY
                }
            };
            let res = await rp(options);

            // console.log(res);
            if (res) {
                res = JSON.parse(res);
                if (res && res.photos && res.photos.length > 0) {
                    let resultImagesURL = res.photos;
                    pexelImagesMapping[category] = resultImagesURL;

                    let timeToLive = Math.floor(moment.utc().add(1, 'hours').valueOf() / 1000);
                    let allImages = [];
                    resultImagesURL.forEach((element, index) => {
                        let imageURL = element.src.landscape;
                        if (imageURL) {
                            // This is done for the UI adjustment
                            imageURL = imageURL.replace("w=1200", "w=1700");
                            let obj = {
                                "category": categoryToSend,
                                "image": imageURL,
                                "id": element.id + "",
                                "delete_in": timeToLive
                            };
                            allImages.push(obj);
                        }
                    });
                    await addImagesToDb(allImages);

                    let randomIndexOfImages = Math.floor(Math.random() * resultImagesURL.length);
                    // console.log(randomIndexOfImages);
                    // console.log(resultImagesURL[randomIndexOfImages]);
                    let imageIndex = resultImagesURL[randomIndexOfImages];
                    await Promise.resolve(imageIndex);
                    return imageIndex.src.original;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }
    } catch (error) {
        console.error("error : ", error);
        return null;
    }
};
//function does the batch write
const addBatchToDynamoTable = async function (TableNameVar, ItemsArray) {
    // console.log("ItemsArray: "+JSON.stringify(ItemsArray));

    let params = {
        RequestItems: {}
    };
    params.RequestItems[TableNameVar] = [];

    ItemsArray.forEach((element, index) => {
        let data = {
            "PutRequest": {
                "Item": element
            }
        };
        params["RequestItems"][TableNameVar].push(data);
    });
    await dynamodb.batchWrite(params).promise();
    return true;
};

const addImagesToDb = async function (imageList) {
    let items = [];
    let dynamoPromises = [];
    imageList.forEach((element, index) => {
        items[index % BATCH_SIZE] = element;
        if ((((index + 1) % BATCH_SIZE) == 0) || (index == (imageList.length - 1))) {
            dynamoPromises.push(addBatchToDynamoTable(process.env.IMAGES_TABLE, items));
            items = [];
        }
    });
    let res = await Promise.all(dynamoPromises);
    return res;
};

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let eventId = event.pathParameters.event_id;
        let whereQry = { event_id: eventId }
        let existingRecords = await DBManager.getData('event_master', 'event_image, category', whereQry);
        if (existingRecords && existingRecords.length) {
            let eventDetails = existingRecords[0];
            if (eventDetails.event_image == '') {
                // category
                let eventImage = await getImageFromPexel(eventDetails.category);
                if (eventImage != '') {
                    await DBManager.dataUpdate('event_master', { 'event_image': eventImage }, whereQry)
                    response = { success: true, message: successMessages.EVENT_IMAGE_UPDATED, data: { event_image: eventImage } }
                } else {
                    response = { success: false, message: errorMessages.IMAGE_NOT_UPDATED }
                }
            } else {
                response = { success: true, message: successMessages.EVENT_ALREADY_HAVE_IMAGE, data: { event_image: eventDetails.event_image } }
            }
        } else {
            response = { success: true, message: "No matching Event found." }
        }
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
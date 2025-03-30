"use strict";
const QB = require('quickblox');
const AWS = require('aws-sdk');
const awsRequestHelper = require('./common/awsRequestHelper');
const moment = require('moment');
const rp = require('request-promise');

const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.REGION
});
const BATCH_SIZE = 25;

const CREDENTIALS = {
    appId: process.env.QB_APP_ID,
    authKey: process.env.QB_AUTH_KEY,
    authSecret: process.env.QB_AUTH_SECRET
};

QB.init(CREDENTIALS.appId, CREDENTIALS.authKey, CREDENTIALS.authSecret);

let pexelImagesMapping = {};

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

const className = 'Events';

const removeDuplicateEvents = function (events) {
    let eventIds = events.map(e => e.id);
    let eventIdsset = new Set(eventIds);
    console.log('set length:', eventIdsset.size, eventIds.length);
    // If set length is not same as orginal array that means we have some duplicate events

    if (eventIdsset.size != eventIds.length) {
        let finalEvents = [];
        let pushedEvents = [];
        // Remove duplicates
        for (let event of events) {
            if (!(event.id in pushedEvents)) {
                pushedEvents.push(event.id);
                finalEvents.push(event);
            }
        }
        return finalEvents;
    }
    return events;
}

const seeIfEventExists = function (events) {
    let eventIds = events.map(e => e.id);
    let eventIdsset = new Set(eventIds);
    console.log('set length:', eventIdsset.size, eventIds.length);

    // construct in operations
    return new Promise((resolve, reject) => {
        let filter = {
            'PHQEventID': { in: Array.from(eventIdsset).join(',') }
        };
        console.log('Sending filter', filter);
        QB.data.list(className, filter, function (error, result) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            } else {
                //console.log('list Table result::', result);
                resolve(result.items);
            }
        });
    })
};

//function does the batch write
const addBatchToDynamoTable = async function (TableNameVar, ItemsArray) {
    console.log("ItemsArray: " + JSON.stringify(ItemsArray));

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

//function prepares the arrays for batch write
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

//checks db for images OR else fetches from pexel and adds to db
const getImageFromPexel = async function (category) {
    console.log('Inside getImageFromPexel:', category);

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
            return null;
        }
        else {
            let options = {
                method: 'GET',
                uri: `https://api.pexels.com/v1/search?query=${categoryToSend}&per_page=80&page=1`,
                headers: {
                    'Authorization': process.env.PEXELS_AUTHORIZATION_KEY
                }
            };
            let res = await rp(options);

            console.log(res);
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
                    console.log(randomIndexOfImages);
                    console.log(resultImagesURL[randomIndexOfImages]);
                    let imageIndex = resultImagesURL[randomIndexOfImages];
                    return await Promise.resolve(imageIndex);
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

const createData = async function (events, user_id, token) {

    let formData = {};

    let imagePromises = [];
    let unqiueCategories = [];

    events.forEach((element, index) => {
        if (!element.category) {
            element.category = 'concerts';
        }
        if (!unqiueCategories.includes(element.category)) {
            unqiueCategories.push(element.category);
        }
        if (element.description && element.description.length > 0) {
            element.email = element.description.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}/gi);
            element.phoneNumber = element.description.match(/[\+]?\d{10}|\(\d{3}\)\s?-\d{8}/);
            element.websiteUrl = element.description.match(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig);
        }
    });

    unqiueCategories.forEach((category) => {
        imagePromises.push(getImageFromPexel(category));
    });

    await Promise.all(imagePromises);
    events.forEach((element, index) => {
        let i = index + 1;
        let venues = '';
        if ('entities' in element && element.entities && 'venues' in element.entities && element.entities.venues && element.entities.venues.length > 0) {
            venues = element.entities.venues[0].name;
        }
        formData['record[' + i + '][' + 'UserID' + ']'] = user_id;
        formData['record[' + i + '][' + 'PHQEventID' + ']'] = element.id;
        formData['record[' + i + '][' + 'event_name' + ']'] = element.title;
        formData['record[' + i + '][' + 'description' + ']'] = element.description;
        formData['record[' + i + '][' + 'latitude' + ']'] = element.location[1];
        formData['record[' + i + '][' + 'longitude' + ']'] = element.location[0];
        formData['record[' + i + '][' + 'category' + ']'] = element.category;
        formData['record[' + i + '][' + 'start_date_time' + ']'] = convertDateInISO(element.start);
        formData['record[' + i + '][' + 'end_date_time' + ']'] = convertDateInISO(element.end);
        formData['record[' + i + '][' + 'start_date_time_ms' + ']'] = convertDate(element.start);
        formData['record[' + i + '][' + 'end_date_time_ms' + ']'] = convertDate(element.end);
        // Location has to be saved as [long,lat]
        formData['record[' + i + '][' + 'eventLocation' + ']'] = element.location[0] + ',' + element.location[1];
        formData['record[' + i + '][' + 'address' + ']'] = venues;
        formData['record[' + i + '][' + 'event_type' + ']'] = "public";
        formData['record[' + i + '][' + 'share_counter' + ']'] = 0;
        formData['record[' + i + '][' + 'isPHQ' + ']'] = true;
        formData['record[' + i + '][' + 'notify_subscribe' + ']'] = true;
        if (element.email) {
            formData['record[' + i + '][' + 'email' + ']'] = element.email[0];
        }
        if (element.phoneNumber) {
            formData['record[' + i + '][' + 'phone' + ']'] = element.phoneNumber[0];
        }
        if (element.websiteUrl) {
            formData['record[' + i + '][' + 'websiteurl' + ']'] = element.websiteUrl[0];
        }
        if (element.image) {
            formData['record[' + i + '][' + 'image_url' + ']'] = element.image;
        } else if (pexelImagesMapping && pexelImagesMapping[element.category] && pexelImagesMapping[element.category].length > 0) {
            let resultImagesURL = pexelImagesMapping[element.category];
            let randomIndexOfImages = Math.floor(Math.random() * resultImagesURL.length);
            let imageIndex = resultImagesURL[randomIndexOfImages];
            let imageURL = imageIndex.src.landscape;
            if (imageURL && !imageIndex.delete_in) {
                // This is done for the UI adjustment
                imageURL = imageURL.replace("w=1200", "w=1700");
            }
            formData['record[' + i + '][' + 'image_url' + ']'] = imageURL;
        }

        formData['record[' + i + '][permissions][update][access]'] = "open";
    });

    console.log(formData);
    let options = {
        method: 'POST',
        uri: 'https://api.quickblox.com/data/' + className + '/multi.json',
        form: formData,
        headers: {
            'QB-Token': token
        }                //json: true // Automatically stringifies the body to JSON
    };

    return await rp(options);

}

const convertDateInISO = function (date) {
    return moment.utc(date).toISOString();
}

// This is the method which will convert PHQ date format to QB date format
const convertDate = function (date) {

    let convertPhqDate = moment.utc(date);
    let dateMilliseconds = (convertPhqDate).valueOf();
    return dateMilliseconds;
}

module.exports.handler = async function (event, context, callback) {
    console.log('Got event', JSON.stringify(event));
    let api_data = JSON.parse(event.body);

    const params = { login: process.env.QB_LOGIN, password: process.env.QB_PASSWORD };
    let user_id = null;
    let session_token = null;
    let finalEvents = [];
    try {
        let result = null;
        if ('session' in event && event.session) {
            result = event.session;
        } else {
            result = await session(params);
        }
        console.log('from get session:', result);
        user_id = result.user_id;
        session_token = result.token;
        api_data = removeDuplicateEvents(api_data);
        let response = await seeIfEventExists(api_data);
        console.log('Got existing events', response);
        finalEvents = [];
        if (response && response.length > 0) {
            console.log('Got existing events count:', response.length);
            finalEvents = response;
            // This means there are some existing PHQ Events. Let's filter them
            let qbExistingEventIds = response.map(r => r.PHQEventID);
            console.log('qbExistingEventIds', qbExistingEventIds);
            api_data = api_data.filter(d => !qbExistingEventIds.includes(d.id));
        }

        // Filter duplicate events
        let create_api_data = [];
        let idsToAddeds = [];
        api_data.forEach((e) => {
            if (!idsToAddeds.includes(e.id)) {
                create_api_data.push(e);
                idsToAddeds.push(e.id);
            }
        });

        //let result;
        // see if there is any data left for adding
        if (create_api_data && create_api_data.length > 0) {
            console.log('Adding event to QB:', create_api_data.length);
            result = await createData(create_api_data, user_id, session_token);
        } else {
            result = await Promise.resolve(JSON.stringify([]));
        }

        if (result) {
            result = JSON.parse(result);
            if (result.items && result.items.length > 0) {
                console.log('Adding results from add:', result.items.length);
                result.items.forEach(r => finalEvents.push(r));
            }
        }
        console.log('Returning final events count:', finalEvents.length);
        return awsRequestHelper.respondWithJsonBody(200, finalEvents);
    } catch (error) {
        console.error("error : ", error);
        return awsRequestHelper.respondWithSimpleMessage(500, error.message);
    }
};

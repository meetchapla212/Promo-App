"use strict";
const AWS = require('aws-sdk');
const moment = require('moment');
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const rp = require('request-promise');
const mysql = require("mysql2");
const dateFormat = "YYYY-MM-DD HH:mm:ss";
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.REGION
});
const BATCH_SIZE = 25;
let pexelImagesMapping = {};

var connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 1000,
    queueLimit: 0
});

const runQuery = async (sqlQry) => {
    return new Promise((resolve, reject) => {
        connection.query(sqlQry, function (error, results, fields) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    })
}
const bulkInsert = async (tableName, bulkArray) => {
    let values = [];
    let fields = "";
    await Promise.all(
        bulkArray.map(value => {
            value.date_created = moment().format(dateFormat);
            fields = Object.keys(value).map(key => `${key}`).join(",");
            values.push(
                Object.values(value).map(objvalue => {
                    return typeof objvalue === "string" ? `"${MDBObject.mysql_real_escape_string(objvalue)}"` : `${objvalue}`;
                }).join(",")
            );
        })
    );
    values = '(' + values.join('),(') + ')';
    let sqlQry = "INSERT INTO " + tableName + " (" + fields + ") values " + values;
    return new Promise((resolve, reject) => {
        runQuery(sqlQry).then(data => {
            resolve(data);
        }).catch(error => {
            console.error("error : ", error);
            reject(error);
        });
    });

}

const removeDuplicateEvents = function (events) {
    let eventIds = events.map(e => e.id);
    let eventIdsset = new Set(eventIds);
    
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

const seeIfEventExists = async function (events) {
    // construct in operations
    return new Promise(async (resolve, reject) => {
        let arrayPHQId = events.map(item => `'${item.id}'`).join(',');
        let ExistQuery = "SELECT * FROM event_master WHERE PHQEventID IN (" + arrayPHQId + ")";
        await runQuery(ExistQuery).then(result => {
            resolve(result)
        }).catch(error => {
            console.error("error : ", error);
            reject(error)
        })
    })
};

//function does the batch write
const addBatchToDynamoTable = async function (TableNameVar, ItemsArray) {
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
        } else {
            let options = {
                method: 'GET',
                uri: `https://api.pexels.com/v1/search?query=${categoryToSend}&per_page=80&page=1`,
                headers: {
                    'Authorization': process.env.PEXELS_AUTHORIZATION_KEY
                }
            };
            let res = await rp(options);
            if (res) {
                res = JSON.parse(res);
                if (res && res.photos && res.photos.length > 0) {
                    let resultImagesURL = res.photos;
                    pexelImagesMapping[category] = resultImagesURL;

                    let timeToLive = Math.floor(moment.utc().add(10, 'days').valueOf() / 1000);
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
    Promise.all(events.map(async (element) => {
        let venues = '';
        if ('entities' in element && element.entities && 'venues' in element.entities && element.entities.venues && element.entities.venues.length > 0) {
            venues = element.entities.venues[0].name;
        }

        var eventDBObject = {
            event_name: element.title,
            description: element.description != null ? element.description.replace(/'/g, '') : '',
            category: element.category.replace(" ", "-"),
            address: venues,
            start_date_time: element.start,
            end_date_time: element.end,
            start_date_utc: element.startDateUTC ? element.startDateUTC : element.start,
            end_date_utc: element.endDateUTC ? element.endDateUTC : element.end,
            start_date_time_ms: moment(element.start).valueOf(),
            end_date_time_ms: moment(element.end).valueOf(),
            timezone: element.timezone !== undefined ? element.timezone : '',
            country: element.country !== undefined ? element.country : '',
            city: element.city ? element.city : '',
            state: element.state ? element.state : '',
            event_location: JSON.stringify([element.location[1], element.location[0]]),
            latitude: element.location[1],
            longitude: element.location[0],
            isPHQ: 1,
            PHQEventID: element.id,
            event_type: 'public',
            email: element.email ? element.email[0] : '',
            phone: element.phoneNumber ? element.phoneNumber[0] : '',
            websiteurl: element.websiteUrl ? element.websiteUrl[0] : ''
        };

        // Location has to be saved as [long,lat]
        if (element.email) {
            eventDBObject.email = element.email[0];
        }
        if (element.phoneNumber) {
            eventDBObject.phone = element.phoneNumber[0];
        }
        if (element.websiteUrl) {
            eventDBObject.websiteurl = element.websiteUrl[0];
        }
        if (element.image) {
            eventDBObject.event_image = element.image;
        } else if (pexelImagesMapping && pexelImagesMapping[element.category] && pexelImagesMapping[element.category].length > 0) {
            let resultImagesURL = pexelImagesMapping[element.category];
            let randomIndexOfImages = Math.floor(Math.random() * resultImagesURL.length);
            let imageIndex = resultImagesURL[randomIndexOfImages];
            let imageURL = imageIndex.src.landscape;
            if (imageURL) {
                // This is done for the UI adjustment
                imageURL = imageURL.replace("w=1200", "w=1700");
            }
            eventDBObject.event_image = imageURL;
        }
        return eventDBObject;
    })).then(async eventScrapData => {
        return await bulkInsert('event_master', eventScrapData).then(dataResponse => {
            return dataResponse;
        });
    });
}

module.exports.handler = async function (event, context, callback) {
    let api_data = JSON.parse(event.body);
    let user_id = null;
    let session_token = null;
    let finalEvents = [];
    try {
        let result = null;
        if ('session' in event && event.session) {
            result = event.session;
        }
        api_data = await removeDuplicateEvents(api_data);
        let response = await seeIfEventExists(api_data);
        finalEvents = [];
        if (response && response.length > 0) {
            finalEvents = response;
            // This means there are some existing PHQ Events. Let's filter them
            let qbExistingEventIds = response.map(r => r.PHQEventID);
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
    } catch (error) {
        console.error("error : ", error);
    }
};
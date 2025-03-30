const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require("joi");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const moment = require("moment");
const momentTz = require("moment-timezone");
const rp = require("request-promise");
var mysql = require("mysql2");
var request = require("request");
const ES_DATE_FORMAT = "YYYY-MM-DD HH:mm:ss";
const utils = require("../common/utils");
// const createEvent = require("../event/createEvent");
// const ITEMS_PER_PAGE = 10;
// const EVENTFULL_EVENTS_BASE_URL = "http://api.eventful.com/json/events/search?";
// const EVENTFULL_KEY = process.env.EVENTFULL_KEY;
// const EVENTFULL_COUNT = process.env.EVENTFULL_COUNT;
// const EVENTFULL_DATE_FORMAT = "YYYYMMDD";
// const SKIP_CATEGORY = ["holiday", "sales", "science", "technology", "other"]
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.REGION
});
const { errorMessages, successMessages } = require("../common/constants");
const BATCH_SIZE = 25;
let pexelImagesMapping = {};
const getImageFromPexel = async function (category) {
    let categoryToSend = category;
    if (category && category == "concerts") {
        categoryToSend = "concert";
    } else if (category && category == "festivals") {
        categoryToSend = "festival";
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
                    landscape: item.image
                };
                return item;
            });
            pexelImagesMapping[category] = resultImagesURL;
            return resultImagesURL[Math.floor(Math.random() * resultImagesURL.length)].image;
        } else {
            let options = {
                method: "GET",
                uri: `https://api.pexels.com/v1/search?query=${categoryToSend}&per_page=80&page=1`,
                headers: {
                    Authorization: process.env.PEXELS_AUTHORIZATION_KEY
                }
            };
            let res = await rp(options).then(response => {
                return response;
            }).catch(error => {
                console.error("error : ", error);
                return "";
            });

            if (res) {
                res = JSON.parse(res);
                if (res && res.photos && res.photos.length > 0) {
                    let resultImagesURL = res.photos;
                    pexelImagesMapping[category] = resultImagesURL;

                    let timeToLive = Math.floor(moment.utc().add(10, "days").valueOf() / 1000);
                    let allImages = [];
                    resultImagesURL.forEach((element, index) => {
                        let imageURL = element.src.landscape;
                        if (imageURL) {
                            // This is done for the UI adjustment
                            imageURL = imageURL.replace("w=1200", "w=1700");
                            let obj = {
                                category: categoryToSend,
                                image: imageURL,
                                id: element.id + "",
                                delete_in: timeToLive,
                            };
                            allImages.push(obj);
                        }
                    });
                    await addImagesToDb(allImages);

                    let randomIndexOfImages = Math.floor(Math.random() * resultImagesURL.length);
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
    let params = {
        RequestItems: {}
    };
    params.RequestItems[TableNameVar] = [];

    ItemsArray.forEach((element, index) => {
        let data = {
            PutRequest: {
                Item: element
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
        if ((index + 1) % BATCH_SIZE == 0 || index == imageList.length - 1) {
            dynamoPromises.push(addBatchToDynamoTable(process.env.IMAGES_TABLE, items));
            items = [];
        }
    });
    let res = await Promise.all(dynamoPromises);
    return res;
};

const findCategory = (cateName) => {
    let mainCat = "";
    switch (cateName) {

        case 'Sports': case 'Athlete': case 'Race': case 'Aquatics': case 'Athletic Races': case 'Badminton': case 'Bandy': case 'Baseball': case 'Basketball': case 'Biathlon': case 'BodyBuilding': case 'Boxing': case 'Cricket': case 'Curling': case 'Cycling': case 'Equestrian': case 'eSports': case 'Extreme': case 'Field Hockey': case 'Fitness': case 'Floorball': case 'Football': case 'Golf': case 'Gymnastics': case 'Handball': case 'Hockey': case 'Ice Skating': case 'Indoor Soccer': case 'Lacrosse': case 'Martial Arts': case 'Miscellaneous': case 'Motorsports/Racing': case 'Netball': case 'Rodeo': case 'Roller Derby': case 'Roller Hockey': case 'Rugby': case 'Ski Jumping': case 'Skiing': case 'Soccer': case 'Softball': case 'Squash': case 'Surfing': case 'Swimming': case 'Table Tennis': case 'Tennis': case 'Toros': case 'Track & Field': case 'Volleyball': case 'Waterpolo': case 'Wrestling': case 'sports':
            mainCat = 'sports';
            break;

        case "Children's Festival": case 'Ceremony': case 'Festival': case 'Student Festival': case 'Parade': case 'Fairs & Festivals': case 'festivals':
            mainCat = 'festivals';
            break;

        case 'Clothing, Concession Voucher': case 'Gift Card': case 'Writer': case 'Speaker': case 'Award Show': case 'Charity/Benefit': case 'Convention': case 'Exhibit': case 'Expo': case 'Fan Experiences': case 'Sightseeing/Facility': case 'Swap Meet/Market': case 'Tour': case 'Touring Show/Production': case 'Donation': case 'Family': case 'Community/Cultural': case 'Community/Civic': case 'Special Interest/Hobby': case 'Amusement Park': case 'Aquarium': case 'Aquatic Park': case 'Club': case 'Campsite': case 'Ice Rink': case 'Museum': case 'Zoo': case 'Club Access': case 'community':
            mainCat = 'community';
            break;

        case 'Party/Gala': case 'Dinner Packages': case 'Meal Package': case 'Food & Drink': case 'food-truck': case 'eats-drinks':
            mainCat = 'eats-drinks';
            break;

        case 'Choir': case 'Chorus': case 'Actor': case 'Artist': case 'Character': case 'Choreographer': case 'Comedian': case 'Dancer': case 'Magician': case 'Performer': case 'Designer': case 'Director': case 'Comedy': case "Children's Theatre": case 'Circus & Specialty Acts': case 'Classical': case 'Comedy': case 'Cultural': case 'Dance': case 'Espectáculo': case 'Fashion': case 'Fine Art': case 'Magic & Illusion': case 'Miscellaneous': case 'Miscellaneous Theatre': case 'Multimedia': case 'Music': case 'Opera': case 'Performance Art': case 'Puppetry': case 'Spectacular': case 'Theatre': case 'Variety': case 'Arts & Theatre': case 'live-music': case 'karaoke': case 'open-mic-night': case 'live-streaming-music': case 'performing-arts':
        case 'art-and-craft':
            mainCat = 'performing-arts';
            break;

        case 'Band': case 'Group': case 'Tribute Band': case 'Troupe': case 'Orchestra': case 'League': case 'Quartet': case 'Musician': case 'Singer/Vocalist': case 'Audio/Visual': case 'Concert': case 'Alternative': case 'Ballads/Romantic': case 'Blues': case 'Chanson Francaise': case "Children's Music": case 'Classical': case 'Country': case 'Dance/Electronic': case 'Folk': case 'Hip-Hop/Rap': case 'Holiday': case 'Jazz': case 'Latin': case 'Medieval/Renaissance': case 'Metal': case 'New Age': case 'Other': case 'Pop': case 'R&B': case 'Reggae': case 'Religious': case 'Rock': case 'Undefined': case 'World': case 'concerts': case 'happy-hour':
            mainCat = 'concerts';
            break;

        case 'Lecture/Seminar': case 'Graduation/Commencement': case 'Competition': case 'Student Festival': case 'Lecture/Seminar': case 'university-college': case 'educational-conferences-workshops': case 'online-events-calendar': case 'tech-events':
            mainCat = 'university-college';
            break;

        case 'politics':
            mainCat = 'politics';
            break;

        default:
            mainCat = "";
            break;
    }
    return mainCat;
};

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
    });
};

const getData = async (
    tableName,
    fieldsObj = "*",
    whereObj = {},
    condition = "AND",
    offset = -1,
    limit = -1,
    customWhere = ""
) => {
    const wheryQry = Object.keys(whereObj).map(function (key, index) {
        var value = typeof whereObj[key] === "string" ? `'${whereObj[key]}'` : `${whereObj[key]}`;
        return `${key} = ${value}`;
    }).join(" " + condition + " ");

    var sqlQry = "SELECT " + fieldsObj + " FROM " + tableName;
    if (Object.keys(whereObj).length > 0) {
        sqlQry += " WHERE (" + wheryQry + ")";
        sqlQry += " AND is_deleted = 0";
    } else {
        sqlQry += " WHERE is_deleted = 0";
    }
    if (customWhere != "") {
        sqlQry += " AND " + customWhere;
    }
    sqlQry += " ORDER BY date_created DESC";
    if (offset >= 0 && limit >= 0) {
        sqlQry += ` LIMIT ${offset},${limit}`;
    }
    return new Promise((resolve, reject) => {
        runQuery(sqlQry).then(data => {
            resolve(data);
        }).catch(error => {
            console.error("error : ", error);
            reject(error);
        });
    });
}

const validate = function (body) {
    const schema = Joi.object().keys({
        search_params: Joi.required()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
}

let searchParamsQuery = (searchParams) => {
    var filterDbMain = searchParams;
    var radius = searchParams.radius;
    delete searchParams.radius;
    var fieldsObj = "*";
    var where = [];
    var distanceWhere = '';
    if (filterDbMain.startDate) {
        let start_date = moment.utc(filterDbMain.startDate);
        // Check if start date is less than now then adjust it so that expired events are not returned
        let start_milliseconds = start_date.valueOf();
        where.push("start_date_time_ms >= " + start_milliseconds);
    }
    delete filterDbMain.startDate;
    if (filterDbMain.endDate) {
        let end_date = moment.utc(filterDbMain.endDate); // This is added so that it searches till end of day
        end_date.set({ hour: 23, minute: 59, second: 59 });
        let end_millseconds = end_date.valueOf();
        where.push("start_date_time_ms <= " + end_millseconds);
    }
    delete filterDbMain.endDate;
    if (filterDbMain.categories && typeof filterDbMain.categories === "object" && filterDbMain.categories.length > 0) {
        where.push("category IN (" + filterDbMain.categories.map(x => '"' + x + '"').toString() + ")");
    }
    delete filterDbMain.categories;
    if (filterDbMain.zone_id && filterDbMain.zone_id != "") {
        where.push(`_zone_id = ${filterDbMain.zone_id}`);
    }
    delete filterDbMain.zone_id;
    if (filterDbMain.location && typeof filterDbMain.location === "object" && filterDbMain.location.length > 0) {
        let selectLocation = "(6371 * acos ( cos ( radians(" + filterDbMain.location[0] + ") ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(" + filterDbMain.location[1] + ") ) + sin ( radians(" + filterDbMain.location[0] + ") ) * sin( radians( latitude ) ))) AS distance";
        fieldsObj = fieldsObj + "," + selectLocation;
        distanceWhere = " HAVING distance < " + radius + "";
    }
    delete filterDbMain.location;
    if (filterDbMain.not_in_event && filterDbMain.not_in_event != "") {
        where.push("event_id != " + filterDbMain.not_in_event);
    }
    delete filterDbMain.not_in_event;
    let extraWhereQuery = Object.keys(filterDbMain).map(function (key, index) {
        var value = `'%${filterDbMain[key]}%'`;
        return `(${key} LIKE ${value} OR category LIKE ${value})`;
    }).join(" OR ");

    let whereQry = where.join(" AND ");

    if (whereQry != "") {
        if (extraWhereQuery != "") {
            whereQry += " AND ( " + extraWhereQuery + " ) ";
        }
    } else {
        if (extraWhereQuery != "") {
            whereQry = " ( " + extraWhereQuery + " ) ";
        }
    }
    var sqlQry = "SELECT " + fieldsObj + " FROM event_master";
    if (whereQry != "") {
        sqlQry += " WHERE (" + whereQry + ")";
        sqlQry += " AND is_deleted = 0";
        sqlQry += " AND is_draft != 1";
        sqlQry += " AND status = 'active'";
    } else {
        sqlQry += " WHERE is_deleted = 0";
        sqlQry += " AND is_draft != 1";
        sqlQry += " AND status = 'active'";
    }

    sqlQry += " AND (privacy_type IS NULL OR privacy_type = 1)";

    if (distanceWhere != "") {
        sqlQry += distanceWhere;
    }
    return sqlQry;
};

let searchParamsQueryCountScrapedEvent = (searchParams) => {
    var filterVar = searchParams;
    var fieldsObj = "*";
    var where = [];
    var distanceWhere = "";
    if (filterVar.startDate) {
        let start_date = moment.utc(filterVar.startDate);
        // Check if start date is less than now then adjust it so that expired events are not returned
        let start_milliseconds = start_date.valueOf();
        where.push("start_date_time_ms >= " + start_milliseconds);
    }
    delete filterVar.startDate;
    if (filterVar.endDate) {
        let end_date = moment.utc(filterVar.endDate); // This is added so that it searches till end of day
        end_date.set({ hour: 23, minute: 59, second: 59 });
        let end_millseconds = end_date.valueOf();
        where.push("start_date_time_ms <= " + end_millseconds);
    }
    delete filterVar.endDate;
    if (filterVar.categories && typeof filterVar.categories === "object" && filterVar.categories.length > 0) {
        where.push("category IN (" + filterVar.categories.map(x => '"' + x + '"').toString() + ")");
    }
    delete filterVar.categories;
    if (filterVar.zone_id && filterVar.zone_id != "") {
        where.push(`_zone_id = ${filterVar.zone_id}`);
    }
    delete filterVar.zone_id;
    if (filterVar.location && typeof filterVar.location === "object" && filterVar.location.length > 0) {
        let selectLocation = "(6371 * acos ( cos ( radians(" + filterVar.location[0] + ") ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(" + filterVar.location[1] + ") ) + sin ( radians(" + filterVar.location[0] + ") ) * sin( radians( latitude ) ))) AS distance";
        fieldsObj = fieldsObj + "," + selectLocation;
        distanceWhere = " HAVING distance < 100";
    }
    delete filterVar.location;
    if (filterVar.not_in_event && filterVar.not_in_event != "") {
        where.push("event_id != " + filterVar.not_in_event);
    }
    delete filterVar.not_in_event;
    let extraWhereQuery = Object.keys(filterVar).map(function (key, index) {
        var value = `'%${filterVar[key]}%'`;
        return `(${key} LIKE ${value} OR category LIKE ${value})`;
    }).join(" OR ");

    let whereQry = where.join(" AND ");

    if (whereQry != "") {
        if (extraWhereQuery != "") {
            whereQry += " AND ( " + extraWhereQuery + " ) ";
        }
    } else {
        if (extraWhereQuery != "") {
            whereQry = " ( " + extraWhereQuery + " ) ";
        }
    }
    var sqlQry = "SELECT " + fieldsObj + " FROM event_master";
    if (whereQry != "") {
        sqlQry += " WHERE (" + whereQry + ")";
        sqlQry += " AND is_deleted = 0";
        sqlQry += " AND isPHQ = 1";
        sqlQry += " AND is_draft != 1";
        sqlQry += " AND status = 'active'";
    } else {
        sqlQry += " WHERE is_deleted = 0";
        sqlQry += " AND is_draft != 1";
        sqlQry += " AND isPHQ = 1";
        sqlQry += " AND status = 'active'";
    }

    if (distanceWhere != "") {
        sqlQry += distanceWhere;
    }
    return sqlQry;
};

// const eventfulCatFind = (maincat) => {
//     subcat = '';
//     switch (maincat) {
//         case 'concerts':
//             subcat = 'music,singles_social';
//             break;

//         case 'performing-arts':
//             subcat = 'comedy,movies_film,performing_arts';
//             break;

//         case 'festivals':
//             subcat = 'festivals_parades,art,food';
//             break;

//         case 'sports':
//             subcat = 'support,outdoors_recreation,sports';
//             break;

//         case 'community':
//             subcat = 'family_fun_kids,fundraisers,books,business,religion_spirituality,animals,clubs_associations,community,attractions';
//             break;

//         case 'conferences':
//             subcat = 'conference';
//             break;
//         case 'university-college':
//             subcat = 'learning_education,schools_alumni,books';
//             break;

//         case 'eats-drinks':
//             subcat = 'food';
//             break;

//         default:
//             break;
//     }
//     return subcat;

// }
// let ScrapDataFromEventFul = async (qp, offset) => {
//     let url = EVENTFULL_EVENTS_BASE_URL;
//     let responses = [];
//     let category = [];

//     try {
//         //options
//         url += ("page_size=" + EVENTFULL_COUNT + "&page_number=" + offset);
//         url += '&include=categories';
//         if ("categories" in qp) {
//             let categories = qp.categories;
//             let searchCat = [];
//             for (let category of categories) {
//                 category = await eventfulCatFind(category.toLowerCase())
//                 searchCat.push(category)
//             }
//             url += "&";
//             let categoriesForPHQ = searchCat.join(",");
//             url += ("category=" + categoriesForPHQ);
//         }
//         let radius = 30;//30mi
//         url += "&within=" + radius + "&units=km&location=" + qp.location[0] + "," + qp.location[1] + "&sort=start";
//         // url += '&category=food';
//         if ("startDate" in qp && "endDate" in qp) {
//             let start = moment.utc(qp.startDate).format('YYYYMMDD');
//             let end = moment.utc(qp.endDate).format('YYYYMMDD');
//             url += ("&date=" + start + "00-" + end + "00");
//         }

//         url += '&ex_category=' + SKIP_CATEGORY.join(',');
//         url += '&app_key=' + EVENTFULL_KEY;
//         let options = {
//             uri: url,
//             json: true,
//             method: 'GET',
//             timeout: 10000
//         };
//         let returnTotoalCount = 0;

//         const testFun = async () => {
//             return new Promise(async (resolve, reject) => {
//                 await request(options, async function (error, response) {
//                     if (error) {
//                         return reject(error);
//                     } else {
//                         if (response && response.statusCode == 200) {
//                             let resp = response.body;
//                             if ("total_items" in resp && resp.total_items > 0 && resp.events && resp.events.event.length > 0) {
//                                 returnTotoalCount = (resp.total_items * 1);
//                                 // let categoryOfEvents = resp.events.event.map(value => ('category' in value.categories) ? value.categories.category[0].id : '');
//                                 for (let eachResp of resp.events.event) {
//                                     let category = ('category' in eachResp.categories) ? eachResp.categories.category[0].id : '';
//                                     category = await findCategory(category);
//                                     let eventImage = await getImageFromPexel(category)

//                                     let address = [];

//                                     if (eachResp.venue_address) {
//                                         address.push(eachResp.venue_address);
//                                     }
//                                     if (eachResp.region_name) {
//                                         address.push(eachResp.region_name);
//                                     }
//                                     if (eachResp.city_name) {
//                                         address.push(eachResp.city_name);
//                                     }
//                                     if (eachResp.country_name) {
//                                         address.push(eachResp.country_name);
//                                     }
//                                     if (eachResp.postal_code) {
//                                         address.push(eachResp.postal_code);
//                                     }
//                                     let venueAddress = `${address.join(', ')}`;
//                                     let eachEvent = {
//                                         "event_name": eachResp.title,
//                                         "event_image": eventImage && eventImage != '' ? eventImage : '',
//                                         "description": (eachResp.description) ? eachResp.description : '',
//                                         "PHQEventID": eachResp.id,
//                                         "isPHQ": 1,
//                                         "category": category,
//                                         "start_date_time": moment(eachResp.start_time).format(ES_DATE_FORMAT),
//                                         "start_date_time_ms": moment(eachResp.start_time).valueOf(),
//                                         "end_date_time": eachResp.stop_time ? moment(eachResp.stop_time).add(1, "day").format(ES_DATE_FORMAT) : moment(eachResp.start_time).add(1, "day").format(ES_DATE_FORMAT),
//                                         "end_date_time_ms": eachResp.stop_time ? moment(eachResp.stop_time).add(1, "day").valueOf() : moment(eachResp.start_time).add(1, "day").valueOf(),
//                                         "start_date_utc": moment(eachResp.start_time).format(ES_DATE_FORMAT),
//                                         "end_date_utc": eachResp.stop_time ? moment(eachResp.stop_time).add(1, "day").format(ES_DATE_FORMAT) : moment(eachResp.start_time).add(1, "day").format(ES_DATE_FORMAT),
//                                         "event_location": JSON.stringify([(eachResp.longitude * 1), (eachResp.latitude * 1)]),
//                                         "latitude": (eachResp.latitude * 1),
//                                         "longitude": (eachResp.longitude * 1),
//                                         "event_type": 'public',
//                                         "address": venueAddress,
//                                         'state': eachResp.region_name ? eachResp.region_name : '',
//                                         'city': eachResp.city_name ? eachResp.city_name : '',
//                                         'country': eachResp.country_name ? eachResp.country_name : '',
//                                         'zipcode': eachResp.postal_code ? eachResp.postal_code : ''

//                                     };
//                                     await MDBObject.getData('event_master', '*', { PHQEventID: eachResp.id }).then(async res => {
//                                         if (res.length <= 0) {
//                                             await MDBObject.dataInsert('event_master', eachEvent)
//                                         }
//                                     })
//                                     // responses.push(eachEvent);
//                                 }
//                             }
//                             // if (responses && responses.length > 0) {
//                             //     let saveResp = await saveEvents(responses);
//                             // }
//                             return resolve({ total_counts: returnTotoalCount })
//                         } else {
//                             return '0';
//                         }
//                     }
//                 });
//             })
//         }

//         return testFun().then(response => {
//             return response.total_counts;
//         }).catch(error => {
//             console.error('error : ', error)
//         })
//     } catch (error) {
//         console.error('error : ', error)
//         return 0;
//     }
// }

const bulkInsert = async (tableName, bulkArray) => {
    let values = [];
    let fields = "";
    await Promise.all(
        bulkArray.map(value => {
            value.date_created = moment().format(ES_DATE_FORMAT);
            fields = Object.keys(value).map(key => `${key}`).join(",");
            values.push(Object.values(value).map(objvalue => {
                return typeof objvalue === "string" ? `"${MDBObject.mysql_real_escape_string(objvalue)}"` : `${objvalue}`;
            }).join(","));
        })
    );
    values = "(" + values.join("),(") + ")";
    let sqlQry = "INSERT INTO " + tableName + " (" + fields + ") values " + values;
    return new Promise((resolve, reject) => {
        runQuery(sqlQry).then(data => {
            resolve(data);
        }).catch(error => {
            reject(error);
        });
    });
};

const createData = async function (events) {
    let imagePromises = [];
    let unqiueCategories = [];

    events.forEach((element, index) => {
        if (!element.category) {
            element.category = "concerts";
        }
        if (!unqiueCategories.includes(element.category)) {
            unqiueCategories.push(element.category);
        }
        if (element.description && element.description.length > 0) {
            element.email = element.description.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}/gi);
            element.phoneNumber = element.description.match(/[\+]?\d{10}|\(\d{3}\)\s?-\d{8}/);
            element.websiteUrl = element.description.match(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi);
        }
    });

    unqiueCategories.forEach((category) => {
        imagePromises.push(getImageFromPexel(category));
    });

    await Promise.all(imagePromises);
    Promise.all(events.map(async (element, index) => {
        let i = index + 1;
        let venues = "";
        if ("entities" in element && element.entities &&
            "venues" in element.entities && element.entities.venues &&
            element.entities.venues.length > 0) {
            venues = element.entities.venues[0].name;
        }

        var eventDBObject = {
            event_name: element.title,
            description: element.description != null ? element.description.replace(/'/g, "") : "",
            category: element.category.replace(" ", "-"),
            address: venues,
            start_date_time: element.start,
            end_date_time: element.end,
            start_date_utc: element.start,
            end_date_utc: element.end,
            start_date_time_ms: moment(element.start).valueOf(),
            end_date_time_ms: moment(element.end).valueOf(),
            timezone: element.timezone !== undefined ? element.timezone : "",
            country: element.country !== undefined ? element.country : "",
            city: element.city ? element.city : "",
            state: element.state ? element.state : "",
            event_location: JSON.stringify([element.location[1], element.location[0]]),
            // [23.0267556,72.6008286]
            latitude: element.location[1],
            longitude: element.location[0],
            isPHQ: 1,
            PHQEventID: element.id,
            event_type: "public",
            email: element.email ? element.email[0] : "",
            phone: element.phoneNumber ? element.phoneNumber[0] : "",
            websiteurl: element.websiteUrl ? element.websiteUrl[0] : "",
        };

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
        } else if (pexelImagesMapping && pexelImagesMapping[element.category] &&
            pexelImagesMapping[element.category].length > 0) {
            let resultImagesURL = pexelImagesMapping[element.category];
            let randomIndexOfImages = Math.floor(Math.random() * resultImagesURL.length);
            let imageIndex = resultImagesURL[randomIndexOfImages];
            let imageURL = imageIndex.src.landscape;
            if (imageURL) {
                imageURL = imageURL.replace("w=1200", "w=1700");
            }
            eventDBObject.event_image = imageURL;
        }
        return eventDBObject;
    })).then(async eventScrapData => {
        return await bulkInsert("event_master", eventScrapData).then(dataResponse => {
            return dataResponse;
        });
    });
};

const seeIfEventExists = async function (events) {
    return new Promise(async (resolve, reject) => {
        let arrayPHQId = events.map(item => `'${item.id}'`).join(",");
        let ExistQuery = "SELECT * FROM event_master WHERE PHQEventID IN (" + arrayPHQId + ")";
        await runQuery(ExistQuery).then(result => {
            resolve(result)
        }).catch(error => {
            reject(error)
        })
    })
};

const createEvents = async function (events) {
    try {
        let response = await seeIfEventExists(events);
        if (response && response.length > 0) {
            finalEvents = response;
            let qbExistingEventIds = response.map(r => r.PHQEventID);
            events = events.filter(d => !qbExistingEventIds.includes(d.id));
        }

        let create_api_data = [];
        let idsToAddeds = [];
        events.forEach((e) => {
            if (!idsToAddeds.includes(e.id)) {
                create_api_data.push(e);
                idsToAddeds.push(e.id);
            }
        });

        let result = null;
        if (create_api_data && create_api_data.length > 0) {
            result = await createData(create_api_data);
        }
    } catch (error) {
        console.error(error);
    }
};

let ScrapDataFromTicketMaster = async (queryParams) => {
    try {
        let radius = 100;
        let unit = "km";
        let size = 200;
        let startDateTime;
        let endDateTime;

        if ("startDate" in queryParams && "endDate" in queryParams) {
            startDateTime = moment.utc(queryParams.startDate).format("YYYY-MM-DDTHH:mm:ss") + "Z";
            endDateTime = moment.utc(queryParams.endDate).format("YYYY-MM-DDTHH:mm:ss") + "Z";
        } else {
            startDateTime = moment.utc().add("1", "days").format("YYYY-MM-DDTHH:mm:ss") + "Z";
            endDateTime = moment.utc().add("8", "days").format("YYYY-MM-DDTHH:mm:ss") + "Z";
        }

        let url = `${process.env.TICKET_MASTER_EVENTS_BASE_URL}/discovery/v2/events.json?apikey=${process.env.TICKET_MASTER_KEY}&radius=${radius}&unit=${unit}&size=${size}&latlong=${queryParams.location[0]},${queryParams.location[1]}&startDateTime=${startDateTime}&endDateTime=${endDateTime}`;

        let options = {
            uri: url,
            json: true,
            method: 'GET',
            timeout: 20000
        };

        let returnTotoalCount = 0;
        const getEvents = async () => {
            return new Promise(async (resolve, reject) => {
                await request(options, async function (error, response, response_body) {
                    if (error) {
                        console.error(error);
                        return reject(error);
                    } else {
                        if (response_body.page && response_body.page.totalElements) {
                            returnTotoalCount = response_body.page.totalElements * 1;
                        }

                        if (returnTotoalCount > 0 && response_body &&
                            response_body._embedded && response_body._embedded.events &&
                            response_body._embedded.events.length) {
                            let respEvent = response_body._embedded.events;

                            let finalEvents = [];
                            let pushedEvents = [];
                            for (let eachResp of respEvent) {
                                if (eachResp && eachResp.classifications && eachResp.classifications.length) {
                                    let category = "";
                                    for (let classifications of eachResp.classifications) {
                                        if (category == "" && classifications && classifications.segment && classifications.segment.name) {
                                            category = await findCategory(classifications.segment.name);
                                        }

                                        if (category == "" && classifications && classifications.genre && classifications.genre.name) {
                                            category = await findCategory(classifications.genre.name);
                                        }

                                        if (category == "" && classifications && classifications.subGenre && classifications.subGenre.name) {
                                            category = await findCategory(classifications.subGenre.name);
                                        }

                                        if (category == "" && classifications && classifications.type && classifications.type.name) {
                                            category = await findCategory(classifications.type.name);
                                        }

                                        if (category == "" && classifications && classifications.subType && classifications.subType.name) {
                                            category = await findCategory(classifications.subType.name);
                                        }

                                        if (category && category != "") {
                                            let eventImage = "";
                                            let websiteUrl = [];
                                            let address = [];
                                            let city = "";
                                            let state = "";
                                            let country = "";
                                            let location = [];
                                            let startDate;
                                            let endDate;
                                            let startDateUTC;
                                            let endDateUTC;

                                            if (eachResp && eachResp.images && eachResp.images.length) {
                                                eachResp.images.sort((a, b) => a.width < b.width ? 1 : b.width < a.width ? -1 : 0);

                                                for (let image of eachResp.images) {
                                                    if (image && image.url && image.url != "") {
                                                        eventImage = image.url;
                                                        break;
                                                    }
                                                }
                                            }

                                            if (eventImage == "") {
                                                eventImage = await getImageFromPexel(category);
                                            }

                                            let timezone = eachResp.dates && eachResp.dates.timezone ? eachResp.dates.timezone : "";
                                            if (eachResp.dates.start && eachResp.dates.start.localDate && eachResp.dates.start.localTime) {
                                                startDate = eachResp.dates.start.localDate + " " + eachResp.dates.start.localTime;
                                            } else if (eachResp.dates.start && eachResp.dates.start.localDate) {
                                                startDate = eachResp.dates.start.localDate + " 00:00:00";
                                            }

                                            if (startDate && startDate != "") {
                                                endDate = moment(startDate).add(1, "day").format(ES_DATE_FORMAT);

                                                if (timezone && timezone != '') {
                                                    startDateUTC = momentTz.tz(startDate, ES_DATE_FORMAT, timezone).utc().format(ES_DATE_FORMAT);
                                                    endDateUTC = momentTz.tz(endDate, ES_DATE_FORMAT, timezone).utc().format(ES_DATE_FORMAT);
                                                } else {
                                                    startDateUTC = momentTz.tz(startDate, ES_DATE_FORMAT, timezone).utc().format(ES_DATE_FORMAT);
                                                    endDateUTC = momentTz.tz(endDate, ES_DATE_FORMAT, timezone).utc().format(ES_DATE_FORMAT);
                                                }
                                            }

                                            if (eachResp._embedded && eachResp._embedded.venues && eachResp._embedded.venues.length) {
                                                let venues = eachResp._embedded.venues[0];
                                                if (venues.location && venues.location.longitude && venues.location.latitude) {
                                                    location = [Number(venues.location.longitude), Number(venues.location.latitude)]
                                                }

                                                if (venues.name) {
                                                    address.push(venues.name);
                                                }
                                                if (venues.address && venues.address.line1) {
                                                    address.push(venues.address.line1);
                                                }
                                                if (venues.city && venues.city.name) {
                                                    city = venues.city.name;
                                                    address.push(venues.city.name);
                                                }
                                                if (venues.state && venues.state.name) {
                                                    state = venues.state.name;
                                                    address.push(venues.state.name);
                                                }
                                                if (venues.country) {
                                                    if (venues.country.countryCode) {
                                                        country = venues.country.countryCode;
                                                    }
                                                    if (venues.country.name) {
                                                        address.push(venues.country.name);
                                                    }
                                                }
                                                if (venues.postalCode) {
                                                    address.push(venues.postalCode);
                                                }
                                            }

                                            if (eachResp.url) {
                                                websiteUrl.push(eachResp.url);
                                            }

                                            let description = eachResp.info ? eachResp.info : "";
                                            if (eachResp.pleaseNote) {
                                                description += "\n" + eachResp.pleaseNote
                                            }

                                            let venueAddress = `${address.join(", ")}`;
                                            let eachEvent = {
                                                id: eachResp.id,
                                                title: eachResp.name,
                                                category: category,
                                                description: description,
                                                image: eventImage,
                                                websiteUrl: eachResp.url ? [eachResp.url] : [],
                                                entities: { venues: [{ name: venueAddress }] },
                                                location: location,
                                                city: city,
                                                state: state,
                                                country: country,
                                                timezone: timezone,
                                                start: startDate,
                                                end: endDate,
                                                startDateUTC: startDateUTC,
                                                endDateUTC: endDateUTC,
                                            };

                                            if (!(eachEvent.id in pushedEvents)) {
                                                pushedEvents.push(eachEvent.id);
                                                finalEvents.push(eachEvent);
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                            await createEvents(finalEvents);
                        }
                        return resolve({ total_counts: returnTotoalCount });
                    }
                });
            })
        }

        return getEvents().then(response => {
            return response.total_counts;
        }).catch(error => {
            console.error("error : ", error);
            return 0;
        })
    } catch (error) {
        console.error("error : ", error);
        return 0;
    }
};

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let apiData = JSON.parse(event.body);
        let scrapSearchData = JSON.parse(event.body);
        await validate(apiData);

        let pageNumber = (event.queryStringParameters && event.queryStringParameters.page && event.queryStringParameters.page > 0) ? event.queryStringParameters.page : 1;
        let pageLimit = (event.queryStringParameters && event.queryStringParameters.limit && event.queryStringParameters.limit > 0) ? event.queryStringParameters.limit : 300;
        let dataOrder = (event.queryStringParameters && event.queryStringParameters.sort) ? event.queryStringParameters.sort : 'ASC';
        let sortKey = (event.queryStringParameters && event.queryStringParameters.sortby) ? event.queryStringParameters.sortby : 'event_id';
        let radius = (event.queryStringParameters && event.queryStringParameters.radius) ? (event.queryStringParameters.radius * 1) : 100;

        let isBackground = (event.queryStringParameters && event.queryStringParameters.background) ? event.queryStringParameters.background : 0;
        // let index = (event.queryStringParameters && event.queryStringParameters.index) ? event.queryStringParameters.index : 0;

        let searchParams = apiData.search_params;
        let phqCountFilter = apiData.search_params;
        let filterScrap = apiData.search_params;
        let scraping_event_count = 0;
        let scraped_event_count = 0;

        let categories = [];
        if (searchParams && searchParams.categories && searchParams && searchParams.categories.length > 0) {
            for (let category of searchParams.categories) {
                category = await findCategory(category.toLowerCase())
                if (category && category != '' && categories.indexOf(category) == -1) {
                    categories.push(category)
                }
            }
        } else {
            categories = ["concerts", "festivals", "community", "eats-drinks", "sports", "university-college", "performing-arts", "politics"]
        }

        scrapSearchData.search_params.categories = categories;
        searchParams.categories = categories;

        const fetchEvents = async () => {

            let scrapEventCountQuery = await searchParamsQueryCountScrapedEvent(phqCountFilter);
            await runQuery(scrapEventCountQuery).then(async (data) => {
                scraped_event_count = data.length;
            });

            scrapSearchData.search_params.radius = radius;
            var sqlQry = await searchParamsQuery(scrapSearchData.search_params);
            let totalRecords = 0;
            await runQuery(sqlQry).then(async (data) => {
                totalRecords = data.length;
            });

            if (searchParams.location && typeof searchParams.location === "object" && searchParams.location.length > 0 && sortKey == "distance") {
                sqlQry += " ORDER BY highlighted DESC , distance ASC";
            } else {
                sqlQry += " ORDER BY highlighted DESC , " + sortKey + " " + dataOrder;
            }
            sqlQry += " LIMIT " + (pageNumber * pageLimit - pageLimit) + "," + pageLimit;
            return runQuery(sqlQry).then(async (data) => {
                if (data.length > 0) {
                    var promises = await Promise.all(
                        await data.map(async (dataValue) => {
                            if (dataValue._user_id > 0) {
                                let EventTickets = await getData("event_tickets", "*", {
                                    _event_id: dataValue.event_id
                                });
                                dataValue.tickets_list = EventTickets;
                                let rewardGetQuery = `SELECT * FROM reward_master WHERE _event_id = ${dataValue.event_id} AND is_draft = 0 AND (status = 'active' OR status = 'completed' )`;
                                return await runQuery(rewardGetQuery).then(responseData => {
                                    dataValue.reward_details = responseData;
                                    return dataValue;
                                });
                            } else {
                                dataValue.tickets_list = [];
                                dataValue.reward_details = [];
                                return dataValue;
                            }
                        })
                    );

                    let private_events_data = [];
                    let total_private_events = 0;
                    let private_events_page = searchParams.private_events_page || 1;
                    let private_events_limit = searchParams.private_events_limit || 10;

                    if (event && event.headers && event.headers.Authorization) {
                        const user = await utils.verifyUser(event.headers.Authorization);
                        const privateEventsCountQuery = `SELECT COUNT(1) as count 
                            FROM private_event_invitations pei
                            INNER JOIN event_master em ON em.event_id = pei.event_id
                            WHERE pei.email = '${user.email}' AND pei.is_deleted = 0 AND em.is_deleted = 0;`;

                        const [eventCount] = await runQuery(privateEventsCountQuery);
                        console.log(eventCount);
                        total_private_events = eventCount.count;

                        const privateEventsQuery = `SELECT em.*
                            FROM private_event_invitations pei
                            INNER JOIN event_master em ON em.event_id = pei.event_id
                            WHERE pei.email = '${user.email}' AND pei.is_deleted = 0 AND em.is_deleted = 0;`;

                        const privateEvents = await runQuery(privateEventsQuery);
                        console.log(privateEvents);
                        private_events_data = privateEvents;
                    }

                    response = {
                        success: true,
                        message: successMessages.GET_EVENT_LIST,
                        data: promises,
                        total: parseInt(totalRecords),
                        page: parseInt(pageNumber),
                        limit: parseInt(pageLimit),
                        scraped_event_count: scraped_event_count,
                        scraping_event_count: scraping_event_count,
                        private_events_data,
                        total_private_events,
                        private_events_page,
                        private_events_limit,
                    };
                } else {
                    response = { success: false, message: errorMessages.NO_EVENTS_FOUND };
                }
                return awsRequestHelper.respondWithJsonBody(200, response);
            }).catch((error) => {
                console.error("error : ", error);
                response.message = error.message;
                if (error && error.status_code == 400) {
                    return awsRequestHelper.respondWithJsonBody(400, response);
                }
                return awsRequestHelper.respondWithJsonBody(500, response);
            });
        };

        if (isBackground == 1 && filterScrap &&
            filterScrap.location && filterScrap.location.length &&
            filterScrap.location[0] && filterScrap.location[1]) {
            pageLimit = 1500;
            // scraping_event_count = await ScrapDataFromEventFul(filterScrap, index);

            return await ScrapDataFromTicketMaster(filterScrap).then(async (data) => {
                // scraping_event_count = data
                return fetchEvents().catch(error => {
                    console.error("error : ", error);
                    return awsRequestHelper.respondWithJsonBody(500, response);
                });
            }).catch((error) => {
                console.error(error);
                return awsRequestHelper.respondWithJsonBody(500, response);
            });
        } else {
            return fetchEvents().catch(error => {
                console.error("error : ", error);
                return awsRequestHelper.respondWithJsonBody(500, response);
            });
        }
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
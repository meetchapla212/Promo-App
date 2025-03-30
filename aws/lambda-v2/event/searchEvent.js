const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const moment = require('moment');
const createEvent = require('../event/createEvent');
const ITEMS_PER_PAGE = 10;
const rp = require('request-promise');
var mysql = require("mysql2");
const {
    errorMessages,
    successMessages
} = require("../common/constants");

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

const getData = async (tableName, fieldsObj = "*", whereObj = {}, condition = "AND", offset = -1, limit = -1, customWhere = "") => {
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

const getEventsPageFromGPL = async (url, page) => {
    url += '&page_no=' + page;
    let options = {
        method: 'GET',
        uri: url
    };
    let response = await rp(options);

    if (response) {
        response = JSON.parse(response);
        let finalResponse = {
            total: response.total || 0,
            events: []
        }
        if ('results' in response && response.results && response.results.length > 0) {
            let events = [];
            for (let event of response.results) {
                let qbEvent = {
                    id: event.id,
                    category: (event.category ? event.category.toLowerCase() : ''),
                    description: event.description,
                    title: event.title,
                    location: [event.location[0], event.location[1]],
                    start: event.startDate,
                    end: event.endDate,
                    entities: {
                        venues: [{ name: (event.address || '') }]
                    },
                    image: event.image
                }
                events.push(qbEvent);
            }
            if (events && events.length > 0) {
                let event = {
                    body: JSON.stringify(events)
                }
                await createEvent.handler(event);
            }
        }
        return finalResponse;
    }
    return null;
};

const getEventsFromGPL = async (body) => {
    body = body.search_params;
    try {
        let startDate = moment.utc(body.startDate).valueOf();
        let endDate = moment.utc(body.endDate).valueOf();
        let url = `${process.env.GPL_BASE_URL}/events?items_per_page=${ITEMS_PER_PAGE}&start=${startDate}&end=${endDate}&within=30&lat=${body.location[0]}&long=${body.location[1]}&api_key=${process.env.GPL_API_KEY}&category=${body.categories.join()}`;

        // Get the first page
        let response = await getEventsPageFromGPL(url, 0);
        let finalEvents = [];
        if (response && 'total' in response && response.total > 0) {
            let numberOfPages = 0;
            if ('events' in response && response.events && response.events.length > 0) {
                finalEvents.push(...response.events);
            }
            // This is done since we have already got page 1
            response.total = response.total - ITEMS_PER_PAGE;
            if (response.total > ITEMS_PER_PAGE) {
                numberOfPages = Math.floor(response.total / ITEMS_PER_PAGE);
                // This is done if event count is 12 then pages are 2
                if (response.total % ITEMS_PER_PAGE > 0) {
                    numberOfPages = numberOfPages + 1;
                }
            }

            // Make parallel call to get all events
            let promises = [];
            for (let i = 0; i < numberOfPages; i++) {
                promises.push(getEventsPageFromGPL(url, i));
            }

            let responseEvents = await Promise.all(promises);
            console.log('responseEvents parallel', responseEvents.length);
        }
    } catch (error) {
        console.error("error : ", error);
    }
    return [];
}

let searchParamsQuery = (searchParams) => {
    var fieldsObj = "*";
    var where = [];
    var distanceWhere = '';
    if (searchParams.startDate) {
        let start_date = moment.utc(searchParams.startDate);
        // Check if start date is less than now then adjust it so that expired events are not returned
        let start_milliseconds = (start_date).valueOf();
        where.push('start_date_time_ms >= ' + start_milliseconds);

        delete searchParams.startDate;
    }
    if (searchParams.endDate) {
        let end_date = moment.utc(searchParams.endDate); // This is added so that it searches till end of day
        end_date.set({ hour: 23, minute: 59, second: 59 });
        let end_millseconds = (end_date).valueOf();
        where.push('start_date_time_ms <= ' + end_millseconds);
        delete searchParams.endDate;
    }
    if (searchParams.categories && typeof searchParams.categories === 'object' && searchParams.categories.length > 0) {
        where.push('category IN (' + searchParams.categories.map(x => '"' + x + '"').toString() + ')');
        delete searchParams.categories;
    }
    if (searchParams.location && typeof searchParams.location === 'object' && searchParams.location.length > 0) {
        let selectLocation = "(6371 * acos ( cos ( radians(" + searchParams.location[0] + ") ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(" + searchParams.location[1] + ") ) + sin ( radians(" + searchParams.location[0] + ") ) * sin( radians( latitude ) ))) AS distance";
        fieldsObj = fieldsObj + ',' + selectLocation;
        distanceWhere = ' HAVING distance < 300';
        delete searchParams.location;
    }
    if (searchParams.not_in_event && searchParams.not_in_event != "") {
        where.push('event_id != ' + searchParams.not_in_event);
        delete searchParams.not_in_event;
    }

    let extraWhereQuery = Object.keys(searchParams).map(function (key, index) {
        var value = `'%${searchParams[key]}%'`;
        return `${key} LIKE ${value}`;
    }).join(" OR ");

    let whereQry = where.join(" AND ");

    if (whereQry != '') {
        if (extraWhereQuery != "") {
            whereQry += " AND ( " + extraWhereQuery + " ) ";
        }
    } else {
        if (extraWhereQuery != "") {
            whereQry = " ( " + extraWhereQuery + " ) ";
        }
    }
    var sqlQry = "SELECT " + fieldsObj + " FROM event_master";
    if (whereQry != '') {
        sqlQry += " WHERE (" + whereQry + ")";
        sqlQry += " AND is_deleted = 0";
        sqlQry += " AND is_draft != 1";
        sqlQry += " AND status = 'active'";
    } else {
        sqlQry += " WHERE is_deleted = 0";
        sqlQry += " AND is_draft != 1";
        sqlQry += " AND status = 'active'";
    }

    if (distanceWhere != '') {
        sqlQry += distanceWhere;
    }
    return sqlQry;
}

let countGPLData = async function (body) {
    var total = 0;
    body = body.search_params;
    try {
        let startDate = moment.utc(body.startDate).valueOf();
        let endDate = moment.utc(body.endDate).valueOf();
        let url = `${process.env.GPL_BASE_URL}/events?items_per_page=${ITEMS_PER_PAGE}&start=${startDate}&end=${endDate}&within=30&lat=${body.location[0]}&long=${body.location[1]}&api_key=${process.env.GPL_API_KEY}&category=${body.categories.join()}`;
        url += '&page_no=0';
        let options = {
            method: 'GET',
            uri: url
        };
        let response = await rp(options);
        if (response) {
            response = JSON.parse(response);
            if (response && 'total' in response) {
                total = response.total;
            }
        }
    } catch (error) {
        console.error("error : ", error);
    }
    return total;
}

module.exports.handler = async function (event, context, callback) {
    //connection = await getConnection();
    //console.log("connection", connection);
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let apiData = JSON.parse(event.body);
        let scrapSearchData = JSON.parse(event.body);
        await validate(apiData);

        let pageNumber = (event.queryStringParameters && event.queryStringParameters.page && event.queryStringParameters.page > 0) ? event.queryStringParameters.page : 1;
        let pageLimit = (event.queryStringParameters && event.queryStringParameters.limit && event.queryStringParameters.limit > 0) ? event.queryStringParameters.limit : 300;
        let dataOrder = (event.queryStringParameters && event.queryStringParameters.sort) ? event.queryStringParameters.sort : 'ASC';
        let sortKey = (event.queryStringParameters && event.queryStringParameters.sortby) ? event.queryStringParameters.sortby : 'distance';
        let searchParams = apiData.search_params;

        // var fieldsObj = "`reward_id`, `title`, `description`, `image`, `no_of_people`, `start_date`, `end_date`, `reward_type`, `winner_type`, `terms_condition`, `date_created`, `date_modified`, `status`";
        var sqlQry = await searchParamsQuery(searchParams);
        let totalRecords = 0;
        await runQuery(sqlQry).then(async (data) => {
            totalRecords = data.length
        });
        // await getEventsFromGPL(scrapSearchData);
        console.log('totalRecords=====', totalRecords);
        var countData = await countGPLData(scrapSearchData);
        console.log('countGPLData=====', countData);
        if (totalRecords < countData) {
            // console.log('totalRecords=====', totalRecords);
            await getEventsFromGPL(scrapSearchData);
            await runQuery(sqlQry).then(async (data) => {
                totalRecords = data.length
            });
        }

        if (searchParams.location && typeof searchParams.location === 'object' && searchParams.location.length > 0 && sortKey == "distance") {
            sqlQry += ' ORDER BY distance';
        } else {
            sqlQry += " ORDER BY " + sortKey + " " + dataOrder;
        }

        sqlQry += " LIMIT " + ((pageNumber * pageLimit) - pageLimit) + "," + pageLimit;
        // console.log(sqlQry);

        return runQuery(sqlQry).then(async (data) => {
            if (data.length > 0) {
                var promises = await Promise.all(
                    await data.map(async (dataValue) => {
                        if (dataValue._user_id > 0) {
                            if (dataValue.ticket_type == 'paid') {
                                let EventTickets = await getData("event_tickets", "*", { _event_id: dataValue.event_id });
                                dataValue.tickets_list = EventTickets;
                            } else {
                                dataValue.tickets_list = [];
                            }
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
                response = { success: true, message: successMessages.GET_EVENT_LIST, data: promises, total: parseInt(totalRecords), page: parseInt(pageNumber), limit: parseInt(pageLimit) }
            } else {
                response = { success: false, message: errorMessages.NO_EVENTS_FOUND }
            }
            console.log("connection closed.!!");
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch((error) => {
            console.error("error : ", error);
            return awsRequestHelper.respondWithJsonBody(500, response);
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};
'use strict';
const moment = require('moment');
const momentTz = require('moment-timezone');
const rp = require('request-promise');
let pexelImagesMapping = {};
const AWS = require('aws-sdk');
const ES_DATE_FORMAT = "YYYY-MM-DD HH:mm:ss";
AWS.config.setPromisesDependency(require('bluebird'));
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.REGION
});
const lambda = new AWS.Lambda({
    region: process.env.REGION
});

// This function is used to invoke add events lambda
const invokeLambda = (events) => {
    console.log("invokeLambda : ", events.length);
    let params = {
        FunctionName: process.env.LAMBDA_POST_EVENTS_TO_QB,
        InvocationType: 'Event',
        LogType: 'Tail',
        Payload: JSON.stringify({ body: JSON.stringify(events) })
    };
    return lambda.invoke(params).promise();
};

const findCategory = (cateName) => {
    let mainCat = '';
    switch (cateName) {

        case 'Sports': case 'Athlete': case 'Race': case 'Aquatics': case 'Athletic Races': case 'Badminton': case 'Bandy': case 'Baseball': case 'Basketball': case 'Biathlon': case 'BodyBuilding': case 'Boxing': case 'Cricket': case 'Curling': case 'Cycling': case 'Equestrian': case 'eSports': case 'Extreme': case 'Field Hockey': case 'Fitness': case 'Floorball': case 'Football': case 'Golf': case 'Gymnastics': case 'Handball': case 'Hockey': case 'Ice Skating': case 'Indoor Soccer': case 'Lacrosse': case 'Martial Arts': case 'Miscellaneous': case 'Motorsports/Racing': case 'Netball': case 'Rodeo': case 'Roller Derby': case 'Roller Hockey': case 'Rugby': case 'Ski Jumping': case 'Skiing': case 'Soccer': case 'Softball': case 'Squash': case 'Surfing': case 'Swimming': case 'Table Tennis': case 'Tennis': case 'Toros': case 'Track & Field': case 'Volleyball': case 'Waterpolo': case 'Wrestling':
            mainCat = 'sports';
            break;

        case "Children's Festival": case 'Ceremony': case 'Festival': case 'Student Festival': case 'Parade': case 'Fairs & Festivals':
            mainCat = 'festivals';
            break;

        case 'Clothing, Concession Voucher': case 'Gift Card': case 'Writer': case 'Speaker': case 'Award Show': case 'Charity/Benefit': case 'Convention': case 'Exhibit': case 'Expo': case 'Fan Experiences': case 'Sightseeing/Facility': case 'Swap Meet/Market': case 'Tour': case 'Touring Show/Production': case 'Donation': case 'Family': case 'Community/Cultural': case 'Community/Civic': case 'Special Interest/Hobby': case 'Amusement Park': case 'Aquarium': case 'Aquatic Park': case 'Club': case 'Campsite': case 'Ice Rink': case 'Museum': case 'Zoo': case 'Club Access':
            mainCat = 'community';
            break;

        case 'Party/Gala': case 'Dinner Packages': case 'Meal Package': case 'Food & Drink': case 'Meal Package':
            mainCat = 'eats-drinks';
            break;

        case 'Choir': case 'Chorus': case 'Actor': case 'Artist': case 'Character': case 'Choreographer': case 'Comedian': case 'Dancer': case 'Magician': case 'Performer': case 'Designer': case 'Director': case 'Comedy': case "Children's Theatre": case 'Circus & Specialty Acts': case 'Classical': case 'Comedy': case 'Cultural': case 'Dance': case 'Espectáculo': case 'Fashion': case 'Fine Art': case 'Magic & Illusion': case 'Miscellaneous': case 'Miscellaneous Theatre': case 'Multimedia': case 'Music': case 'Opera': case 'Performance Art': case 'Puppetry': case 'Spectacular': case 'Theatre': case 'Variety': case 'Arts & Theatre':
            mainCat = 'performing-arts';
            break;

        case 'Band': case 'Group': case 'Tribute Band': case 'Troupe': case 'Orchestra': case 'League': case 'Quartet': case 'Musician': case 'Singer/Vocalist': case 'Audio/Visual': case 'Concert': case 'Alternative': case 'Ballads/Romantic': case 'Blues': case 'Chanson Francaise': case "Children's Music": case 'Classical': case 'Country': case 'Dance/Electronic': case 'Folk': case 'Hip-Hop/Rap': case 'Holiday': case 'Jazz': case 'Latin': case 'Medieval/Renaissance': case 'Metal': case 'New Age': case 'Other': case 'Pop': case 'R&B': case 'Reggae': case 'Religious': case 'Rock': case 'Undefined': case 'World':
            mainCat = 'concerts';
            break;

        case 'Lecture/Seminar': case 'Graduation/Commencement': case 'Competition': case 'Student Festival': case 'Lecture/Seminar':
            mainCat = 'university-college';
            break;

        default:
            mainCat = '';
            break;

    }

    return mainCat;
}

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
        }
        else {
            let options = {
                method: 'GET',
                uri: `https://api.pexels.com/v1/search?query=${categoryToSend}&per_page=80&page=1`,
                headers: {
                    'Authorization': process.env.PEXELS_AUTHORIZATION_KEY
                }
            };

            await rp(options).then(async res => {
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
                        await Promise.resolve(imageIndex);
                        return imageIndex.src.original;
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            }).catch(error => {
                console.error(error);
                return null;
            });
        }
    } catch (error) {
        console.error(error);
        return null;
    }
};

// This function gets event from GPL
const getEvents = async (url) => {
    let options = {
        method: 'GET',
        uri: url,
        timeout: 20000
    }

    return rp(options).then(async (response) => {
        if (response) {
            response = JSON.parse(response);

            if (response && response._embedded && response._embedded.events && response._embedded.events.length) {

                let respEvent = response._embedded.events;

                let finalEvents = [];
                for (let eachResp of respEvent) {
                    let status_code = (eachResp.dates && eachResp.dates.status && eachResp.dates.status.code) ? eachResp.dates.status.code : '';
                    if(status_code == "onsale"){
                        if (eachResp && eachResp.classifications && eachResp.classifications.length) {
                            let category = '';
                            for (let classifications of eachResp.classifications) {
    
                                if (category == '' && classifications && classifications.segment && classifications.segment.name) {
                                    category = await findCategory(classifications.segment.name);
                                }
    
                                if (category == '' && classifications && classifications.genre && classifications.genre.name) {
                                    category = await findCategory(classifications.genre.name);
                                }
    
                                if (category == '' && classifications && classifications.subGenre && classifications.subGenre.name) {
                                    category = await findCategory(classifications.subGenre.name);
                                }
    
                                if (category == '' && classifications && classifications.type && classifications.type.name) {
                                    category = await findCategory(classifications.type.name);
                                }
    
                                if (category == '' && classifications && classifications.subType && classifications.subType.name) {
                                    category = await findCategory(classifications.subType.name);
                                }
    
                                if (category && category != '') {
    
                                    let eventImage = '';
                                    let websiteUrl = [];
                                    let address = [];
                                    let city = '';
                                    let state = '';
                                    let country = '';
                                    let location = [];
                                    let startDate;
                                    let endDate;
                                    let startDateUTC;
                                    let endDateUTC;
    
                                    if (eachResp && eachResp.images && eachResp.images.length) {
                                        eachResp.images.sort((a, b) => (a.width < b.width) ? 1 : ((b.width < a.width) ? -1 : 0))
    
                                        for (let image of eachResp.images) {
                                            if (image && image.url && image.url != '') {
                                                eventImage = image.url;
                                                break;
                                            }
                                        }
                                    }
    
                                    if (eventImage == '') {
                                        eventImage = await getImageFromPexel(category)
                                    }
    
                                    let timezone = (eachResp.dates && eachResp.dates.timezone) ? eachResp.dates.timezone : '';
                                    if (eachResp.dates.start && eachResp.dates.start.localDate && eachResp.dates.start && eachResp.dates.start.localTime) {
                                        startDate = eachResp.dates.start.localDate + ' ' + eachResp.dates.start.localTime;
                                    } else if (eachResp.dates.start && eachResp.dates.start.localDate) {
                                        startDate = eachResp.dates.start.localDate + ' 00:00:00';
                                    }
    
                                    if (startDate && startDate != '') {
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
    
                                    let description = eachResp.info ? eachResp.info : '';
                                    if (eachResp.pleaseNote) {
                                        description += "\n" + eachResp.pleaseNote
                                    }
    
                                    let venueAddress = `${address.join(', ')}`;
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
    
                                    finalEvents.push(eachEvent)
                                    break;
                                }
                            }
                        }
                    }
                }

                await invokeLambda(finalEvents);
            } else {
                return null;
            }
        } else {
            return null;
        }
    }).catch(error => {
        // console.error(error);
        return null;
    });
};

// function to invoke lambda to get events from Ticket Master
const invokeTicketMasterEventsLambda = async (event) => {
    try {
        if (event && event.lat && event.long) {
            let radius = 100;
            let unit = 'km';
            let size = 200;
            let startDateTime = moment.utc().add('1', 'days').format('YYYY-MM-DDTHH:mm:ss') + 'Z';
            let endDateTime = moment.utc().add('8', 'days').format('YYYY-MM-DDTHH:mm:ss') + 'Z';

            let url = `${process.env.TICKET_MASTER_EVENTS_BASE_URL}/discovery/v2/events.json?apikey=${process.env.TICKET_MASTER_KEY}&radius=${radius}&unit=${unit}&size=${size}&latlong=${event.lat},${event.long}&startDateTime=${startDateTime}&endDateTime=${endDateTime}`;
            await getEvents(url);
        }
    } catch (error) {
        // console.error(error);
    }
    return "Finished";
};

// This function is called every day to get events for major cities
module.exports.handler = (event, context, callback) => {
    dynamodb.scan({ TableName: 'topclites' }).promise().then((response) => {
        if (response && response.Count > 0) {
            let promises = [];

            let timeout = 0;
            response.Items.forEach((city) => {
                timeout += 2000;
                setTimeout(() => {
                    promises.push(invokeTicketMasterEventsLambda(city));
                }, timeout);
            });
            return Promise.all(promises);
        } else {
            return Promise.resolve(true);
        }
    }).then(() => {
        callback(null, "done");
    })
};
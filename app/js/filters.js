angular.module('PromoApp')
    .filter('dateRange', function() {
        return function(items, startDate, endDate, dateFormat, columnName) {
            var retArray = [];

            if (!dateFormat) {
                dateFormat = "YYYY-MM-DDTHH:mm:SS:sssZ";
            }

            if (!columnName) {
                columnName = 'end';
            }

            // Check if only start date
            if (startDate && !endDate) {
                angular.forEach(items, function(obj) {
                    var receivedDate = obj[columnName];
                    if (dateFormat && dateFormat == 'ms') {
                        if (receivedDate > startDate) {
                            retArray.push(obj);
                        }
                    } else if (moment(receivedDate, dateFormat).isAfter(startDate)) {
                        retArray.push(obj);
                    }
                });
                return retArray;
            } else if (!startDate && endDate) {
                angular.forEach(items, function(obj) {
                    var receivedDate = obj[columnName];
                    if (dateFormat && dateFormat == 'ms') {
                        if (receivedDate < endDate) {
                            retArray.push(obj);
                        }
                    } else if (moment(receivedDate, dateFormat).isBefore(endDate)) {
                        retArray.push(obj);
                    }
                });
                return retArray;
            } else if (!startDate && !endDate) {
                return items;
            } else {
                angular.forEach(items, function(obj) {
                    var receivedDate = obj[columnName];
                    if (dateFormat && dateFormat == 'ms') {
                        if (receivedDate > startDate && receivedDate < endDate) {
                            retArray.push(obj);
                        }
                    } else if (moment(receivedDate, dateFormat).isAfter(startDate) && moment(receivedDate).isBefore(endDate)) {
                        retArray.push(obj);
                    }
                });
                return retArray;
            }
        };
    })
    .filter('toMoment', function() {
        return function(date, dateFormat, utc) {
            if (date) {
                if (dateFormat) {
                    if (utc) {
                        return moment.utc(date, dateFormat);
                    } else {
                        return moment(date, dateFormat);
                    }
                } else {
                    if (utc) {
                        return moment.utc(date);
                    } else {
                        return moment(date);
                    }
                }
            }
            return date;
        };
    })
    .filter('timeDiff', function() {
        return function(dateInMsec) {
            if (dateInMsec) {
                let now = new Date().getTime();
                let difference = Math.floor((now - dateInMsec) / 1000);
                if (difference < 2) {
                    return 'Just now';
                }
                if (difference < 60) { // Seconds
                    return difference + ' seconds ago';
                }
                difference = Math.floor(difference / 60);
                if (difference < 60) { // minutes
                    return difference + ' minutes ago';
                }
                difference = Math.floor(difference / 60);
                if (difference < 60) { // hours
                    return difference + ' hours ago';
                }

                difference = Math.floor(difference / 24);
                if (difference < 30) { // days
                    return difference + ' days ago';
                }
                difference = Math.floor(difference / 30);
                return difference + ' months ago';

            } else {
                return dateInMsec;
            }
        };
    })
    .filter('unixFormatter', function() {
        let dateTime = "";
        return function(date) {
            if (date) {
                dateTime = date.slice(0, 10);
                date = moment.unix(dateTime).format("D/MM/YYYY hh:mma");
            }
            return date;
        };
    })
    .filter('momentTimeFormatter', function() {
        return function(time, value) {
            if (time && value === '12') {
                let timeFormat = moment(time, ["HH:mm"]).format("hh:mm A");
                return timeFormat;
            } else {
                let timeFormat = moment(time, ["hh:mm a"]).format("HH:mm");
                return timeFormat;
            }
        };
    })
    .filter("purger", function() {
        return function(info) {
            if (info) {
                return info.replace(/\W+(?!$)/g, '-');
            }
        };
    })
    .filter("removeDash", function() {
        return function(info) {
            if (info) {
                return info.replace(/-/g, ' ');
            }
        };
    })
    .filter('momentSubtract', function() {
        return function(date, amount) {
            if (date && amount) {
                let time = date.subtract({ minutes: amount });
                return time;
            }
            return date;
        };
    })
    .filter('momentFormatter', function() {
        return function(date, dateFormat) {
            if (date && dateFormat) {
                return date.format(dateFormat);
            }
            return date;
        };
    })
    .filter('breakLength', function() {
        return function(text, length) {

            if (text && length && text.length > parseInt(length)) {
                return text.substring(0, parseInt(length)) + '...';
            }
            return text;
        };
    })
    .filter('categorySort', function() {
        return function(items, category, $scope) {
            var retArray = [];

            if (!category || category.length == 0) {
                return items;
            } else if (category.length == 1) {
                angular.forEach(items, function(event) {
                    if (event.category != category) {
                        retArray.push(event);
                    }
                });
                return retArray;
            } else {
                angular.forEach(items, function(event) {
                    if (!category.includes(event.category)) {
                        retArray.push(event);
                    }
                });
                return retArray;
            }
        };
    })
    .filter('localSearchFilter', function() {
        return function(items, searchText) {
            var retArray = [];

            if (!searchText) {
                return items;
            } else {
                angular.forEach(items, function(event) {
                    if (event.event_name.toLowerCase().indexOf(searchText.toLowerCase()) != -1) {
                        retArray.push(event);
                    } else if (event.description) {
                        if (event.description.toLowerCase().indexOf(searchText.toLowerCase()) != -1) {
                            retArray.push(event);
                        }
                    }
                });
                return retArray;
            }
        };
    })
    .filter('start', function() {
        return function(input, start) {
            if (!input || !input.length) {
                return;
            }
            start = +start;
            return input.slice(start);
        };
    }).filter('unique', function() {
        // we will return a function which will take in a collection
        // and a keyname
        return function(collection, keyname) {
            // we define our output and keys array;
            var output = [],
                keys = [];

            // we utilize angular's foreach function
            // this takes in our original collection and an iterator function
            angular.forEach(collection, function(item) {
                // we check to see whether our object exists
                var key = item[keyname];
                // if it's not already part of our keys array
                if (keys.indexOf(key) === -1) {
                    // add it to our keys array
                    keys.push(key);
                    // push this item to our final output array
                    output.push(item);
                }
            });
            // return our array which should be devoid of
            // any duplicates
            return output;
        };
    })
    .filter('filterByField', function() {
        return function(input, fieldName) {
            return input.filter(function(item) {
                return item.groupName == fieldName;
            });
        };
    }).filter('trim', function() {
        return function(value) {
            if (!angular.isString(value)) {
                return value;
            }
            return value.replace(/^\s+|\s+$/g, ''); // you could use .trim, but it's not going to work in IE<9
        };
    }).filter('replacSpaceAndLowercase', function() {
        return function(text) {
            var str = text.replace(/\s+/g, '-');
            return str.toLowerCase();
        };
    }).filter('propsFilter', function() {
        return function(items, props) {
            var out = [];

            if (angular.isArray(items)) {
                var keys = Object.keys(props);

                items.forEach(function(item) {
                    var itemMatches = false;

                    for (var i = 0; i < keys.length; i++) {
                        var prop = keys[i];
                        var text = props[prop].toLowerCase();
                        if (item[prop] && item[prop].toString().toLowerCase().indexOf(text) !== -1) {
                            itemMatches = true;
                            break;
                        }
                    }

                    if (itemMatches) {
                        out.push(item);
                    }
                });
            } else {
                // Let the output be the input untouched
                out = items;
            }

            return out;
        };
    }).filter('reverse', function() {
        return function(items) {
            return items.slice().reverse();
        };
    }).filter('counter', [function() {
        return function(seconds) {
            return new Date(1970, 0, 1).setSeconds(seconds);
        };
    }]);
angular.module('PromoApp').factory('persistObject', function () {

    var persistObject = [];

    function set(objectName, data) {
        persistObject[objectName] = data;
    }

    function get(objectName) {
        return persistObject[objectName];
    }

    return {
        set: set,
        get: get
    };
});
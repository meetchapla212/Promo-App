angular.module('PromoApp')
    .controller('LoginModalController', ['$scope', 'authService', '$http', 'phqservice', '$filter', 'config', '$uibModal', 'qbService', '$location', 'persistObject', 'eventsService', 'followUser', '$rootScope', '$window','$route','Utils', function ($scope, authService, $http, phqservice, $filter, config, $uibModal, qbService, $location, persistObject, eventsService, followUser, $rootScope, $window,$route,Utils) {
        $scope.cancel = function () {
            this.$close();
        };

    }]);
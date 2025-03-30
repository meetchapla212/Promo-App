angular.module('PromoApp')
    .controller('mapModalController', ['$scope', '$uibModal','awsService', function ($scope, $uibModal,awsService) {
        $scope.cancel = function () {
           this.$dismiss('close');
        };


    }]);
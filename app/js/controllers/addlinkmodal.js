angular.module('PromoApp')
    .controller('addLinkModalController', ['$scope', '$uibModal','awsService', function ($scope, $uibModal,awsService) {
       
        $scope.forms = {
        };

        $scope.linkInfo={};
        $scope.cancel = function () {
           this.$dismiss('close');
        };

        $scope.save = function() {
            this.$close($scope.linkInfo);
        };
    }]);
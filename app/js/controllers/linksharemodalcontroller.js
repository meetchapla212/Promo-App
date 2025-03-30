angular.module('PromoApp')
    .controller('linkShareModalController', ['$scope', '$uibModal','config','awsService', function ($scope, $uibModal,config,awsService) {

        $scope.cancel = function () {
            if($scope.isCopied){
                this.$dismiss('shared');
            }else {
                this.$dismiss('close');
            }

        };

        $scope.linkShareCounter = function (item) {
            item.Action = "Copied";
        };

    }]);
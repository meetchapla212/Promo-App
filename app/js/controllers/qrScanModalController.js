angular.module('PromoApp')
    .controller('QrScanModalController', ['$scope', 'userService','authService','Utils',function ($scope,userService,authService,Utils) {
        $scope.close = function()
        {
            this.$close('close');
        };

        $scope.successful = false;

        $scope.init = () => {
            $scope.successful = false;
            if($scope.confirmSuccessful){
                $scope.successful = true;
            }
            Utils.applyChanges($scope);
        };

        $scope.init();
    }]);
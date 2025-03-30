angular.module('PromoApp')
    .controller('PromoHeaderController', ['$scope', 'authService', function ($scope, authService) {

        $scope.headerTemplate = 'partials/phase2/pre-login-header.html';

        $scope.checkIfUserLoggedIn = () => {
            $scope.user = authService.getUser();
            $scope.session = authService.getSession();
            if ($scope.user && $scope.session) {
                $scope.headerTemplate = 'partials/header.html';
            }
       };

       $scope.checkIfUserLoggedIn();
    }]);



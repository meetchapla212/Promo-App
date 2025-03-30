angular.module('PromoApp')
    .controller('locationmodalcontroller', ['$scope', '$uibModal', 'locationService', 'authService', function ($scope, $uibModal, locationService, authService) {

        $scope.isBanner = true;
        let isBannerCookie = authService.get('banner');
        $scope.addBannerCookie = () => {
            if (!isBannerCookie) {
                authService.put('banner', true);
            }
        };

        $scope.locationModalcancel = function () {
            // Changed this to close since it was giving warning
            this.$close();
        };

        $scope.cancel = function () {
            this.$close();
        };


        $scope.$watch('loct', function () {
            if ($scope.loct) {
                let location = {
                    lat: $scope.loct.lat,
                    lng: $scope.loct.long,
                    address: $scope.chosenPlace
                };
                $scope.$emit('locationModalClose', location);
                $scope.locationModalcancel();

            }
        });


        $scope.closeLocationDialog = (reset) => {
            //console.log('Close closeLocationDialog');
            if(reset){
                authService.remove('userCurrentLocation');
                $scope.$emit('locationModalClose', {"fetchLocation": true});
            }

            $scope.locationModalcancel();
        };

        $scope.fetchCityLocation = function (city) {
             let location = {
                    lat: city.lat,
                    lng: city.long,
                    address: city.address
            };
            $scope.$emit('locationModalClose', location);
            $scope.locationModalcancel();
        };




    }]);
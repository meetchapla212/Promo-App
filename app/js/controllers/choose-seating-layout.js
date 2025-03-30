angular.module('PromoApp')
    .controller('chooseSeatController', ['$scope', '$cookies', 'Utils', function($scope, $cookies, Utils) {
        $scope.is_layoutView = true;
        $scope.table = true;
        $scope.section = true;
        $scope.modalTitle = "Choose Seating Layout";
        $scope.totalCapacity = 0;
        let sectionTotal = 0;
        let tableTotal = 0;

        $scope.modalInput = {
            sectionRow: 5,
            perTable: 5,
            rowPerSection: 10,
            columnPerSection: 10,
            perTableSeats: 10
        };
        $scope.cancel = function() {
            this.$dismiss('close');
            $cookies.put('designMap', false);
        };

        $scope.$watch('modalInput.sectionRow', function() {
            if ($scope.modalInput.sectionRow == undefined) {
                $scope.modalInput.sectionRow = 0;
            }
            $scope.calSeatCapacity();
        });
        $scope.$watch('modalInput.rowPerSection', function() {
            if ($scope.modalInput.rowPerSection == undefined) {
                $scope.modalInput.rowPerSection = 0;
            }
            $scope.calSeatCapacity();
        });
        $scope.$watch('modalInput.columnPerSection', function() {
            if ($scope.modalInput.columnPerSection == undefined) {
                $scope.modalInput.columnPerSection = 0;
            }
            $scope.calSeatCapacity();
        });
        $scope.$watch('modalInput.perTable', function() {
            if ($scope.modalInput.perTable == undefined) {
                $scope.modalInput.perTable = 0;
            }
            $scope.calSeatCapacity();
        });
        $scope.$watch('modalInput.perTableSeats', function() {
            if ($scope.modalInput.perTableSeats == undefined) {
                $scope.modalInput.perTableSeats = 0;
            }
            $scope.calSeatCapacity();
        });

        $scope.calSeatCapacity = () => {
            if ($scope.section) {
                sectionTotal = parseInt($scope.modalInput.sectionRow) * (parseInt($scope.modalInput.rowPerSection) * parseInt($scope.modalInput.columnPerSection));
            } else {
                sectionTotal = 0;
            }
            if ($scope.table) {
                tableTotal = parseInt($scope.modalInput.perTable) * parseInt($scope.modalInput.perTableSeats);
            } else {
                tableTotal = 0;
            }
            $scope.totalCapacity = parseInt(sectionTotal) + parseInt(tableTotal);
            Utils.applyChanges($scope);
        };

        $scope.mixedSeating = function(value, preview) {
            if (value) {
                $scope.is_layoutView = false;
                if (preview == 'both') {
                    $scope.table = true;
                    $scope.section = true;
                    $scope.modalTitle = "Mixed Seating";
                    $scope.calSeatCapacity();
                } else if (preview == 'table') {
                    $scope.table = true;
                    $scope.section = false;
                    $scope.modalTitle = "Table Seating";
                    $scope.calSeatCapacity();
                } else if (preview == 'section') {
                    $scope.table = false;
                    $scope.section = true;
                    $scope.modalTitle = "Section Seating";
                    $scope.calSeatCapacity();
                }
            } else {
                $scope.is_layoutView = true;
            }
        };

        $scope.valueSelected = function(selectedValue) {
            if (selectedValue == 'pmStage') {
                if (angular.element('#pm_stage').is(':checked')) {
                    angular.element('#pm_stage').parent().removeClass('active_green');
                    angular.element('#pm_stage').attr('checked', false);
                } else {
                    angular.element('#pm_stage').parent().addClass('active_green');
                    angular.element('#pm_stage').attr('checked', true);
                }
            } else if (selectedValue == 'pmFoodCount') {
                if (angular.element('#pm_food_count').is(':checked')) {
                    angular.element('#pm_food_count').parent().removeClass('active_green');
                    angular.element('#pm_food_count').attr('checked', false);
                } else {
                    angular.element('#pm_food_count').parent().addClass('active_green');
                    angular.element('#pm_food_count').attr('checked', true);
                }
            } else if (selectedValue == 'pmExit') {
                if (angular.element('#pm_exit').is(':checked')) {
                    angular.element('#pm_exit').parent().removeClass('active_green');
                    angular.element('#pm_exit').attr('checked', false);
                } else {
                    angular.element('#pm_exit').parent().addClass('active_green');
                    angular.element('#pm_exit').attr('checked', true);
                }
            } else if (selectedValue == 'pmBar') {
                if (angular.element('#pm_bar').is(':checked')) {
                    angular.element('#pm_bar').parent().removeClass('active_green');
                    angular.element('#pm_bar').attr('checked', false);
                } else {
                    angular.element('#pm_bar').parent().addClass('active_green');
                    angular.element('#pm_bar').attr('checked', true);
                }
            } else if (selectedValue == 'pmRestrooms') {
                if (angular.element('#pm_restrooms').is(':checked')) {
                    angular.element('#pm_restrooms').parent().removeClass('active_green');
                    angular.element("#pm_restrooms").attr('checked', false);
                } else {
                    angular.element('#pm_restrooms').parent().addClass('active_green');
                    angular.element("#pm_restrooms").attr('checked', true);
                }
            }
        };
    }]);
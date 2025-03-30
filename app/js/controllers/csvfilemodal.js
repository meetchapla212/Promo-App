angular.module('PromoApp')
    .controller('csvFileController', ['$scope', 'followUser', 'awsService', 'Utils', function($scope, followUser, awsService, Utils) {

        $scope.forms = {};

        $scope.contacts = [];

        $scope.contactsResults = {
            total: 0,
            success: 0,
            error: 0
        };

        $scope.cancel = function() {
            this.$close();
        };

        $scope.data = { groupName: '' };

        $scope.save = function() {
            for (let s of $scope.contacts) {
                s.type = 'csv';
            }
            let data = {
                group: {
                    group_name: $scope.data.groupName,
                    members: $scope.contacts
                }
            };
            this.$close(data);
        };

        function csvToArray(csvString) {
            var lines = csvString.split('\n');
            var headerValues = lines[0].split(',');
            var dataValues = lines.splice(1).map(function(dataLine) { return dataLine.split(','); });
            return dataValues.map(function(rowValues) {
                let row = {};
                headerValues.forEach(function(headerValue, index) {
                    row[headerValue.trim()] = (index < rowValues.length) ? rowValues[index] : null;
                });
                return row;
            });
        }

        const validateRows = function(row) {
            if ('email' in row && row.email && 'name' in row && row.name) {
                // Check if valid email
                let pattern = new RegExp(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);
                return pattern.test(row.email);
            }
            return false;
        };

        // This function is called to read csv file
        const processCSVFile = function(content) {
            if (content) {
                content = content.replace('data:text/csv;base64,', '');
                content = content.replace('data:application/vnd.ms-excel;base64,', '');
                // console.log(content);
                content = atob(content);

                let rows = csvToArray(content);
                if (rows && rows.length > 0) {

                    $scope.contactsResults.total = rows.length;
                    $scope.contacts = [];
                    for (let row of rows) {
                        if (validateRows(row)) {
                            $scope.contacts.push(row);
                        }
                    }
                    $scope.contactsResults.success = $scope.contacts.length;
                    $scope.contactsResults.error = $scope.contactsResults.total - $scope.contacts.length;
                } else {
                    Utils.showError($scope, "No contacts to import");
                }
            }
        };

        // This function is called on selection of CSV file
        $scope.handleFileSelect = function(files, evt, invalidFiles) {
            let file = files;
            if (file) {
                let reader = new FileReader();
                reader.onload = function(evt) {
                    $scope.$apply(function($scope) {
                        let fileContent = evt.target.result;
                        processCSVFile(fileContent);
                    });
                };
                reader.readAsDataURL(file);
            } else if (invalidFiles.length > 0) {
                let err = invalidFiles.some(er => er.$error == "maxSize");
                if (err) {
                    Utils.showError($scope, "Your file size should not be larger than 10MB.");
                }
            }
        };
    }]);
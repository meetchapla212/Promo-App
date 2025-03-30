angular.module('PromoApp')
    .controller('LogoutController', ['$scope','lock',function ($scope,lock) {
       //console.log("Inside Logout Controller");

    $scope.logout = () => {
      $scope.loading = true;
      //console.log($scope.password);
   
        apiService.logout().then((response) => {
            if(response.status == 200){
                let data = response.data;
                if(data.success){
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: 'Logout successfully!',
                        timeout: 5000 //time in ms
                      };
                    $scope.$emit('notify', notify);
                    location.href = "/login";
                }else{
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: data.message,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    Utils.applyChanges($scope);
                }
                
            }else{
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: "Sorry something went wrong. Please try later.",
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
                Utils.applyChanges($scope);
            }
        })
        .catch(err => {
           /* let notify = {
                  type: 'error',
                  title: 'OOPS!!',
                  content: "Confirm password do not match.",
                  timeout: 5000 //time in ms
              };
            $scope.$emit('notify', notify);*/
        }).finally(() => {
            $scope.loading = false;
        });
       };
    }]);
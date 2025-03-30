angular.module('PromoApp').service('sessionService', ['authService', 'qbService', function (authService, qbService) {
    this.updateUser= function(user){
        return new Promise((resolve,reject)=>{
            qbService.getUser({filter: { field: 'id', param: 'in', value: [user.id] }})
                .then(res=>{
                    let usr=res.items[0].user;
                    if(usr.blob_id){
                        qbService.getContentFileUrl(usr.blob_id).then(url=>{
                            if(url){
                                usr.imgUrl=url;
                                authService.setUser(usr);
                                console.log('updation session ::',usr);
                                resolve(usr);
                            }}).catch(err=>{
                            console.log('fetching profile pic err ::',err);
                        });
                    }else{
                        usr.imgUrl='';
                        authService.setUser(usr);
                        console.log('updation session ::',usr);
                        resolve(usr);
                    }

                });
        });
    };
}]);
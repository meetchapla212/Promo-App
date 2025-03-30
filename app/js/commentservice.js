angular.module('PromoApp')
.service('commentService', ['qbService','eventsService','authService','apiService', function (qbService,eventsService,authService,apiService) {
    const className ='Comments';
    /**
     * 
     */
    this.createComment=(params)=>{
        
       // let finalResponse = null;
       let token = authService.get('token');
       return apiService.addComments(token,params).then((response) => {
            return response;
       });
       /* return qbService.getSession(session).then((res) => {
            return qbService.createData(className,data);
        }).then((res)=>{
            finalResponse = res;
            let data = {
              add_to_set:{
                  childReferences:res._id
              }
            };
            return eventsService.editEvent(res._parent_id,data,session);
        })
        .then(()=>{
            return Promise.resolve(finalResponse);
        }).catch((err)=>{
            console.log(err);
            return Promise.resolve(finalResponse);
        });*/

    };
    this.getComments=(event_id,page,limit)=>{
        let token = authService.get('token');
        return apiService.commentGet(token,event_id,page,limit).then((response) => {
            return response;
        });
        /*return qbService.getSession(session).then((res) => {
            return qbService.listTable(className,filter);
        });*/
    };

    this.getCommentUserImage = (id) => {
        return qbService.getContentFileUrl(id);
    };

    this.deleteComment = (comment_id) => {
        
        let finalResponse = null;
        let token = authService.get('token');
        return apiService.dltComment(token,comment_id).then((response) => {
            return response;
        });
/*        return qbService.getSession(session).then((res) => {
            return qbService.deleteById(className,id);
        }).then((res)=>{
              finalResponse = res;
              let data = {
                pull:{
                    childReferences:commentId
                }
              };
              return eventsService.editEvent(commentId,data,session)
                .catch((err)=>{
                    console.log(err);
                    return Promise.resolve(finalResponse);
                });
        })
        .then(()=>{
          return Promise.resolve(finalResponse);
        });*/
    };

}]);
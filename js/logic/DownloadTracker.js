
        // _RestApi.prototype.getClip = function (clipId, success_callback, failure_callback) {
        //     this.api_get("clips/" + clipId, { include: "proxyPath" }, success_callback, failure_callback);
        // };

var tracker = function(){
  var $catdv = catdv.RestApi;
  var downloadsField = "U12";
  var downloadedByField = "U13";
  var getDownloads = function(clipID, cb, fcb){
    $catdv.getClip(clipID, cb, fcb);
  }



}

$(document).on('click', '.field_MF a', function(event){
  alert("Download clicked!");
  console.log(event);
})
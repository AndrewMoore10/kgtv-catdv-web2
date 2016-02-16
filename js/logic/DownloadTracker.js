
        // _RestApi.prototype.getClip = function (clipId, success_callback, failure_callback) {
        //     this.api_get("clips/" + clipId, { include: "proxyPath" }, success_callback, failure_callback);
        // };

var tracker = function(){
  var $catdv = catdv.RestApi;
  var downloadsField = "U12";
  var downloadedByField = "U13";
  return {
    var updateDownloadCount = function(clipID, cb, fcb){
      $catdv.getClip(clipID, function(result){
        console.log(result);
        cb();
      }, fcb);
    }
  }


}

$(document).on('click', '.field_MF a', function(event){
  alert("Download clicked! " + getUrlParameter("id"));
  console.log(event);
  tracker.updateDownloadCount(getUrlParameter("id"),
    function(){ console.log("success"); },
    function(){ console.log("failed"); }
  )  
})

var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};
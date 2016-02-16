
        // _RestApi.prototype.getClip = function (clipId, success_callback, failure_callback) {
        //     this.api_get("clips/" + clipId, { include: "proxyPath" }, success_callback, failure_callback);
        // };

//         {
//     "ID": "3562",
//     "status": "updated via API 3 (0001)",
//     "userFields":{
//         "U6" : "Rattlesnake Kid"
//     }
// }

var $catdv = catdv.RestApi;

var downloadTracker = function(){
  var downloadsField = "U12";
  var downloadedByField = "U13";
  var functions = {
    updateDownloadCount : function(clipID, cb, fcb){
      $catdv.getClip(clipID, function(result){
        var downlaodCount = (result.userFields && result.userFields.U12 ? parseInt(result.userFields.U12) : 0);
        result.userFields.U12 = downlaodCount + 1;
        $catdv.saveClip(result, cb, fcb);
        console.log(result);
        // cb();
      }, fcb);
    }
  };
  return functions;
}
var tracker = downloadTracker();

$(document).on('click', '.field_MF a', function(event){
  alert("Download clicked! " + getUrlParameter("id"));
  console.log(tracker);
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
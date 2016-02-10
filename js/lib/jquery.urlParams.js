$.urlParam = function(name)
{    
	var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);    
	return ((results != null) && (results.length > 0) && (results[0] != null)) ? decodeURIComponent(results[1]) : null;
}
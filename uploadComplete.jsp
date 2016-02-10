<%@ taglib uri="/WEB-INF/catdv.tld" prefix="catdv"%>
<!DOCTYPE html/>
<html class="fullPage" lang="en">
<head>
<title>Upload Media File</title>
<catdv:pageheader >
<%@include file="headers.inc" %>
<script type="text/javascript">
	$(document).ready(function(){
		var errorMessage = $.urlParam("error");
		if(errorMessage)
		{
			  $("#heading").text("Upload Failed!");
			  $("#message").text(errorMessage);
		}
	});
    function btnOK_onClick()
    {
        self.close();
    }
</script>
</catdv:pageheader>
</head>
<body class="uploadPage">
    <div class="container">
	    <h2 id="heading">Upload Complete</h2>
	    <p id="message">
	       Your file has been uploaded and will be processed shortly.
	    </p>
    </div>
     <footer>
        <button id="btnOK" class="btn btn-primary" style="width:90px" onclick="btnOK_onClick()">OK</button>
    </footer>
</body>
</html>

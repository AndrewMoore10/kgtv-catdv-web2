<%@ taglib uri="/WEB-INF/catdv.tld" prefix="catdv"%>
<!DOCTYPE html/>
<html class="fullPage" lang="en">
<head>
<meta charset="utf-8">
<title>Upload Media File</title>
<catdv:pageheader >
<%@include file="headers.inc" %>
<script type="text/javascript">

	function btnOK_onClick()
	{
		if ($("#fileBrowser").val())
		{
			$("#btnOK").attr("disabled", true);
			var fwd = document.location.href.replace("simpleUpload.jsp","uploadComplete.jsp");
			$("#fwd").val(fwd);
			$("#formUpload").submit();
		}
		else
		{
			alert("You must select a file to upload");
		}
	}

	function btnCancel_onClick()
	{
		self.close();
	}
</script>
</catdv:pageheader>
</head>
<body class="uploadPage">
	<div class="container">
		<h2>Select media file to upload</h2>
		<form id="formUpload" method="POST" action="api/4/media" enctype="multipart/form-data">
			<table class="table">
				<tr><th>File:</th><td><input id="fileBrowser" name="fileBrowser" type="file" style="width:90%"></td></tr>
				<tr><th>Title:</th><td><input type="text" id="txtTitle" style="width: 20em" name="title"></td> </tr>
		        <tr valign="top"><th>Description:</th><td><textarea id="txtDescription" name="description" style="width: 20em"  rows="3"></textarea></td></tr>
			</table>
			<input type="hidden" id="fwd" name="fwd">
	   </form>
	</div>
    <footer>
		<button id="btnOK" class="btn btn-primary" style="width:90px" onclick="btnOK_onClick()">OK</button>
		<button id="btnCancel" class="btn btn-primary" style="width:90px" onclick="btnCancel_onClick()">Cancel</button>
    </footer>
</body>
</html>
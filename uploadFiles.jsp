<%@ taglib uri="/WEB-INF/catdv.tld" prefix="catdv"%>
<!DOCTYPE html>
<html class="fullPage" lang="en">
<head>
<meta charset="utf-8">
<title>CatDV: Server</title>

<catdv:pageheader pageScript="js/ui/UploadFilesPage.js" pageClass="ui.UploadFilesPage" loginPage="login.jsp" >
<%@include file="headers.inc" %>
</catdv:pageheader>
</head>

<body class="uploadPage" ondragover="return false;" >
	<div class="dropContainer">
		<div class="container">
			<div class="row">
					<div class="col-lg-12">
						<p>Drag files to the list and enter a short description or notes if required, then press Upload to submit them to the server for processing.<p>
					    <label for="txtNotes">Notes</label><br/>
						<textarea id="txtNotes" class="form-control" rows="3"></textarea>
						<div id="drop-files" ondragover="return false">
							<table class="table" id="tblFileList">
								<tr class="headerXX">
									<th>Name</th>
									<th>Size</th>
									<th class='status'>Status</th>
								</tr>
							</table>
					        <div id="lblDropFiles">Drop File(s) Here</div>
						</div>
					</div>		
				</div>
		</div>
	</div>
	<footer>
		    <!-- Add button is underneath a transparent input type=file control which actually catches the click. -->
		    <!-- This way user doesn't see ugly file path part of file control.  -->
			<div style="display: inline; position: relative; overflow: hidden;">
				<button id="btnAdd" class="btn btn-primary" style="width: 150px;">Add...</button>
				<input type="file" id="fileBrowser" name="upload" multiple="multiple" style="position: absolute; top: 0px; width: 150px; opacity: 0; filter:alpha(opacity: 0);" />
			</div>
	 		<button id="btnUpload" class="btn btn-primary" style="width: 150px" disabled="disabled">Upload Files</button>
			<button id="btnClose" class="btn btn-primary" style="width: 90px">Cancel</button>
	</footer>
	
</body>
</html>
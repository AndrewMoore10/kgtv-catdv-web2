<%@ taglib uri="/WEB-INF/catdv.tld" prefix="catdv"%>
<!DOCTYPE html>
<html class="fullPage" lang="en">
<head>
<meta charset="utf-8">
<title>CatDV: Server</title>

<!-- Enable DOM Event in QuickTime plugin in older versions of IE  -->
<object id="qt_event_source" classid="clsid:CB927D12-4FF7-4a9e-A169-56E4B8A75598" style="display: none" codebase="http://www.apple.com/qtactivex/qtplugin.cab#version=7,2,1,0"></object>

<catdv:pageheader pageScript="js/ui/ClipDetailsPage.js" pageClass="ui.ClipDetailsPage" loginPage="login.jsp">
	<%@include file="headers.inc"%>
	<script type="text/javascript" src="js/ui/panels/ClipMediaPanel.js"></script>
	<script type="text/javascript" src="js/ui/panels/ClipDetailsPanel.js"></script>
	<script type="text/javascript" src="js/ui/panels/EventMarkersPanel.js"></script>
</catdv:pageheader>

</head>
<body>
	<div class="clipViewPage fullPage">
		<header>
			<nav class="navbar navbar-default" role="navigation">
				<div class="navbar-header">
					<button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1">
						<span class="sr-only">Toggle navigation</span><span class="icon-bar"></span><span class="icon-bar"></span><span class="icon-bar"></span>
					</button>
					<a class="navbar-brand" href="default.jsp"></a>
				</div>
				<div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
<catdv:if isTrue="isEnterprise">
                    <ul id="navbarLoginMenu" class="nav navbar-nav navbar-right"></ul>
</catdv:if>
				</div>
			</nav>
		</header>

		<div class="content">
			<div class="row clearfix">
				<div class="col-md-12 column">
					<h1 id="clipHeading"></h1>
				</div>
			</div>
			<div class="row">
				<div class="col-sm-5 clearfix">
					<div id="playerContainer">
						<div id="clipMediaPanel"></div>
						<div id="playerControls"></div>
					</div>
					<div id='eventMarkersPanel'></div>
				</div>
				<div class="col-sm-7">
					<div id="clipDetailsPanel"></div>
				</div>
			</div>
		</div>

		<footer>
             <button id="editSeqBtn" class="btn btn-primary" style="display:none;"><span class="glyphicon glyphicon-pencil"> </span> Edit Sequence</button>
             <button id="clipSaveBtn" class="btn btn-primary"><span class="glyphicon glyphicon-ok"> </span> Save</button>
             <button id="clipCancelBtn" class="btn  btn-primary"><span class="glyphicon glyphicon-remove"> </span> Cancel</button>			
		</footer>
	</div>

    <div id="createSubclipDialog" style="display: none;" class="modal fade bs-modal-lg">
        <div class="modal-dialog  modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h4 class="modal-title">Create Sequence</h4>
                </div>
                <div class="modal-body">
                    <form role="form">
                        <div class="form-group">
                            <label for="txtSubclipName">Name:</label> <input id="txtSubclipName" class="form-control"></input>
                        </div>
                       <div class="form-group">
                            <label for=txtSubclipNotes>Notes:</label> <input id="txtSubclipNotes" class="form-control"></input>
                        </div>
                     </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-sm btn-primary" data-dismiss="modal">Cancel</button>
                    <button id="btnCreateSubclipDialogOK" class="btn btn-sm btn-primary">OK</button>
                </div>
            </div>
        </div>
    </div>

	<div id="addMarkerDialog" class="modal fade">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<button class="close" data-dismiss="modal">&times;</button>
					<h3 id="lblAddMarkerDialogTitle">Add Event Marker</h3>
				</div>
				<div class="modal-body">
                    <div class="form-group">
                        <label id="lblMarkerInfo"></label>
                    </div>
					<div class="form-group">
						<label for="txtName">Name:</label> <input id="txtName" class="form-control"></input>
					</div>
					<div class="form-group">
						<label for="txtComment">Comment:</label>
						<textarea id="txtComment" class="form-control" rows=4></textarea>
					</div>
				</div>
				<div class="modal-footer">
					<button class="btn btn-primary" data-dismiss="modal">Cancel</button>
					<button id="btnAddMarkerOK" class="btn btn-primary">OK</button>
				</div>
			</div>
		</div>
	</div>

	<div id="editMarkerDialog" class="modal fade">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<button class="close" data-dismiss="modal">&times;</button>
					<h3>Edit Event Marker</h3>
				</div>
				<div class="modal-body">
					<div class="form-group">
						<label for="txtNewName">Name:</label> <input id="txtNewName" class="form-control"></input>
					</div>
					<div class="form-group">
						<label for="txtNewComment">Comment:</label>
						<textarea id="txtNewComment" class="form-control" rows=4></textarea>
					</div>
				</div>
				<div class="modal-footer">
					<button class="btn btn-primary" data-dismiss="modal">Cancel</button>
					<button id="btnEditMarkerOK" class="btn btn-primary">OK</button>
				</div>
			</div>
		</div>
	</div>

</body>
</html>
<%@ taglib uri="/WEB-INF/catdv.tld" prefix="catdv"%>
<!DOCTYPE html>
<html class="fullPage" lang="en">
<head>
<meta charset="utf-8">
<title>CatDV: Server</title>

<catdv:pageheader pageScript="js/ui/DefaultPage.js" pageClass="ui.SearchPage" loginPage="login.jsp">
	<%@include file="headers.inc"%>
	<script type="text/javascript" src="js/ui/panels/NavigatorPanel.js"></script>
	<script type="text/javascript" src="js/ui/panels/ClipListPanel.js"></script>
	<script type="text/javascript" src="js/ui/panels/QueryBuilder.js"></script>
    <script type="text/javascript" src="js/ui/ServerCommandDialog.js"></script>
    <script type="text/javascript" src="js/logic/ServerPlugins.js"></script>
</catdv:pageheader>

</head>
<body>
	<div id="searchPage" class="fullPage">
		<div id="leftPanel">
			<div id="logo"></div>
			<div id="navigatorPanel"></div>
		</div>
		<div id="mainPanel">
			<header>
				<nav class="navbar navbar-default" role="navigation">
					<div class="navbar-header">
						<button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1">
							<span class="sr-only">Toggle navigation</span><span class="icon-bar"></span><span class="icon-bar"></span><span class="icon-bar"></span>
						</button>
					</div>

					<div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
<catdv:if isTrue="isEnterprise">
						<ul id="navbarLoginMenu" class="nav navbar-nav navbar-right"></ul>
</catdv:if>
                        <ul class="nav navbar-nav navbar-right">
                            <li><a href="#" id='btnFileUpload'>Upload Files</a></li>
                            <li id="menuServerCommands" class="dropdown" style="display:none;">
                                <a href="#" class="dropdown-toggle" data-toggle="dropdown">Tools<strong class="catdvicon catdvicon-pulldown_arrow"></strong></a>
                                <ul class="dropdown-menu"></ul>
                            </li>
                         </ul>
					</div>
				</nav>
			</header>

			<div class="content">
				<div id="clipListPanel"></div>
			</div>

			<footer>
                <button id="btnEditClips" class="btn btn-primary item-action">
                    <span class="glyphicon glyphicon-edit"> </span> Edit
                </button>
				<button id="btnCreateSequence" class="btn btn-primary item-action">
					<span class="glyphicon glyphicon-film"> </span> Create Sequence
				</button>
				<button id="btnDeleteClip" class="btn btn-primary item-action">
					<span class="glyphicon glyphicon-remove"> </span> Delete
				</button>
                <button id="btnFCPExport" class="btn btn-primary item-action">
                    <span class="glyphicon glyphicon-share"> </span> Export as XML
                </button>
			</footer>
		</div>
	</div>

	<div id="createSequenceDialog" style="display: none;" class="modal fade bs-modal-lg">
		<div class="modal-dialog  modal-lg">
			<div class="modal-content">
				<div class="modal-header">
					<h4 class="modal-title">Create Sequence</h4>
				</div>
				<div class="modal-body">
					<form role="form">
						<div class="form-group">
							<label for="txtName">Name:</label> <input id="txtSequenceName" class="form-control"></input>
						</div>
						<div class="radio">
							<label> <input type="radio" name="sequenceOptions" checked="checked" id="rdoUseSelection"> Use the selection within each clip.
							</label>
						</div>
						<div class="radio">
							<label> <input type="radio" name="sequenceOptions" id="rdoUseWholeClip"> Use the whole of each clip.
							</label>
						</div>
					</form>
				</div>
				<div class="modal-footer">
					<button class="btn btn-sm btn-primary" data-dismiss="modal">Cancel</button>
					<button id="btnCreateSequenceDialogOK" class="btn btn-sm btn-primary">OK</button>
				</div>
			</div>
		</div>
	</div>

<catdv:if isTrue="isEnterprise">
	<div id="smartFolderDialog" style="display: none;" class="modal fade bs-modal-lg">
		<div class="modal-dialog  modal-lg">
			<div class="modal-content">
				<div class="modal-header">
					<h4 id="lblSmartFolderName"></h4>
				</div>
				<div class="modal-body">
				    <div class="row">
                        <div class="form-group col-md-7">
                            <label for="txtName">Name:</label> <input id="txtSmartFolderName" type="text" class="form-control input-sm" placeholder="Smart Folder Name"></input>
				</div>
                        <div class="form-group col-md-5">
                            <label for="txtName">Group:</label> 
                            <select id="listGroups" class="form-control input-sm">
                            <catdv:get path="groups">
                                <option value="${group.ID}">${group.name}</option>
                            </catdv:get>
                            </select>
                        </div>
				    </div>
					<div id="smartFolderQueryBuilder"></div>
				</div>
				<div class="modal-footer">
					<button class="btn btn-sm btn-primary" data-dismiss="modal">Cancel</button>
					<button id="btnSmartFolderDialogOK" class="btn btn-sm btn-primary">OK</button>
				</div>
			</div>
		</div>
	</div>
</catdv:if>

	<div id="serverCommandArgsDialog" style="display: none;" class="modal fade bs-modal-lg">
		<div class="modal-dialog  modal-lg">
			<div class="modal-content">
				<div class="modal-header">
					<h4 id="svrCmdArgsDlg_lblTitle" class="modal-title"></h4>
				</div>
				<div id="svrCmdArgsDlg_divArguments" class="modal-body"></div>
				<div id="svrCmdArgsDlg_buttonPanel" class="modal-footer"></div>
			</div>
		</div>
	</div>

</body>
</html>
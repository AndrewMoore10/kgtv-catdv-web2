<%@ taglib uri="/WEB-INF/catdv.tld" prefix="catdv"%>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CatDV: Login</title>
<catdv:pageheader >
<%@include file="headers.inc"%>
<script type="text/javascript" src="js/lib/rsa.js"></script>
<script type="text/javascript">

    $(document).ready(function()
    {
        $("#btnSignIn").click(btnSignIn_onclick);
        $(document).keyup(function(event)
        {
            if (event.keyCode == 13)
            {
                $("#btnSignIn").click();
            }
        });
    });

    function btnSignIn_onclick()
    {
    	var $catdv = catdv.RestApi;

    	$catdv.getSessionKey(function(reply)
        {
            try
            {
                var username = $("input[name='txtUsername']").val();
                var password = $("input[name='txtPassword']").val();
                var encryptedPassword = encrypt(password, reply.key);

                $catdv.login(username, encryptedPassword, 
               		function()
	                {
	                    $.cookie("username", username);
	                    var fwd = $.urlParam("fwd");
	                    window.location.replace(fwd ? fwd : "default.jsp");
	                },
	                function(status, errorMessage)
	                {
	                    alert("Login Failed");
	                }
                );
            }
            catch (e)
            {
                alert(e);
            }
        });
    }
</script>
</catdv:pageheader>
</head>
<body>
	<div id="loginPage">
	    <header>
	        <div id="logo"></div>
	    </header>
	    <div class="container">
	        <div class="row">
	            <div class="col-md-6 col-md-offset-3">
					<div class="panel panel-default">
						<div class="panel-body">
	  	  				  <h1>Log In</h1>
	  	  				  <p>Please log in to search your CatDV Server assets.</p>
	  	  					<form class="form form-horizontal" role="form">
	  	  					  <div class="form-group">
	  	  					    <label for="txtUsername" class="col-sm-2 control-label">Username</label>
	  	  					    <div class="col-sm-10">
	  	  					      <input type="text" class="form-control" name="txtUsername" placeholder="User name">
	  	  					    </div>
	  	  					  </div>
	  	  					  <div class="form-group">
	  	  					    <label for="txtPassword" class="col-sm-2 control-label">Password</label>
	  	  					    <div class="col-sm-10">
	  	  					      <input type="password" class="form-control" name="txtPassword" placeholder="Password">
	  	  					    </div>
	  	  					  </div>
	  	  					  <div class="form-group">
	  	  					    <div class="col-sm-offset-2 col-sm-10">
	  	  					      <button type="button" class="btn btn-primary" id="btnSignIn">Sign in</button>
	  	  					    </div>
	  	  					  </div>
	  	  					</form>
						</div>			  
					</div>
	            </div>
	        </div>
	    </div>
	    <div id="version-info">
	       <catdv:get path="info">${info.version}</catdv:get>
	    </div>
	</div>
</body>
</html>
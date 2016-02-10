var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ui;
(function (ui) {
    var panels;
    (function (panels) {
        var Element = controls.Element;
        var $catdv = catdv.RestApi;
        var NavbarLoginMenu = (function (_super) {
            __extends(NavbarLoginMenu, _super);
            // element is empty <ul> in Bootrap-style NavBar 
            function NavbarLoginMenu(element) {
                _super.call(this, element);
                this.$element.html("<li id='loginLink'><a href='#'>Login</a></li>" + "<li id='userMenu' class='dropdown' style='display:none;'>" + "  <a href='#'class='dropdown-toggle' data-toggle='dropdown'>" + "    <span  id='loggedInUser'>User Name</span><strong class='catdvicon catdvicon-pulldown_arrow'></strong>" + "  </a>" + "  <ul class='dropdown-menu'>" + "      <li id='user-logOut'><a href='#' id='logoutLink'>Log out</a></li>" + "   </ul>" + "</li>");
                $("#loginLink").on("click", function (evt) {
                    window.location.href = 'login.jsp';
                });
                $("#logoutLink").on("click", function (evt) {
                    $.cookie("username", null);
                    $catdv.logout(function (reply) {
                        window.location.reload();
                    });
                });
                var loggedInUser = $.cookie("username");
                if (loggedInUser) {
                    $("#loggedInUser").text(loggedInUser);
                    $("#loginLink").hide();
                    $("#userMenu").show();
                }
                else {
                    $("#loginLink").show();
                    $("#userMenu").hide();
                }
                //            $("#basketLink").mouseenter(function(e)
                //            {
                //                $("#basketIcon").popover(
                //                    {
                //                        title: "Basket Items",
                //                        html: true,
                //                        content: "<ol id='basketItems'></ol>",
                //                        placement: "bottom",
                //                        container: "body",
                //                        trigger: "manual"
                //                    });
                //                $("#basketIcon").popover("show");
                //
                //                $catdv.getBasketItems(function(basketItems)
                //                {
                //                    $("#basketItems").empty();
                //                    if (basketItems.length > 0)
                //                    {
                //                        basketItems.forEach((basketItem) =>
                //                        {
                //                            $("<li>").appendTo("#basketItems").text(basketItem.clipName);
                //                        });
                //                    }
                //                });
                //            });
                //
                //            $("#basketLink").mouseleave(function(e)
                //            {
                //                $("#basketIcon").popover("hide");
                //            });
            }
            return NavbarLoginMenu;
        })(Element);
        panels.NavbarLoginMenu = NavbarLoginMenu;
    })(panels = ui.panels || (ui.panels = {}));
})(ui || (ui = {}));

module ui.panels
{
    import Element = controls.Element;

    import $catdv = catdv.RestApi;

    export class NavbarLoginMenu extends Element
    {
        // element is empty <ul> in Bootrap-style NavBar 
        constructor(element)
        {
            super(element);


            this.$element.html(
                "<li id='loginLink'><a href='#'>Login</a></li>" +
                "<li id='userMenu' class='dropdown' style='display:none;'>" +
                "  <a href='#'class='dropdown-toggle' data-toggle='dropdown'>" +
                "    <span  id='loggedInUser'>User Name</span><strong class='catdvicon catdvicon-pulldown_arrow'></strong>" +
                "  </a>" +
                "  <ul class='dropdown-menu'>" +
                "      <li id='user-logOut'><a href='#' id='logoutLink'>Log out</a></li>" +
                "   </ul>" +
                "</li>"
                );

            $("#loginLink").on("click", (evt) => { window.location.href = 'login.jsp'; });
            $("#logoutLink").on("click", (evt) =>
            {
                $.cookie("username", null);
                $catdv.logout(function(reply)
                {
                    window.location.reload();
                });
            });

            var loggedInUser = $.cookie("username");
            if (loggedInUser)
            {
                $("#loggedInUser").text(loggedInUser);
                $("#loginLink").hide();
                $("#userMenu").show();
            }
            else
            {
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

        //        public update_basketLink(numBasketItems)
        //        {
        //            if (numBasketItems)
        //            {
        //                $("#lblBasketContents").text((numBasketItems > 0 ? " (" + numBasketItems + " items)" : " (empty)"));
        //            }
        //            else
        //            {
        //                $catdv.getNumBasketItems(function(count)
        //                {
        //                    $("#lblBasketContents").text((count > 0 ? " (" + count + " items)" : " (empty)"));
        //                });
        //            }
        //        }

    }
}
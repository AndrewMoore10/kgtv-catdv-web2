Theme Support
=============

The CatDV Web 2 interface supports skinning through switchable CSS themes.

This folder contains some example themes, which are contained in separate directories where the folder name determines the theme name. 
There is also a 'common' folder that contain files common to all the themes.

There are three sample themes

default - the default light coloured theme
dark - a dark theme with light text
custom - an example of a custom colour scheme.

Each theme folder is laid out as follows:

css
  - theme.css            - Generated CSS stylesheet for this theme
img
  - login_bg.png         - Background image shown on the log in page
  - logo-large.png       - Large branding image used on front page
  - logo-small.png       - Smaller branding image used on other pages. 
  - filmstrip_hole.png   - Image used as the sprocket holes in the filmstrip view
  

Selecting a Theme
=================

The Web 2 interface reads the name of the theme to use from the 'web2client.theme' variable, that can be set in the Other field on the Server Config page
of the CatDV Server Control Panel. A server restart is required for the change to take effect.


Custom Themes
=============

CatDV Web 2 themes are implemented using LESS (http://lesscss.org). The LESS source code can be found in the src/themes folder.

The src/themes folder contina the following sub-folders

bootstrap-3.2.0 - Unmodified copy of the LESS source code of the Twitter Bootstrap CSS library on which CatDV themes are based.
catdv           - LESS source code for the CatDV-specific styles

theme-default |
theme-dark    | - these folders contain the source for each of the three sample themes.
theme-custom  |

Each theme folder contains three files

theme.less     - Main file for the theme. References (via include statements) all the source files that make up the theme.
fonts.less     - Defines the fonts used by the theme (included in theme.less)
variables.less - Defines values for all the LESS variables used in the theme.


Creating a New Theme
--------------------
To create a new theme copy one of the existing theme source folders to a new source folder called theme-xxx where xxx is the name of your theme, and
copy one of the exsting theme folders (default, dark or custom) to a new folder called just 'xxx' to hold the generated theme.

In most cases it will only be necessary to edit the values in 'variables.less' to create your new theme, as they give you control over the colors of 
all the UI elements using in the interface. However, for more radical changes you can also override styles defined in bootstrap and catdv by
adding new definitions directly into theme.less.

After editing the variables file you then need to compile the LESS source files into CSS. This is achieved using the LESS compiler lessc. Please
refer to (http://lesscss.org/#using-less-command-line-usage) for more details on using the less compiler. You should arrange for the generated theme.css
file to be generated into the appropriate theme folder.

You may also wish to provide your own customised versions of the image files for the logo and login screen background.

Once you have compiled your new theme you simply need to set the web2client.theme variable to the name of your theme and restart the server.









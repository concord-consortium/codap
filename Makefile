#
# SlickGrid library maintenance
#
# The following section is designed to help with synchronizing to the SlickGrid
# repository. The SlickGrid repository is a submodule of the DG git repository
# that lives in the frameworks folder. We use this section of the Makefile to
# (1) copy the necessary files from the SlickGrid repository into the project
# so that we get all of the files we need and only the files we need and (2)
# run the CSS files through sed to make any local modifications that we don't
# want to make in the repository files themselves (e.g. url(...) to static_url(...)).
#
# The working model here is that whenever the SlickGrid submodule is updated,
# a "make slickgrid" will copy the updated files into the project appropriately.
# This assumes that the JavaScript files will be merged as part of the git pull
# operation, since the JavaScript files have been changed in the submodule.
# The CSS files, however, make less sense to be changed in the SlickGrid submodule,
# so they are modified using a sed script when they are copied to the DG project.
# Meanwhile, other necessary resource files like images are simply copied.
#
# Note that as a result of this system, the SlickGrid files in the DG project should
# not generally be edited directly except for debugging/active development. To commit
# changes to the SlickGrid files, the changes should be made in the SlickGrid submodule
# repository (for JavaScript file changes) or via the process-slickgrid-css.sed command
# file for CSS file changes. The "make slickgrid" should not be used when there are
# local modifications to any of the SlickGrid files in the workspace, because there
# is the potential for such changes to be wiped out by the file copying done by the
# Makefile. This should only be a problem, however, when there are updated files in
# the SlickGrid repository and local changes to those files in the DG workspace.

# Set SG_DST_BASE to [test|apps] for [testing|deploying] the script
SG_DST_BASE = apps

# SlickGrid JavaScript files
SG_JS_SRC_DIR = frameworks/slickgrid
SG_JS_DST_DIR = $(SG_DST_BASE)/dg/libraries/slickgrid
SLICKGRID_JS = slick.core.js slick.grid.js slick.dataview.js \
               slick.editors.js slick.groupitemmetadataprovider.js \
               plugins/slick.headermenu.js plugins/slick.rowselectionmodel.js
SLICKGRID_JS_TARGET = $(addprefix $(SG_JS_DST_DIR)/,$(SLICKGRID_JS))

# SlickGrid CSS files
SG_CSS_SRC_DIR = frameworks/slickgrid
SG_CSS_DST_DIR = $(SG_DST_BASE)/dg/resources/slickgrid
SLICKGRID_CSS = slick.grid.css \
                css/smoothness/jquery-ui-1.8.16.custom.css \
                examples/slick-default-theme.css \
                plugins/slick.headermenu.css
SLICKGRID_CSS_TARGET = $(addprefix $(SG_CSS_DST_DIR)/,$(SLICKGRID_CSS))

# All of the PNG images associated with the jquery-ui CSS file used by SlickGrid
SG_PNG_SRC_DIR = frameworks/slickgrid/css/smoothness/images
SG_PNG_DST_DIR = $(SG_DST_BASE)/dg/resources/slickgrid/css/smoothness/images
SLICKGRID_PNG = $(notdir $(wildcard $(SG_PNG_SRC_DIR)/*.png))
SLICKGRID_PNG_TARGET = $(addprefix $(SG_PNG_DST_DIR)/,$(SLICKGRID_PNG))

# SlickGrid GIF files
SG_GIF_SRC_DIR = frameworks/slickgrid/images
SG_GIF_DST_DIR = $(SG_DST_BASE)/dg/resources/slickgrid/images
SLICKGRID_GIF = collapse.gif expand.gif down.gif sort-asc.gif sort-desc.gif \
                header-columns-bg.gif header-columns-over-bg.gif
SLICKGRID_GIF_TARGET = $(addprefix $(SG_GIF_DST_DIR)/,$(SLICKGRID_GIF))

# SlickGrid target depends on all of its constituent files
slickgrid: $(SLICKGRID_JS_TARGET) $(SLICKGRID_CSS_TARGET) \
           $(SLICKGRID_PNG_TARGET) $(SLICKGRID_GIF_TARGET)

# JavaScript files are simply copied
# Specify $(SG_JS_DST_DIR) as order-only prerequisite so it gets created if necessary
$(SG_JS_DST_DIR)/%.js : $(SG_JS_SRC_DIR)/%.js | $(SG_JS_DST_DIR)
	cp $< $@

# Use sed to convert url(path/to/file.ext) to static_url('path/to/file.ext'), etc.
# Specify $(SG_CSS_DST_DIR) as order-only prerequisite so it gets created if necessary
$(SG_CSS_DST_DIR)/%.css : $(SG_CSS_SRC_DIR)/%.css | $(SG_CSS_DST_DIR)
	sed -f bin/process-slickgrid-css.sed $< > $@

# PNG files are simply copied
# Specify $(SG_PNG_DST_DIR) as order-only prerequisite so it gets created if necessary
$(SG_PNG_DST_DIR)/%.png : $(SG_PNG_SRC_DIR)/%.png | $(SG_PNG_DST_DIR)
	cp $< $@

# GIF files are simply copied
# Specify $(SG_GIF_DST_DIR) as order-only prerequisite so it gets created if necessary
$(SG_GIF_DST_DIR)/%.gif : $(SG_GIF_SRC_DIR)/%.gif | $(SG_GIF_DST_DIR)
	cp $< $@

# Make the necessary slickgrid JavaScript directories
$(SG_JS_DST_DIR) :
	mkdir -p $@
	mkdir -p $@/plugins

# Make the necessary slickgrid CSS directories
$(SG_CSS_DST_DIR) :
	mkdir -p $@
	mkdir -p $@/css
	mkdir -p $@/css/smoothness
	mkdir -p $@/examples
	mkdir -p $@/plugins

# Make the necessary slickgrid PNG directories
$(SG_PNG_DST_DIR) :
	mkdir -p $@

# Make the necessary slickgrid GIF directories
$(SG_GIF_DST_DIR) :
	mkdir -p $@

jslint:
	find apps/dg \( -not -path \*libraries\* \) -and \( -name \*.js \) -print -exec bin/jslint.sh '{}' \;
jslint-deploy:
	find apps/dg \( -not -path \*libraries\* \) -and \( -name \*.js \) -print -exec bin/jslint-deploy.sh '{}' \;
jslint-git:
	bin/jslint-git.sh

jshint:
	find apps/dg \( -not -path \*libraries\* \) -and \( -name \*.js \) -print -exec bin/jshint.sh '{}' \;
jshint-git:
	bin/jshint-git.sh

# This sed command file is intended to simplify the process of syncing to the
# SlickGrid repository as a submodule. As of March 2013, the DG git repository includes
# a KCPT fork of the SlickGrid repository (kcpt/SlickGrid) as a submodule. Changes
# that we make to files in the SlickGrid repository are therefore public, and we will
# be able to issue pull requests for changes of ours that could make sense to provide
# back to the master SlickGrid repository. Our CSS file changes, however, are not like
# most of our other source file changes, because they will never make sense to provide
# back to the master repository. They are more like DG style preferences. Therefore,
# rather than make changes to our fork of the SlickGrid repository directly, we use
# these sed commands to make the necessary changes to the SlickGrid CSS files in the
# process of copying them from the SlickGrid repository folder to the DG resources
# folder. The application of these changes is automated in the DG Makefile via the
# "make slickgrid" target of the Makefile, which also handles copying the relevant
# JavaScript files into the project.

# slick-default-theme.css uses parent directory references (i.e. ..) in its url
# paths which apparently aren't handled properly by SproutCore's build tools.
# replace url('../images/image.gif') with url('slickgrid/images/image.gif')
s/url(['"]\.\.\(\/images\/.*\)['"])/url('slickgrid\1')/g
# replace url('../images/image.gif') with url('slickgrid/images/image.gif')
s/url(\.\.\(\/images\/[^)]*\))/url('slickgrid\1')/g

# All url() references in CSS files must be converted to static_url()
# replace url('path/to/file.ext') with static_url('path/to/file.ext')
s/url(\(['"].*['"]\))/static_url(\1)/g
# replace url(path/to/file.ext) with static_url('path/to/file.ext')
s/url(\([^'")]*\))/static_url('\1')/g

# comment out the active cell style since it's not relevant to Data Games
/.slick-cell.active/i\
/* [KCPT] KHS 2012-10-26 \
Disable "active" cell highlighting since we don't currently use the active cell in DG. 

/.slick-cell.active/,/}/s|}|} */|

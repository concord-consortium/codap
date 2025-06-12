# ===========================================================================
# Project:   DG
# Copyright: ©2014 Concord Consortium
# ===========================================================================

# Add initial buildfile information here
# SproutCore 1.5.pre.5 requires explicit ace reference.
# (cf. https://github.com/sproutit/sproutcore-abbot/issues#issue/35)
config :all, :required => [:sproutcore, 'sproutcore/ace'], :theme => 'sproutcore/ace'
# config :all, :required => [:sproutcore]
# config :all, :serve_public => 1

# When building dg, use the 
config :dg,
       :title => 'CODAP',
       :css_theme => 'ace.dg',
       :layout => 'dg:lib/index.rhtml',
       :manifest => 'manifest.webmanifest',
       :bootstrap => 'build/codap-lib-bundle.js.ignore'

# Production build (e.g. sc-build, make deploy) configuration
mode :production do
  config :dg,
         :enable_google_analytics => true,
         :enable_config_file => true
end

# Debug build (e.g. sc-server) configuration
mode :debug do
  config :dg ,
         :google_analytics_id => nil,
         :preferred_language => 'en' # language for sc-server can be changed here
end

# proxy for local dev.
#proxy '/DataGames', :to => 'dg.ccssgames.com'
#proxy '/examples', :to => 'localhost:80'
# Dev version of sage defaults to localhost, port 8080
#proxy '/sage', :to => '127.0.0.1:8080', :url => '/'
#proxy '/codap-data-interactives', :to => 'localhost:80', :url => '/~jsandoe/codap-data-interactives'
#
# Uncomment the following line and replace the values for ':to' and ':url'
# with the web location of your developer instance of the codap extensions directory
# see developer notes: https://github.com/concord-consortium/codap/wiki/Developer-Guide
#proxy '/extn', :to => 'localhost:80', :url => '/some/path'
proxy '/extn', :to => 'codap-server.concord.org:80', :url => '/releases/latest/extn'

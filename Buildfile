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
       :layout => 'dg:lib/index.rhtml'

# Production build (e.g. sc-build, make deploy) configuration
mode :production do
  config :dg,
         :enable_google_analytics => true
end

# Debug build (e.g. sc-server) configuration
mode :debug do
  config :dg ,
         :google_analytics_id => nil
end

# proxy for local dev.
proxy '/DataGames', :to => 'dg.ccssgames.com'
#proxy '/examples', :to => 'localhost:80'

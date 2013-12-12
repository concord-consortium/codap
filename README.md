codap -- Common Online Data Analysis Platform
=============================================

The CODAP (Common Online Data Analysis Platform) software was developed through the Data Games project,
a collaboration between the Scientific Reasoning Research Institute at the University of Massachusetts at Amherst,
and KCP Technologies, a McGraw-Hill Education Company, in San Francisco, CA.

[Data Games](http://play.ccssgames.com/) is a set of games and supporting materials that engage students
in developing mathematics and data analysis skills. The Data Games software was developed through a grant
from the National Science Foundation (NSF) under:

* KCP Technologies Award ID: 0918735
* UMass Amherst Award ID: 0918653

Grant period: September 1, 2009 through August 31, 2012  
Title: Data Games: Tools and Materials for Learning Data Modeling  

Any opinions, findings, and conclusions or recommendations expressed in this material are those of the authors
and do not necessarily reflect the views of the National Science Foundation.

The Data Games client-side software is provided here under an open-source Apache 2.0 license.
For details on this license, please see the LICENSE file included with this repository
or http://www.apache.org/licenses/LICENSE-2.0.html. 

The data analysis within Data Games is based in part on
[Fathom® Dynamic Data](http://www.keycurriculum.com/products/fathom) software and
[Tinkerplots® Dynamic Data Exploration](http://www.keycurriculum.com/products/tinkerplots) software,
which feature more data analysis functionality than is currently provided in Data Games.
For more information about these widely used and highly acclaimed software products,
please visit http://keycurriculum.com.

We plan to further develop the Data Games client-side software through a new NSF-funded grant called CODAP (Common Online Data Analysis Platform), beginning in 2014. The CODAP Award ID # is: 1316728.

We encourage collaboration and feedback, and in the future aim to facilitate an active thriving community in using and contributing to this educational data analysis software.

## Developing with the CODAP Open Source Repository ##

## Setting Up the Development Environment ##

### Development Pre-requisites ###

#### Ruby 1.9.2+ ####

SproutCore requires Ruby 1.9.2+ for its build tools. Mac OS X versions up to 10.8 shipped with Ruby 1.8.7. (OS X version 10.9 apparently includes Ruby 2.0.) The easiest way to install newer Ruby versions is to use rvm, the Ruby Version Manager. Using rvm to install Ruby, in turn, requires the presence of Xcode and its command line tools on Mac OS X. Thus, upgrading to Ruby 1.9.2+ may require the following:

  * [Mac OS X] Make sure that Xcode and its command line tools are installed
    * Xcode 3 installs command line tools by default
    * Xcode 4+ require a separate install of the command line tools
  * [Install rvm](https://rvm.io/rvm/install)
  * Use rvm to install Ruby 1.9.3

<pre><code>$ rvm install 1.9.3</code></pre>

#### SproutCore 1.9.2 ####

    $ gem install sproutcore -v 1.9.2

## Get the CODAP Source ##

To clone the CODAP repository itself:

    $ git clone https://github.com/kcpt/codap.git
    $ cd codap
    $ git submodule update --init --recursive

To work with the CODAP repository it is often useful to fork it on Github and then clone the fork.

## Run the CODAP Application Locally ##

    $ sc-server

This runs the [SproutCore server](http://guides.sproutcore.com/build_tools.html#developing-with-sproutcore-sproutcore-server), which serves the application code locally. To run the application, enter the following URL into your web browser of choice: [http://localhost:4020/dg](http://localhost:4020/dg).

This should run the CODAP application and bring up the login dialog.

## Configure CODAP Login ##

By default, the CODAP application proxies to http://dg.kcptech.com. Guest access is available, but a user account is required to be able to save and restore documents. It's free to [create a user account](http://play.ccssgames.com/user/register), if desired.

## Modifying the CODAP Source ##

Most changes to the CODAP application source are automatically reflected by simply reloading the browser page at [http://localhost:4020/dg](http://localhost:4020/dg). More extensive changes (e.g. adding/removing source files) may require stopping and restarting **sc-server** and/or removing the generated **tmp** folder.

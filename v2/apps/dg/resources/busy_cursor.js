// ==========================================================================
//                              DG.busyCursor
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================

DG.busyCursor = SC.Object.create({

  cover: null,
  invocations: 0,

  /**
   * During lengthy processes, we cover up the entire document with an element whose cursor is a busy cursor.
   */
  show: function( iFunction) {
    var invocation = function() {
      this.invocations++;
      iFunction();
      this.hide();
    }.bind( this);

    var tMainPane = DG.getPath('mainPage.mainPane'),
        tCover = this.get('cover');
    if( !tCover) {
      tCover = SC.View.create( {
        classNames: ['dg-busy-cover'],
        isVisible: false
      });
      this.set('cover', tCover);
      tMainPane.appendChild( tCover);
    }
    tCover.set('isVisible', true);
    this.invokeLater(invocation, 10);
    SC.run( function() {
      SC.Event.trigger(DG.mainPage.mainPane.$()[0], 'mousemove');
      //SC.Event.simulateEvent( DG.mainPage.mainPane.$()[0], 'mousemove');
    }, this, true /* start a new run loop */);
  },

  /**
   * Uncover so regular cursors can show
   */
  hide: function() {
    this.invocations--;
    if( this.invocations <= 0) {
      var tCover = this.get('cover');
      if (tCover)
        tCover.set('isVisible', false);
    }
  }

});



// ==========================================================================
//                                DG.sounds
// 
//  A collection of utilities for working with sound embodied in a single global object
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
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

DG.sounds = SC.Object.extend( {

  sounds: {
    create: { path: static_url('sounds/create.wav') },
    drag: { path: static_url('sounds/drag.wav') },
    mixup: { path: static_url('sounds/mixup.wav') }
  },

  init: function() {
    sc_super();
    
    //this.initAudio();
  },
  
  /**
    This function creates an Audio object for every sound as a means of
    preloading the sound so that the first time it is played it doesn't
    appear to lag the event it corresponds to. Unfortunately, preloading
    led to problems on some browsers so we've disabled both the preloading
    and the playing of sounds until further investigation has occurred.
   */
  initAudio: function() {
    var name, sound;
    for( name in this.sounds) {
      if( this.sounds.hasOwnProperty( name)) {
        sound = this.sounds[name];
        if( sound && sound.path && !sound.audio)
          sound.audio = new Audio( sound.path);
      }
    }
  },

  /**
   *
   * @param iName - {String}
   */
  playSound: function( iName) {
    var sound = this.sounds[iName];
    
    // Without preloading, sounds would lag the first time they were played.
    // With preloading (see initAudio()) we crashed on certain browsers.
    // For now, we disable audio completely, but leave the implementation
    // in place for further testing/development down the road.
    if( true) // eslint-disable-line no-constant-condition
      return;
    
    if( sound && sound.path && !sound.audio)
      sound.audio = new Audio( sound.path);
    
    if( sound.audio) {
      // See http://stackoverflow.com/questions/8733330/why-cant-i-play-sounds-more-than-once-using-html5-audio-tag
      // and http://stackoverflow.com/questions/2702343/html5-audio-plays-only-once-in-my-javascript-code
      // for details on the browser-specific issues in playing sounds.
      if (window.chrome)
        sound.audio.load();
      else
        sound.audio.currentTime = 0;
      sound.audio.play();
    }
  },

  playMixup: function() {
    this.playSound( 'mixup');
  },

  playCreate: function() {
    this.playSound( 'create');
  },

  playDrag: function() {
    this.playSound( 'drag');
  }
}).create();

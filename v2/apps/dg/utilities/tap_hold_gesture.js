/**
  ## What is a "tapHold"?

  A tapHold is a tap gesture that is held for an extended time (default: 500 ms) with little movement.
  Again, to be considered a tap, there should be very little movement of any touches on either axis
  while still touching. The amount of movement allowed is defined by `tapWiggle`.

  @class
  @extends SC.TapGesture
*/
DG.TapHoldGesture = SC.TapGesture.extend(
  /** @scope DG.TapHoldGesture.prototype */{

  /** @private The touch that started the timer. */
  _sc_timerStartTouch: null,

  /**
    @type String
    @default "tapHold"
    @readOnly
  */
 name: "tapHold",

 /**
    The amount of time in milliseconds after the first touch starts at which, *if the tap hasn't
    ended in that time*, the `tapStart` event should trigger.

    Because taps may be very short or because movement of the touch may invalidate a tap gesture
    entirely, you generally won't want to update the state of the view immediately when a touch
    starts.

    @type Number
    @default 500
    */
   tapStartDelay: 500,

  /** @private Triggers the tapStart event. Should *not* be reachable unless the tap is still valid. */
  _sc_triggerTapStart: function () {
    // Trigger the gesture, 'tapStart'.
    this.start(this._sc_timerStartTouch);
    // // Trigger the gesture, 'tap'.
    this.trigger(this._sc_timerStartTouch, this._sc_numberOfTouches);

    this._sc_isTapping = true;
  },

  /**
    Registers when the first touch started.

    @param {SC.Touch} touch The touch that started the session.
    @returns {void}
    @see SC.Gesture#touchSessionStarted
    */
   touchSessionStarted: function (touch) {
    sc_super();
    this._sc_timerStartTouch = touch;
  },

  /**
    Cleans up all touch session variables and triggers the gesture.

    @returns {void}
    @see SC.Gesture#touchSessionEnded
    */
  touchSessionEnded: function () {
    // Trigger the gesture, 'tap'.
    // this.trigger(this._sc_timerStartTouch, this._sc_numberOfTouches);

    // Clean up (will fire tapEnd if _sc_isTapping is true).
    this._sc_cleanUpTouchSession(false);
  }

});

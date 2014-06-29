function TapRecognizer() {
    Recognizer.apply(this, arguments);

    // previous time and center,
    // used for tap counting
    this.pTime = false;
    this.pCenter = false;

    this._timer = null;
    this._input = null;
    this.count = 0;
}

inherit(TapRecognizer, Recognizer, {
    defaults: {
        event: 'tap',
        pointers: 1,
        taps: 1,
        interval: 300, // max time between the multi-tap taps
        time: 250, // max time of the pointer to be down (like finger on the screen)
        threshold: 2, // a minimal movement is ok, but keep it low
        posThreshold: 10 // a multi-tap can be a bit off the initial position
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_MANIPULATION];
    },

    process: function(input) {
        var self = this;
        var options = this.options;

        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.threshold;
        var validTouchTime = input.deltaTime < options.time;

        this.reset();

        if ( (input.eventType & INPUT_START) && (this.count === 0 ) ) {

            return this._setupBeganState();

        } else {

            // we only allow little movement
            // and we've reached an end event, so a tap is possible
            if ( validMovement && validTouchTime && validPointers) {

                if ( input.eventType & INPUT_END ) {

                    var validInterval = this.pTime ? (input.timeStamp - this.pTime < options.interval) : true;
                    var validMultiTap = !this.pCenter || getDistance(this.pCenter, input.center) < options.posThreshold;

                    this.pTime = input.timeStamp;
                    this.pCenter = input.center;

                    if (!validMultiTap || !validInterval) {
                        this.count = 1;
                    } else {
                        this.count += 1;
                    }

                    this._input = input;

                    // if tap count matches we have recognized it,
                    // else it has began recognizing...
                    var tapCount = this.count % options.taps;
                    if (tapCount === 0) {

                        if ( !this.hasRequireFailures() ) {
                            return STATE_RECOGNIZED;
                        } else {
                            this._timer = setTimeout(function() {
                                self.state = STATE_RECOGNIZED;
                                self.emit();
                            }, 250);
                            return STATE_BEGAN;
                        }

                    } else {
                        return this._setupBeganState();
                    }
                } else {
                    return this._setupBeganState();
                }
            } else {
                return STATE_FAILED;
            }
        }
    },

    _setupBeganState: function() {
        var self = this;
        this._timer = setTimeout(function() {
            self.state = STATE_FAILED;
        }, 200);

        return STATE_BEGAN;
    },

    reset: function() {
        clearTimeout(this._timer);
    },

    emit: function() {
        // TODO: canEmit should be abstract to recognizer implementations. `tryEmit` ?
        if ( this.canEmit() ) {

            if (this.state == STATE_RECOGNIZED ) {
                this._input.tapCount = this.count;
                this.manager.emit(this.options.event, this._input);
            }

        } else {
            this.state = STATE_FAILED;
        }
    }
});

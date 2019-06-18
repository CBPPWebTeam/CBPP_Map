/*globals module, window*/
module.exports = function (m, $, d3) {
    "use strict";

    /*This module expects a map object to be passsed to it (m) so it can tack on
    the new event-related functions.*/

    /*Runs any time the mouse moves to keep track of its location*/
    m.applyMousePos = function (e) {
        //Create the tracking object if it doesn't exist
        if (typeof (m.mousePos) === "undefined") {
            m.mousePos = {};
        }
        m.mousePos.x = e.clientX + $(window).scrollLeft();
        m.mousePos.y = e.clientY + $(window).scrollTop();

        if (m.popupSticky === false && !cursorInsidePopup) {

            movePopup();
        }

    };

    m.mouseOnState = "none";

    var isTouch = false;
    var popupDelay = 150;
    window.addEventListener('touchstart', function setHasTouch () {
        isTouch = true;
        popupDelay = 0;
        // Remove event listener once fired, otherwise it'll kill scrolling
        // performance
        window.removeEventListener('touchstart', setHasTouch);
    }, false);


    function movePopup() {
        var box_anchor = [m.mousePos.x, m.mousePos.y];
        var popup_container = $(m.mapSelector + " .popup_container");
        var offset = $(m.mapSelector).offset();
        var x_d = 1, y_d = 1;
        var xprop = "left";
        var yprop = "top";
        if (box_anchor[0] > m.width / 2 + offset.left) {
            x_d = -1;
            xprop = "right";
        }
        if (box_anchor[1] > m.height / 2 + offset.top) {
            y_d = -1;
            yprop = "bottom";
        }
        popup_container.css({left:"",top:"",right:"",bottom:""});
        popup_container.css({
            "left": box_anchor[0] +10*x_d - offset.left,
            "top": box_anchor[1] +10*y_d - offset.top
        });
        if (m.popupCentral) {
          xprop = "left";
          popup_container.css({
            "left": box_anchor[0] - $(m.mapSelector + " .popup").width()*(box_anchor[0]-offset.left)/$(m.mapSelector).width() - offset.left
          });
        }
        popup_container.find(".popup").css({left:"",top:"",right:"",bottom:""});
        popup_container.find(".popup").css(xprop,"2px");
        popup_container.find(".popup").css(yprop,"2px");
    }

    /*Wrapper around the above function specifically for mousemove event
    - this extra layer isn't stricly necessary but I wanted to separate
    out the mousemove code and the touchscreen code if I ever need it to
    be different*/
    m.mouseTracker = function (e) {
        m.applyMousePos(e);
    };

    var hoverTimer, cursorInsidePopup = false;

    $(m.mapSelector).on("mouseenter", " .popup_container", function() {
        cursorInsidePopup = true;
    });

    $(m.mapSelector).on("mouseleave", " .popup_container", function() {
        cursorInsidePopup = false;
    });

    //Runs on mouse entry into state (or touch event on mobile)
    m.hoverIn = function (e) {
        var state = d3.select(this).attr("id").split("_")[1];
        //var state = m.stateCodes[this.id];
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function() {
            m.focusOn(state, e);
        },popupDelay);
    };

    //Runs on mouse entry into state label (or touch event on mobile).
    //Basically the same as above except we get the state code differently
    m.labelHoverIn = function (e) {
        var state = d3.select(this).text();
        clearTimeout(hoverTimer);
        setTimeout(function() {
            m.focusOn(state, e);
        },popupDelay);

    };

    //Runs when the user leaves a state and triggers the removeFocus method
    /*m.hoverOut = function () {
        var state = m.stateCodes[this.id];
    };

    //Or a label
    m.labelHoverOut = function () {
        var state = this.attrs.text;


    };*/
    var popupFading = false;
    var doFadeoutPopup = function() {
        clearTimeout(hoverTimer);
        if (!popupFading) {
            popupFading = true;
            $(m.mapSelector + " .popup_container").stop().fadeOut(200, function () {
                popupFading = false;
                cursorInsidePopup = false;
            });
        }
    }

    m.removeFocus = function (s) {
        if (typeof(s)==="undefined") {
            s = null;
        }
        if (s===null) {
            return false;
        }
        m.focusedState = null;
        m.revertFocusColor(s, 100);
    };

    //The user can pass in a click callback which gets run here.
    m.mouseClick = function () {
        var state = d3.select(this).attr("id").split("_")[1];
        m.stateClick(state);
    };

    //Here too.
    m.labelMouseClick = function () {
        var state = d3.select(this).attr("id").split("_")[1];
        m.stateClick(state);
    };

    //Method to return the state to its original color after it's been unfocused
    m.revertFocusColor = function (s, duration) {
        /*This is an object to keep track of any animations that are running
        and I can't think of any particular reason why it wouldn't already exist
        at this point in the code, but may as well check*/
        if (typeof (m.animationRefs) === "undefined") {
            m.animationRefs = {};
        }

        /*If the state is currently animating, stop*/
        if (m.animationRefs[s]) {
            m.animationRefs[s].stopAnimation();
        }

        /*Start a new animation back to the original color*/
        m.animationRefs[s] = m.colors.animateStateColor(s, m.colors.stateColors[s], duration);
    };



    $(m.mapSelector).click(function () {
        setTimeout(function () {
            m.zoomOut();
        }, 1);
    });

    m.calcTextTransform = function () {
        m.textTransform = Math.min(1, m.width / m.fullScaleWidth);
    };
    m.calcTextTransform();
    m.setMapOpacity = function (opacity, exceptEls) {
        function o(obj, op) {
            if (typeof (obj) !== "undefined") {
                if (obj.node !== null) {
                    obj.attr({
                        "fill-opacity": op,
                        "stroke-opacity": op
                    });
                    if (op === 0) {
                        obj.hide();
                    } else {

                        if (obj.node.style.display === "none") {
                            obj.show();
                        }
                    }
                }
            }
        }
        var exceptElOs = [];
        for (var i = 0, ii = exceptEls.length; i < ii; i++) {
            exceptElOs[i] = exceptEls[i].attr("opacity");
        }
        for (var otherState in m.stateObjs) {
            if (m.stateObjs.hasOwnProperty(otherState)) {
                o(m.stateObjs[otherState], opacity);
            }
        }
        for (var label in m.stateLabelObjs) {
            if (m.stateLabelObjs.hasOwnProperty(label)) {
                o(m.stateLabelObjs[label], opacity);
            }
        }
        for (var line in m.maplines) {
            if (m.maplines.hasOwnProperty(line)) {
                for (var j = 0, jj = m.maplines[line].length; j < jj; j++) {
                    o(m.maplines[line][j], opacity);
                }
            }
        }

        m.legendBox.attr("fill", "#fff");
        o(m.legendBox, opacity);
        o(m.leftLegendText, opacity);
        o(m.middleLegendText, opacity);
        o(m.rightLegendText, opacity);
        for (i = 0, ii = exceptEls.length; i < ii; i++) {
            o(exceptEls[i], exceptElOs[i]);
        }
    };
    m.zoomFrame = function () {
        var scale, opacity, state = m.stateObjs[m.zoomedState], p = m.zoomAnimation.progress;
        scale = Math.round((p * 1.5 + 1) * 100) / 100;
        opacity = Math.round((1 - p) * 100) / 100;
        state.transform("s" + scale + "T" + Math.round(p * m.zoomedStateTranslation.x) + "," + Math.round(p * m.zoomedStateTranslation.y));
        m.setMapOpacity(opacity, [state]);
    };
    m.zoomOut = function (onComplete) {
        if (m.zooming) {
            return false;
        }
        if (typeof (m.zoomedState) !== "string") {
            return false;
        }
        m.zoomOutStart();
        m.zooming = true;
        m.zoomAninimation = {};
        m.zoomAnimation.progress = 1;

        m.zoomAnimation.interval = setInterval(function () {
            m.zoomAnimation.progress -= 0.2;
            if (m.zoomAnimation.progress <= 0) {
                m.zoomAnimation.progress = 0;
            }
            m.zoomFrame();
            if (m.zoomAnimation.progress === 0) {
                clearInterval(m.zoomAnimation.interval);
                m.zoomedState = null;
                m.zooming = false;
                m.makeLegend();
                if (typeof (onComplete) === "function") {
                    onComplete();
                }
            }
        },40);
    };
    m.zoomToState = function (s) {
        /*check if alreayd zoomed into state*/
        if (m.isCanvasSupported === false) {
            return false;
        }
        if (m.zoomedState) {
            if (m.zoomedState === s) {
                return false;
            } else {
                /*zoom out first*/
                m.zoomOut();
            }
        }
        if (m.zooming) {
            return false;
        }
        m.zoomedState = s;
        m.zooming = true;
        var bbox = m.stateObjs[s].getBBox();
        m.zoomedStateTranslation = {
            x: 0 - (bbox.x - bbox.width * 0.75) + 0.5 * m.width / m.scaleFactor - 0.5 * bbox.width * 2.5,
            y: 0 - (bbox.y - bbox.height * 0.75) + 0.5 * m.height / m.scaleFactor - 0.5 * bbox.height * 2.5
        };
        m.zoomAnimation = {};
        m.zoomAnimation.progress = 0;
        m.zoomAnimation.interval = setInterval(function () {
            m.zoomAnimation.progress += 0.2;
            if (m.zoomAnimation.progress >= 1) {
                m.zoomAnimation.progress = 1;
            }
            m.zoomFrame();
            if (m.zoomAnimation.progress === 1) {
                clearInterval(m.zoomAnimation.interval);
                m.zooming = false;
            }
        }, 40);
    };

    m.stateToFocusColor = function(s) {
        m.animationRefs[s] = m.colors.animateStateColor(s, m.colors.colorConfig.hoverColor, 200);
    };

    /*Focus on the state*/
    m.focusOn = function (s, e) {
        if (m.stateObjs[s][0] === null) {
            return false;
        }

        if (cursorInsidePopup) {
            return false;
        }

        if (typeof(m.focusedState)==="undefined") {
            m.focusedState=null;
        }

        if (typeof(m.disabledHoverStates)!=="undefined") {
          if (m.disabledHoverStates[s]===1) {
            removeAllFocus();
            return false;
          }
        }

        if (m.focusedState === s) {
            return false;
        }

        //The popup box base coordinate comes from the mouse tracker
        var box_anchor = [m.mousePos.x, m.mousePos.y];

        /*Break the canvas up into quandrants and draw the box on the correct
        side of the cursor based on its quadrant*/
        var offset = $(m.mapSelector).offset();
        var horizontalAlign="left";
        var verticalAlign="top";
        if (box_anchor[0] > m.width / 2 + offset.left) {
            horizontalAlign = "right";
        }
        if (box_anchor[1] > m.height / 2 + offset.top) {
            verticalAlign = "bottom";
        }


        m.removeFocus(m.focusedState);


        /*Animate the state to the focus color.*/
        m.stateToFocusColor(s);

        var popupDisabled = false;
        if (typeof (m.disablePopupsOn) !== "undefined") {
            if (typeof (m.disablePopupsOn[s]) !== "undefined") {
                if (m.disablePopupsOn[s] === 1) {
                    popupDisabled = true;
                }
            }
        }

        if (typeof(m.stateFocus)==="function") {
            m.stateFocus(s);
        }

        if (m.disableAllPopups !== true && !popupDisabled) {

            //Create a new popup
            var popup_container = m.popup_container;
            popup_container.data("state", s);
            var popup = m.popup_inner;
            if (typeof(m.popupWidth)==="undefined") {
                m.popupWidth = 0.3;
            }
            var w = m.popupWidth * $(m.mapSelector).width();
            if (typeof(m.popupWidthFixed)!=="undefined") {
              if (m.popupWidthFixed) {
                w = m.popupWidth;
              }
            }
            popup.css({
                "width": w,
                "left":"",
                "right":"",
                "bottom":"",
                "top":""
            });
            try {
                //better (doesn't work in old IE)
                popup[0].style.setProperty("width", w + "px", "important");
            } catch (ex) { }
            popup.css(horizontalAlign, "2px");
            popup.css(verticalAlign, "2px");
            popup.html(m.popupTemplate(m.data, s));
            //append it to the map div
            //$(m.mapSelector).append(popup_container);
            movePopup();
            if (typeof(m.postPopup)==="function") {
              m.postPopup(m.data, s);
            }
            //fade it in
            popupFading = true;
            popup_container.stop().fadeIn(100, function() {
                popupFading = false;
                if (typeof(m.postPopup)==="function") {
                  m.postPopup(m.data, s);
                }
            });

        }

        //Define the new state as the focused state
        m.focusedState = s;

    };

    m.popup_container = $("<div class=\"popup_container\"></div>");
    m.popup_inner = $("<div class=\"popup\"></div>");
    $(m.mapSelector).append(m.popup_container);
    m.popup_container.append(m.popup_inner);
    m.popup_container.css({
        "position": "absolute",
        "display": "none"
    });


    $(m.mapSelector).on("mouseleave", function(e) {
        //Unfocus the previously focused state
        m.removeFocus(m.focusedState);

    });

    function removeAllFocus() {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function() {
          if (cursorInsidePopup) {
              return false;
          }
          // m.popupFadeoutTimer = setTimeout(doFadeoutPopup, 200);
          doFadeoutPopup();
          //Unfocus the previously focused state
          m.removeFocus(m.focusedState);
      }, popupDelay);
    }

    $(document).mousemove(function(event) {
        if($(event.target).parent(".cbpp_map").length>0) {
            removeAllFocus();
        }
    });

    /*Assign all these events to the actual Raphael objects*/
    m.applyHoverEvents = function () {
        var state;
        $(m.mapSelector).mousemove(m.mouseTracker);
        for (state in m.stateObjs) {
            if (m.stateObjs.hasOwnProperty(state)) {
                m.stateObjs[state].on("mouseenter",m.hoverIn)
                  //.on("mouseout",m.hoverOut)
                  .on("click",m.mouseClick);
            }
        }
        for (state in m.stateLabelObjs) {
            if (m.stateLabelObjs.hasOwnProperty(state)) {
                m.stateLabelObjs[state].on("mouseenter",m.labelHoverIn)
                //  .on("mouseout",m.labelHoverOut)
                  .on("click",m.labelMouseClick);
            }
        }
    };
    m.applyHoverEvents();
    m.fadeoutPopup = doFadeoutPopup;
    /*$(m.mapSelector).on("click touchstart"," .popup", function() {
        var state = $(this).parents(".popup_container").attr("id").split("_")[1];
        m.stateClick(state);
    });*/
};

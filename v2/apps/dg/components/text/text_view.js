// ==========================================================================
//                            DG.TextView
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

/* global ReactDOM, SlateEditor */

/** @class  DG.TextView

 A wrapper for a TextFieldView that gives user a place to type notes.

 @extends SC.View
 */
DG.TextView = SC.View.extend((function() {
    /** @scope DG.TextView.prototype */

    var kWantsEventsClasses = ' dg-wants-mouse dg-wants-touch dg-wants-keys dg-wants-select';

    return {
      backgroundColor: 'white',

      childViews: ['editView'],
      editView: SC.View.design({
        // without 'allow-select' Safari prevents focusing the editor
        classNames: ['dg-text-view-edit-view', 'allow-select'],

        layout: { left: 2, right: 2, top: 2, bottom: 2 },

        // editor instance
        _editor: null,

        // "raw" editor value including selection, etc.
        // bound to TextController 'theValue' property
        editorValue: null,

        // editor document content, suitable for storage
        // property name retained from pre-slate usage
        // bound to TextController 'theText' property
        value: null,

        _slatePlugins: null,

        init: function() {
          sc_super();

          // Slate plugin example - plugins can extend editor behavior, e.g. by
          // implementing a new format type for displaying a CODAP global value.
          var onCommandPlugin = {
            onCommand: function(command, editor, next) {
              var result = next();
              // console.log("TextView.onCommandPlugin", "type:", command.type);
              return result;
            }.bind(this)
          };
          this._slatePlugins = [onCommandPlugin];
        },

        /**
         * Retrieve the "raw" value to be passed to the underlying editor. Usually,
         * this will be the 'editorValue' property most recently saved by the editor
         * itself, but when restoring from a saved document or with undo/redo this
         * can be serialized content from an external source, including plain text
         * if dealing with legacy document content.
         */
        getValueForEditor: function() {
          // use full slate value if we have one
          var editorValue = this.get('editorValue');
          if (editorValue) return editorValue;
          var exchangeValue = this.get('value');
          // convert from string value if necessary
          if (typeof exchangeValue === "string") return SlateEditor.textToSlate(exchangeValue);
          // start with empty value if appropriate
          if (!exchangeValue) return SlateEditor.textToSlate("");
          // deserialize serialized content
          return SlateEditor.deserializeValue(exchangeValue);
        },

        /**
         * Whether the underlying editor selection model is currently focused.
         */
        isEditorFocused: function() {
          return !!(this._editor && this._editor.value && this._editor.value.selection &&
                    this._editor.value.selection.isFocused);
        },

        /**
         * Re-render when the editor value changes.
         */
        editorValueDidChange: function() {
          this.renderEditor();
          this.renderToolbar();
        }.observes('editorValue'),

        getComponentView: function() {
          return this.getPath('parentView.parentView.parentView');
        },

        isComponentSelected: function() {
          return this.getPath('parentView.parentView.parentView.isSelected');
        },

        /**
         * Synchronize editor focus/blur with component selection
         */
        isComponentSelectedDidChange: function() {
          var isComponentSelected = this.isComponentSelected(),
              isEditingTitlebar = this.getPath('parentView.parentView.titlebar.userEdit'),
              isEditorFocused = this.isEditorFocused();
          if (!isComponentSelected && isEditorFocused) {
            this._editor && this._editor.blur();
          }
          else if (isComponentSelected && !isEditingTitlebar && !isEditorFocused) {
            this._editor && this._editor.focus();
          }
          // renderToolbar renders the inspector panel, if not visible, but
          // hides it if it is.
          this.renderToolbar();
        }.observes('.parentView.parentView.parentView.isSelected'),

        didCreateLayer: function() {
          this._controller = this.getPath('parentView.parentView.parentView.controller');

          this.reactEditorDiv = document.createElement('div');
          this.reactEditorDiv.className = 'dg-text-view-react-root' + kWantsEventsClasses;
          this.get('layer').appendChild(this.reactEditorDiv);
          this.reactToolbarDiv = document.createElement('div');
          this.reactToolbarDiv.className = 'dg-text-view-react-portal';
          this.reactToolbarDiv.style.position = "absolute";
          DG.mainPage.mainPane.scrollView.contentView.get('layer').appendChild(this.reactToolbarDiv);
          this.reactModalDiv = document.createElement('div');
          this.reactModalDiv.className = 'dg-text-view-modal-portal';
          DG.mainPage.mainPane.scrollView.contentView.get('layer').appendChild(this.reactModalDiv);
          this.renderEditor();
          this.renderToolbar();
        },

        willDestroyLayer: function() {
          ReactDOM.unmountComponentAtNode(this.reactEditorDiv);
          ReactDOM.unmountComponentAtNode(this.reactToolbarDiv);
          DG.mainPage.mainPane.scrollView.contentView.get('layer').removeChild(this.reactToolbarDiv);
        },

        /**
         * Keep toolbar positioned alongside component.
         */
        positionToolbar: function() {
          var componentView = this.getComponentView(),
              frame = componentView && componentView.computeFrameWithParentFrame();
          if (frame && this.reactToolbarDiv) {
            this.reactToolbarDiv.style.left = (frame.x + frame.width) + "px";
            this.reactToolbarDiv.style.top = frame.y + "px";
          }
        }.observes('.parentView.parentView.parentView.frame'),

        renderToolbar: function() {
          var props = {
                modalPortalRoot: this.reactModalDiv,
                modalCoverClassName: 'codap-ccrte-cover' + kWantsEventsClasses,
                modalDialogClassName: 'codap-ccrte-modal' + kWantsEventsClasses,
                className: 'codap-ccrte-toolbar' + kWantsEventsClasses,
                orientation: 'vertical',
                colors: {
                  buttonColors: { fill: "#ffffff", background: "#177991" },
                  selectedColors: { fill: "#177991", background: "#72bfca" }
                },
                buttonsPerRow: 9,
                order: [
                    //column 1
                  "fontDecrease",
                  "bold",
                  "underlined",
                  "superscript",
                  "ordered-list",
                  "heading1",
                  "heading3",
                  "color",
                  "link",

                    //column 2
                  "fontIncrease",
                  "italic",
                  "deleted",
                  "subscript",
                  "bulleted-list",
                  "heading2",
                  "block-quote",
                  "image"
                ],
                editor: this._editor,
                show: this.isComponentSelected()
              };
          ReactDOM.render(DG.React.SlateToolbar(props), this.reactToolbarDiv);
        },

        renderEditor: function() {
          var value = this.getValueForEditor();
          if (value && !this.get('editorValue')) {
            // sync 'value' => 'editorValue'
            this.set('editorValue', value);
          }
          var props = {
                className: 'codap-ccrte-editor',
                plugins: this._slatePlugins,
                value: value,
                history: false,
                onEditorRef: function(editor) {
                  this._editor = editor;
                }.bind(this),
                onValueChange: function(value) {
                  SC.run(function() {
                    this.set('editorValue', value);
                  }.bind(this));
                }.bind(this),
                onContentChange: function(content) {
                  SC.run(function() {
                    this.set('value', SlateEditor.serializeValue(content));
                  }.bind(this));
                }.bind(this),
                onFocus: function() {
                  if (!this.isComponentSelected()) {
                    SC.run(function() {
                      // Apparently the mouse down is captured, so we need to
                      // manually close any inspector panels that are open.
                      DG.mainPage.mainPane.hideInspectorPicker();
                      var componentView = this.getComponentView();
                      componentView && componentView.select();
                    }.bind(this));
                  }
                }.bind(this),
                onBlur: function() {
                  SC.run(function() {
                    // emulate SC.View's 'commitOnBlur' property
                    this.commitEditing();
                  }.bind(this));
                }.bind(this)
              };
          ReactDOM.render(DG.React.SlateEditor(props), this.reactEditorDiv);
        },

        commitEditing: function () {
          this._controller.commitEditing();
        },

        /**
         * Prevent drop into text edit area from propagating to the CODAP workspace
         * where it would be interpreted as a CSV drop.
         * @param ev {MouseEvent}
         */
        dataDragDropped: function (ev) {
          var dt = ev.dataTransfer;
          if (dt && !dt.files.length) {
            ev.stopPropagation();
          } else {
            return false;
          }
        }
      }),

      defaultFirstResponder: function () {
        return this.get('editView');
      }.property(),

      /**
       * We've animated to our initial position and along the way lost editing focus.
       */
      didReachInitialPosition: function() {
        this.beginEditing();
      },

      beginEditing: function() {
        setTimeout(function() {
          var editView = this.get('editView'),
              editor = editView && editView._editor;
          editor && editor.focus();
        }.bind(this));
      }

    };
  })()
);

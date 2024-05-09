import ReactDOMFactories from "react-dom-factories"
import { DG } from "../../v2/dg-compat.v2"
import { SC } from "../../v2/sc-compat"

DG.React.ready(function () {
  var
      span = ReactDOMFactories.span,
      input = ReactDOMFactories.input

  DG.React.Components.TextInput = DG.React.createComponent(
      (function () {

        /**
         * props are
         *    value: {string | number}
         *    unit: {string}
         *    isEditable: {boolean}
         *    createInEditMode: {boolean}
         *    onEscapeEditing: {function}
         *    onToggleEditing: {function}
         */

        return {
          inputElement: null,

          getInitialState () {
            return {
              editing: false,
              value: this.props.value,
              unit: this.props.unit
            }
          },

          componentDidMount () {
            window.addEventListener("touchstart", this._onWindowClick, true)
            window.addEventListener("mousedown", this._onWindowClick, true)
          },
          componentWillUnmount () {
            window.removeEventListener("touchstart", this._onWindowClick, true)
            window.removeEventListener("mousedown", this._onWindowClick, true)
          },

          UNSAFE_componentWillReceiveProps (iNewProps) {
            if (iNewProps.value !== this.state.value)
              { this.setState({value: iNewProps.value}) }
            if (iNewProps.unit !== this.state.unit)
              { this.setState({unit: iNewProps.unit}) }
            if (iNewProps.createInEditMode && iNewProps.onEditModeCallback)
              { iNewProps.onEditModeCallback(this) }
          },

          componentDidUpdate(iPrevProps) {
            if (this.props.createInEditMode !== iPrevProps.createInEditMode) {
              this.setState({ editing: this.props.createInEditMode })
            }
          },

          _onWindowClick (event) {
            if (this.inputElement && this.state.editing &&
                (event.target !== this.inputElement) && !this.inputElement.contains(event.target)) {
              this.props.onToggleEditing(this)
            }
          },

          handleChange (iEvent) {
            this.setState({value: iEvent.target.value})
          },

          render () {
            var
                this_ = this,
                tUnits = SC.empty(this.state.value) ? '' : ` ${  this.state.unit || ''}`,
                tValueClassName = this.props.isEditable ? 'react-data-card-value ' : '',
                tValue = SC.empty(this.state.value) ? '____' : this.state.value,
                kCompletionCodes = [13, 9],
                tResult = this.state.editing
                    ? input({
                      className: 'react-data-card-value-input dg-wants-mouse dg-wants-touch',
                      type: 'text',
                      // ref is called on creation of the input element
                      ref(input) {
                        this_.inputElement = input
                        input?.focus()
                      },
                      value: this.state.value,
                      onChange: this.handleChange,
                      onKeyDown: function (iEvent) {
                        if (kCompletionCodes.indexOf(iEvent.keyCode) >= 0) {
                          this.props.onToggleEditing(this, iEvent.shiftKey ? 'up' : 'down')
iEvent.preventDefault()
                        }
                        else if (iEvent.keyCode === 27) {
                          this.props.onEscapeEditing(this)
                        }
                      }.bind(this),
                      onFocus(iEvent) {
                        iEvent.target.select()
                      }
                    })
                    : span({
                      className: tValueClassName + (this.props.className || ''),
                      title: tValue,
                      onClick: function (iEvent) {
                        if (!this.state.editing && this.props.onToggleEditing && this.props.isEditable) {
                          this.props.onToggleEditing(this)
                        }
                      }.bind(this)
                    }, tValue + tUnits)
            return tResult
          }
        }
      }()), [])

})

import { clsx } from "clsx"
import React, { Component } from "react"

interface IProps {
  className?: string
  value: string
  unit?: string
  isEditable: boolean
  createInEditMode?: boolean
  onEditModeCallback: (input: DGTextInput) => void
  onEscapeEditing: (input: DGTextInput) => void
  onToggleEditing: (input: DGTextInput, moveDirection?: "up" | "down") => void
}

interface IState {
  editing: boolean
  value: string
  unit?: string
}

export class DGTextInput extends Component<IProps, IState> {

  inputElement: HTMLInputElement | null = null

  constructor(props: IProps) {
    super(props)

    this.state = {
      editing: false,
      value: props.value,
      unit: props.unit
    }
  }

  componentDidMount () {
    window.addEventListener("touchstart", this._onWindowClick, true)
    window.addEventListener("mousedown", this._onWindowClick, true)
  }
  componentWillUnmount () {
    window.removeEventListener("touchstart", this._onWindowClick, true)
    window.removeEventListener("mousedown", this._onWindowClick, true)
  }

  UNSAFE_componentWillReceiveProps (iNewProps: IProps) {
    if (iNewProps.value !== this.state.value)
      { this.setState({value: iNewProps.value}) }
    if (iNewProps.unit !== this.state.unit)
      { this.setState({unit: iNewProps.unit}) }
    if (iNewProps.createInEditMode && iNewProps.onEditModeCallback)
      { iNewProps.onEditModeCallback(this) }
  }

  componentDidUpdate(iPrevProps: IProps) {
    if (this.props.createInEditMode !== iPrevProps.createInEditMode) {
      this.setState({ editing: !!this.props.createInEditMode })
    }
  }

  isValueEmpty() {
    return this.state.value == null || this.state.value === ''
  }

  _onWindowClick = (event: MouseEvent | TouchEvent) => {
    if (this.inputElement && this.state.editing &&
        (event.target !== this.inputElement) && !this.inputElement.contains(event.target as Node | null)) {
      this.props.onToggleEditing(this)
    }
  }

  handleChange = (iEvent: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({value: iEvent.target.value})
  }

  handleKeyDown = (iEvent: React.KeyboardEvent) => {
    const kCompletionCodes = [13, 9]
    if (kCompletionCodes.indexOf(iEvent.keyCode) >= 0) {
      this.props.onToggleEditing(this, iEvent.shiftKey ? 'up' : 'down')
      iEvent.preventDefault()
    }
    else if (iEvent.keyCode === 27) {
      this.props.onEscapeEditing(this)
    }
  }

  render () {
    const
      tUnits = this.isValueEmpty() ? '' : ` ${this.state.unit || ''}`,
      tValue = this.isValueEmpty() ? '____' : this.state.value
    return this.state.editing
      ? <input type='text' className='react-data-card-value-input'
          // ref is called on creation of the input element
          ref={input => {
            this.inputElement = input
            input?.focus()
          }}
          value={this.state.value}
          onChange={this.handleChange}
          onKeyDown={this.handleKeyDown}
          onFocus={iEvent => iEvent.target.select()}
        />
      : <span className={clsx(this.props.className, { 'react-data-card-value': this.props.isEditable })}
          title={`${tValue}`}
          onClick={() => {
            if (!this.state.editing && this.props.isEditable) {
              this.props.onToggleEditing(this)
            }
          }}
        >
          {tValue + tUnits}
        </span>
  }

}

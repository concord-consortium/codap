/* global createReactClass, createReactFactory, ReactDOM, SlateEditor */

// this would be defined once in CODAP
DG.React = {
  createClass: function (def, highOrderComponentList) {
    var finalClass = createReactClass(def);
    if (highOrderComponentList) {
      highOrderComponentList.forEach(function (highOrderComponent) {
        finalClass = highOrderComponent(finalClass);
      });
    }
    return finalClass;
  },

  createComponent: function (def, highOrderComponentList) {
    return createReactFactory(DG.React.createClass(def, highOrderComponentList));
  },

  // toggles the component to render in the container node
  toggleRender: function (containerNode, component) {
    if (containerNode.children.length > 0) {
      ReactDOM.unmountComponentAtNode(containerNode);
    }
    else if (component) {
      ReactDOM.render(component, containerNode);
    }
  },

  // wait for React to become available when the CFM loads
  ready: function (callback) {
    if (window.React && window.ReactDOM) {
      callback();
    }
    else {
      setTimeout(function () { DG.React.ready(callback); }, 250);
    }
  }
};

DG.React.SlateContainer = createReactFactory(SlateEditor.SlateContainer);
DG.React.SlateEditor = createReactFactory(SlateEditor.SlateEditor);
DG.React.SlateToolbar = createReactFactory(SlateEditor.SlateToolbar);

// these augment custom components with common behaviors
DG.React.HighOrderComponents = {
  _render: function (componentInstance, childComponentClass, highOrderProps) {
    var props = Object.assign({}, componentInstance.props, componentInstance.state, (highOrderProps || {}));
    return createReactFactory(childComponentClass)(props);
  },

  UnmountOnOutsideClick: function (childComponentClass) {
    return createReactClass({
      componentDidMount: function () {
        window.addEventListener('mousedown', this.checkForToggle, true);
        window.addEventListener('touchstart', this.checkForToggle, true);
      },

      componentWillUnmount: function () {
        window.removeEventListener('mousedown', this.checkForToggle, true);
        window.removeEventListener('touchstart', this.checkForToggle, true);
      },

      checkForToggle: function (e) {
        // eslint-disable-next-line react/no-find-dom-node
        var containerNode = ReactDOM.findDOMNode(this).parentNode,
            clickedNode = e.target;

        // check if clicked node is within the rendered child container
        while (clickedNode && (clickedNode !== containerNode)) {
          clickedNode = clickedNode.parentNode;
        }

        // the clicked node was outside the child container so unmount it
        if (!clickedNode) {
          this.unmount();
          e.preventDefault();
          e.stopPropagation();
        }
      },

      unmount: function () {
        // eslint-disable-next-line react/no-find-dom-node
        DG.React.toggleRender(ReactDOM.findDOMNode(this).parentNode);
      },

      render: function () {
        return DG.React.HighOrderComponents._render(this, childComponentClass, {unmount: this.unmount});
      }
    });
  },

  UnmountOnEscapeKey: function (childComponentClass) {
    return createReactClass({
      componentDidMount: function () {
        window.addEventListener('keydown', this.checkForEscape, true);
      },

      componentWillUnmount: function () {
        window.removeEventListener('keydown', this.checkForEscape, true);
      },

      checkForEscape: function (e) {
        if (e.keyCode === 27) {
          this.unmount();
          e.preventDefault();
          e.stopPropagation();
        }
      },

      unmount: function () {
        // eslint-disable-next-line react/no-find-dom-node
        DG.React.toggleRender(ReactDOM.findDOMNode(this).parentNode);
      },

      render: function () {
        return DG.React.HighOrderComponents._render(this, childComponentClass, {unmount: this.unmount});
      }
    });
  }
};

DG.React.Components = {};
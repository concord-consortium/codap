
// TODO: remove next line when integrating with CODAP
DG = window.DG || {};

// this would be defined once in CODAP
DG.React = {
  createClass: function (def, highOrderComponentList) {
    var finalClass = React.createClass(def);
    if (highOrderComponentList) {
      highOrderComponentList.forEach(function (highOrderComponent) {
        finalClass = highOrderComponent(finalClass);
      });
    }
    return finalClass;
  },

  createComponent: function (def, highOrderComponentList) {
    return React.createFactory(DG.React.createClass(def, highOrderComponentList));
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
    if (React && ReactDOM) {
      callback();
    }
    else {
      setTimeout(function () { DG.React.ready(callback); }, 250);
    }
  }
};

// these augment custom components with common behaviors
DG.React.HighOrderComponents = {
  _render: function (componentInstance, childComponentClass, highOrderProps) {
    var props = Object.assign({}, componentInstance.props, componentInstance.state, (highOrderProps || {}));
    return React.createFactory(childComponentClass)(props);
  },

  UnmountOnOutsideClick: function (childComponentClass) {
    return React.createClass({
      componentDidMount: function () {
        window.addEventListener('mousedown', this.checkForToggle, true);
      },

      componentWillUnmount: function () {
        window.removeEventListener('mousedown', this.checkForToggle, true);
      },

      checkForToggle: function (e) {
        var containerNode = ReactDOM.findDOMNode(this).parentNode,
            clickedNode = e.target;

        // check if clicked node is within the rendered child container
        while (clickedNode && (clickedNode !== containerNode)) {
          clickedNode = clickedNode.parentNode;
        }

        // the clicked node was outside the child container so unmount it and eat the mouse event
        if (!clickedNode) {
          this.unmount();
        }
      },

      unmount: function () {
        DG.React.toggleRender(ReactDOM.findDOMNode(this).parentNode);
      },

      render: function () {
        return DG.React.HighOrderComponents._render(this, childComponentClass, {unmount: this.unmount});
      }
    });
  }
};

DG.React.Components = {};
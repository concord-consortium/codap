/* global ReactDOM, ReactDOMFactories */
DG.React.ready(function () {
  var div = ReactDOMFactories.div,
      ul = ReactDOMFactories.ul,
      li = ReactDOMFactories.li,
      span = ReactDOMFactories.span,
      italic = ReactDOMFactories.i,
      h1 = ReactDOMFactories.h1,
      h2 = ReactDOMFactories.h2,
      kLeftAngleBracketChar = '&#x2039;',
      kRightAngleBracketChar = '&#x203a;',
      kInfoIconChar = '&#9432;';  // http://stackoverflow.com/a/33878610

  DG.React.Components.FunctionBrowser = DG.React.createComponent({
    getInitialState: function () {
      return {
        style: null,
        categories: this.categorize(this.props.categorizedFunctionInfo),
        category: null,
        fn: null
      };
    },

    componentDidMount: function () {
          // eslint-disable-next-line react/no-find-dom-node
      var anchorNode = ReactDOM.findDOMNode(this.props.anchor),
          anchorBounds = anchorNode.getBoundingClientRect(),
          // eslint-disable-next-line react/no-find-dom-node
          containerNode = ReactDOM.findDOMNode(this.props.container),
          containerBounds = containerNode.getBoundingClientRect(),
          spaceAbove = anchorBounds.top - containerBounds.top,
          spaceBelow = containerBounds.bottom - anchorBounds.bottom,
          kReservedHeight = 300,
          kReservedMargin = 6,
          style = { position: 'absolute', left: anchorBounds.left };
      if ((spaceBelow < kReservedHeight) && (spaceBelow < spaceAbove)) {
        // place above anchor if not enough room below
        style.bottom = containerBounds.bottom - anchorBounds.top;
        style.maxHeight = anchorBounds.top - kReservedMargin;
      }
      else {
        // place below anchor if there's enough room
        style.top = anchorBounds.bottom;
        style.maxHeight = containerBounds.bottom - anchorBounds.bottom - kReservedMargin;
      }
      this.setState({ style: style });
    },

    categorize: function(categorizedFunctionInfo) {
      var categories = [],
          categoryNames;

      categoryNames = Object.keys(categorizedFunctionInfo);
      categoryNames.sort();
      categoryNames.forEach(function(categoryName) {
        var functionNames = Object.keys(categorizedFunctionInfo[categoryName]),
            functions = [];

        functionNames.sort();
        functionNames.forEach(function (functionName) {
          var definition = categorizedFunctionInfo[categoryName][functionName],
              argList = [],
              i, maxArgs, requiredArgs, optionalArgs;

          // 99 is used to signify variable args for string concat and join
          maxArgs = definition.args ? definition.args.length
                                    : definition.maxArgs > 20 ? 2 : definition.maxArgs;

          // create the args if not found
          definition.args = definition.args || [];
          if (maxArgs) {
            for (i = 0; i < maxArgs; i++) {
              if (i === definition.args.length) {
                definition.args.push({
                  name: "abcdefghijklmnopqrstuvwxyz"[i],
                  type: "any",
                });
              }
              definition.args[i].required = i < definition.minArgs;
            }
          }

          requiredArgs = definition.args.slice(0, definition.minArgs).map(function (arg) { return arg.name; }).join(', ');
          if (requiredArgs) {
            argList.push(requiredArgs);
          }
          optionalArgs = definition.args.slice(definition.minArgs).map(function (arg) { return arg.name; }).join(', ');
          if (optionalArgs) {
            argList.push(optionalArgs);
          }

          functions.push({
            name: functionName,
            definition: definition,
            argList: argList.join(", ")
          });
        });

        categories.push({
          name: categoryName,
          functions: functions
        });
      });

      return categories;
    },

    selectFunction: function (fn) {
      if (this.props.onSelect) {
        this.props.onSelect(fn.name, fn.argList, fn);
      }
      this.props.unmount(); // unmount is added by DG.React.HighOrderComponents.UnmountOnOutsideClick
    },

    renderHeader: function (parentName, itemName, onClick) {
      return div({className: 'react-function-browser-header clickable', onClick: onClick},
        span({dangerouslySetInnerHTML: {__html:kLeftAngleBracketChar + ' ' + parentName}}),
        itemName
      );
    },

    renderCategoryList: function (categories) {
      var self = this,
          list = categories.map(function (category) {
            var clicked = function () {
              self.setState({category: category});
            };
            return li({className: 'clickable', key: category.name, onClick: clicked},
              span({}, category.name),
              div({dangerouslySetInnerHTML: {__html:kRightAngleBracketChar}})
            );
          });
      return ul({}, list);
    },

    renderFunctionList: function (category) {
      var self = this,
          list = category.functions.map(function (fn) {
            var infoClicked = function () {
                  self.setState({category: category, fn: fn});
                },
                fnClicked = function () {
                  self.selectFunction(fn);
                },
                hasInfo = !!fn.definition.description || !!fn.definition.examples;

            return li({key: fn.name},
              span({className: 'clickable', onClick: fnClicked, title: fn.definition.description},
                fn.name,
                italic({}, '(' + fn.argList + ')')
              ),
              hasInfo ? div({className: 'clickable', onClick: infoClicked, dangerouslySetInnerHTML: {__html:kInfoIconChar}}) : null
            );
          });

      return div({},
        this.renderHeader('Categories', category.name, function () {
          this.setState({category: null});
        }.bind(this)),
        ul({}, list)
      );
    },

    renderFunction: function (category, fn) {
      var self = this,
          argItems = fn.definition.args.map(function (arg, index) {
            return li({key: 'arg-' + index},
              italic({}, arg.name + (arg.description ? ': ' : '')),
              span({}, arg.description || '',
              ' (',
              italic({}, arg.required ? 'required' : 'optional'),
              ')'));
          }),
          examples = (fn.definition.examples || []).map(function (example, index) {
            return li({key: 'example-' + index}, example);
          }),
          fnClicked = function () {
            self.selectFunction(fn);
          };

      return div({},
        this.renderHeader(category.name, fn.name, function () {
          this.setState({fn: null});
        }.bind(this)),
        div({className: 'react-function-browser-function-info'},
          h1({className: 'clickable', onClick: fnClicked }, fn.name, italic({}, '(' + fn.argList + ')')),
          fn.definition.description ? div({}, fn.definition.description) : null,
          argItems ? div({},
            h2({}, 'Parameters'),
            ul({}, argItems)
          ) : null,
          examples ? div({},
            h2({}, 'Examples'),
            ul({}, examples)
          ) : null
        )
      );
    },

    render: function () {
      var contents = null;
      if (this.state.style) {
        if (this.state.fn) {
          contents = this.renderFunction(this.state.category, this.state.fn);
        }
        else if (this.state.category) {
          contents = this.renderFunctionList(this.state.category);
        }
        else {
          contents = this.renderCategoryList(this.state.categories);
        }
      }
      return div({className: 'react-function-browser dg-wants-touch', style: this.state.style}, contents);
    }
  }, [DG.React.HighOrderComponents.UnmountOnOutsideClick, DG.React.HighOrderComponents.UnmountOnEscapeKey]);

});

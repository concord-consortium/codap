
DG.React.ready(function () {
  var div = React.DOM.div,
      ul = React.DOM.ul,
      li = React.DOM.li,
      span = React.DOM.span,
      italic = React.DOM.i,
      h1 = React.DOM.h1,
      h2 = React.DOM.h2,
      strong = React.DOM.strong;

  DG.React.Components.FunctionBrowser = DG.React.createComponent({
    getInitialState: function () {
      return {
        style: null,
        categories: this.categorize(this.props.functions),
        category: null,
        fn: null
      };
    },

    componentDidMount: function () {
      var containerNode = ReactDOM.findDOMNode(this.props.anchor),
          $containerNode = $(containerNode),
          position = $containerNode.offset();
      this.setState({
        style: {
          position: 'absolute',
          top: position.top + $containerNode.height(),
          left: position.left
        }
      });
    },

    categorize: function (functions) {
      var categoryMap = {},
          categories = [],
          categoryNames;

      Object.keys(functions).forEach(function (fnName) {
        var fn = functions[fnName],
            categoryName = fn.category.loc();
        categoryMap[categoryName] = categoryMap[categoryName] || {};
        categoryMap[categoryName].functionMap = categoryMap[categoryName].functionMap || {};
        categoryMap[categoryName].functionMap[fnName] = fn;
      });

      categoryNames = Object.keys(categoryMap);
      categoryNames.sort();
      categoryNames.forEach(function (categoryName) {
        var functionNames = Object.keys(categoryMap[categoryName].functionMap),
            functions = [];

        functionNames.sort();
        functionNames.forEach(function (functionName) {
          var definition = categoryMap[categoryName].functionMap[functionName],
              argList = [],
              i, maxArgs, requiredArgs, optionalArgs;

          // create the args if not found
          definition.args = definition.args || [];
          if (definition.maxArgs) {
            // 99 is used to signify variable args for string concat and join
            maxArgs = definition.maxArgs == 99 ? 2 : definition.maxArgs;
            for (i = 0; i < maxArgs; i++) {
              if (i == definition.args.length) {
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
            argList.push("[" + optionalArgs + "]");
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
      return div({className: 'react-function-browser-header', onClick: onClick},
        span({dangerouslySetInnerHTML: {__html:'&#x2039; ' + parentName}}),
        itemName
      );
    },

    renderCategoryList: function (categories) {
      var self = this,
          list = categories.map(function (category) {
            var clicked = function () {
              self.setState({category: category});
            };
            return li({key: category.name, onClick: clicked},
              div({dangerouslySetInnerHTML: {__html:'&#x203a;'}}),
              span({}, category.name)
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
              hasInfo ? div({onClick: infoClicked, dangerouslySetInnerHTML: {__html:'&#x1f6c8;'}}) : null,
              span({onClick: fnClicked, title: fn.definition.description},
                fn.name,
                italic({}, '(' + fn.argList + ')')
              )
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
          argItems = fn.definition.args.map(function (arg) {
            return li({key: arg.name},
              arg.name + (arg.description ? ': ' + arg.description : ''),
              ' (',
              italic({}, arg.required ? 'required' : 'optional'),
              ')');
          }),
          examples = (fn.definition.examples || []).map(function (example) {
            return div({}, example);
          }),
          fnClicked = function () {
            self.selectFunction(fn);
          };

      return div({},
        this.renderHeader(category.name, fn.name, function () {
          this.setState({fn: null});
        }.bind(this)),
        div({className: 'react-function-browser-function-info'},
          h1({onClick: fnClicked }, fn.name, italic({}, '(' + fn.argList + ')')),
          fn.definition.description ? div({}, fn.definition.description) : null,
          argItems ? div({},
            h2({}, 'Parameters'),
            ul({}, argItems)
          ) : null,
          examples ? div({},
            h2({}, 'Examples'),
            examples
          ) : null
        )
      );
    },

    render: function () {
      var contents;
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
        return div({className: 'react-function-browser', style: this.state.style}, contents);
      }
      else {
        // must return empty div so it renders and componentDidMount can find it
        return div({});
      }
    }
  }, [DG.React.HighOrderComponents.UnmountOnOutsideClick]);

});

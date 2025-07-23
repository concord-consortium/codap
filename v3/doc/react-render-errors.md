# Errors Thrown while Rendering
React handles errors thrown while rendering components in a complex way.

Here are some of the behaviors:
- if a component throws an error on render, React will try to render it a second time
- in development mode React will actually render the component an extra time for each of the two renders so it will render the component four times total when it throws an error.
- if a React error boundary component is used, this can catch errors thrown while rendering and show a different UI. https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
- some of the errors are still thrown as unhandled errors even with an error boundary
- React modifies console.error and console.warn to include the component tree in the message when these are used inside of a render.

Because React error boundaries require class components, the official React docs recommend using the library `react-error-boundary` so we don't have to create an ErrorBoundary component ourselves.

Additionally we are running CODAP with the Webpack dev server during development. This dev server has an error overlay which is shown when error is thrown that isn't handled by the application.

The combination of all of these behaviors makes it complex to see the same thing a user sees in production when trying to duplicate the problem in development.

Below is what happens in CODAP using the ErrorTesterComponent. This component is enabled by adding the URL parameter `errorTester=[value]`. For the results below a value of `firstDisplay` was used and the `numErrorsThrownOnFirstDisplay` variable in the ErrorTesterComponent was changed.

# Production Mode
In production mode React will automatically re-render a component that throws an error during render. The error boundary handler gets the error from the first render before the component is re-rendered. The error boundary handler's components are not shown unless the main component throws an error a second time. Details below.

## Only one error thrown
The component only throws an error on its first render.

### Order of events
- component is rendered and it throws an error
- the error boundary gets this first render error
- component is rendered again and it doesn't throw an error this time
- the first render error is shown in the console as an uncaught error.

### Visible Behavior
An error dialog is shown because the CODAP window error handler shows it. The main CODAP components are shown underneath the dialog instead of the error boundary component.

## Two errors are thrown
The component throws an error on its first and second render

### Order of events
- component is rendered and it throws an error
- the error boundary gets this first render error
- component is rendered again and it throws another error
- the error boundary gets this second render error
- the second render error is shown in the console as an uncaught error.

### Visible Behavior
An error dialog is shown because the CODAP window error handler shows it. The error boundary components are shown underneath the dialog instead of the main CODAP components.

# Development Mode
In dev mode React re-renders a component four times when it throws an error before giving up. If the component throws less than 4 errors various things are seen.

## One error thrown
If the component only throws an error on its first render

### Order of events
- component is rendered and throws error
- component is rendered
- the error boundary gets the first render error
- component is rendered again
- the first render error is shown in the console


### Visible behavior
The webpack error overlay is shown with the first render error. Closing this overlay shows the CODAP error dialog and beneath it are the main CODAP components. Closing the error dialog, shows the codap components. This does **not** cause the component to be rendered a fourth time.

## Two errors thrown
If the component only throws an error on its first and second render

### Order of events
- component is rendered and throws an error
- component is rendered and throws an error
- the second render error is shown in the console
- the error boundary gets the first render error
- component is rendered and doesn't throw an error this time
- the first render error is shown in the console

### Visible behavior
The webpack error overlay is shown with the first render error. Closing this overlay shows the CODAP error dialog showing the first render error and beneath it are the main CODAP components. Closing the error dialog, shows the codap components. This does not cause the component to be rendered a fourth time.

## Three errors thrown
If the component only throws an error on its first three renders

### Order of events
- component is rendered and throws an error
- component is rendered and throws an error
- the second render error is shown in the console
- the error boundary gets the first render error
- component is rendered and throws an error
- component is rendered and doesn't throw an error
- the error boundary gets the third render error
- react shows an error message in the console saying the error boundary will be used because an error was thrown

### Visible behavior
The CODAP error dialog is shown with the second render error. Beneath this dialog are the error boundary components showing the third render error. Closing the error dialog, shows the error boundary components.

## Four errors thrown

### Order of events
- component is rendered and throws an error
- component is rendered and throws an error
- the second render error is shown in the console
- the error boundary gets the first render error
- component is rendered and throws an error
- component is rendered and throws an error
- the fourth render error is shown in the console
- the error boundary gets the third render error
- react shows an error message in the console saying the error boundary will be used because an error was thrown

### Visible behavior
The CODAP error dialog is shown with the fourth render error. Beneath this dialog is the error boundary components showing the third render error. Closing the error dialog, shows the error boundary components.

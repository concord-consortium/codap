# MST Detached or Destroyed Object Warning

When working with MST you might run into console warnings like this one:

> Error: [mobx-state-tree] You are trying to read or write to an object that is no longer part of a state tree. (Object type: 'Todo', Path upon death: '/todos/0', Subpath: 'name', Action: '/todos/0.removeFirstTodo()'). Either detach nodes first, or don't use objects after removing / replacing them in the tree.

This can happen for a number of reasons. If you look at the stack trace that goes with the warning, sometimes the cause is obvious. Other times the cause is not obvious. For example it might not be clear why some of our code is being called. There might be some top level action and then way up/down the stack is a call to one of our functions and there is no obvious connection between these two.

Below is a strategy for tracking down the cause generally and a solution for one particular cause.

## Tracking down the cause of the error

Hopefully from the message you can figure out the rough area of the code where the problem is happening. If you can pin point the UI action that causes the warning to be printed then you can use the following approach.

In your local code find `setLivelinessChecking` located in `app.tsx` and uncomment it. This will cause these console warnings to actually be thrown errors instead. In many cases these thrown errors will be caught and ignored so after you enable this you probably won't see any messages in the console if you try to duplicate the problem again.

Instead of looking in the console, what you should do is use the dev tools debugger to track it down. Setup the app to just before the error would normally be printed to the console. Then in the debug panel turn on "pause on exceptions" and check the box "pause on caught exceptions". Now trigger the error. The app should pause and you should be in the debugger. In the current version of MST the line it pauses on should be `throw new MstError(error)` inside of a livelinessChecking conditional.

In CODAP there are several caught exceptions that might get in the way of this. These are thrown before the MstError. You can try playing through these quickly until you get the MstError. However if you are working with a plugin, you might run into a communication timeout if you don't play them fast enough. Another approach is to use the Chrome dev tools "Never pause here" feature. If you right click on the line number where it paused you can choose this option from the menu and then when you run the code again it won't stop there even with an exception.

Once you've got the debugger paused at the right place, you can use the Call Stack section to navigate up/down the stack and inspect the state of the MobX internals to figure out why the function was called that is causing the problem.

Below is an example of a call stack stack when there is a destroyed MST object

```js
value                    mobx-state-tree.module.js:1907
value                    mobx-state-tree.module.js:2013
dehanceValue             mobx.esm.js:1390
get                      mobx.esm.js:1447
getObservablePropValue_  mobx.esm.js:4959
get                      mobx.esm.js:5458
get_                     mobx.esm.js:5012
get                      mobx.esm.js:3580
attributeType            data-configurat...n-model.ts:188
// ⬆⬆ This is the actual function that is causing the problem.
// You can tell it is our code by the name of the file.
// Unfortunately the full path to the file is not shown,
// so you'll have to identify it just by the final filename.
// If you click on it, it will open the file at the line with the
// problem. You can click through each item in the stack if you
// can't figure out out which file is ours.
get attrTypes            graph-data-conf...n-model.ts:257
trackDerivedFunction     mobx.esm.js:1902
computeValue_            mobx.esm.js:1653
trackAndCompute          mobx.esm.js:1630
get                      mobx.esm.js:1599
shouldCompute            mobx.esm.js:1836
get                      mobx.esm.js:1594
shouldCompute            mobx.esm.js:1836
get                      mobx.esm.js:1594
shouldCompute            mobx.esm.js:1836
// ⬆⬆ This is where you can try to figure out which reaction is causing
// the computed value to be re-evaluated. On any of these shouldCompute
// calls, you should have access to a variable called `derivation`.
// You can find that variable in the "scope" section of the debugger.
// The "scope" section is typically above the "call stack" section.
// The `name` property of the derivation often gives a hint of the
// reaction. Sometimes there is also a `_name` property that is useful.
// You can also look at the `obs` array to find out what values
// this derivation (reaction) is observing. These values have names
// which usually include the name of the property that was accessed
runReaction_             mobx.esm.js:2456
runReactionsHelper       mobx.esm.js:2655
reactionScheduler        mobx.esm.js:2632
(anonymous)              mobx.esm.js:2665
batchedUpdates$1         react-dom.development.js:26179
...
```

Note as shown above it is often best to look at the last `shouldCompute`. In this case the first `shouldCompute` is a view that is calling `attrTypes`. The next `shouldCompute` is another view that is calling this first one. The final `shouldCompute` is what we are looking for. In this case it was a MobX React observing component. Its `derivation.name` was `observing[ComponentName]`. Looking in that component I could see where it was calling the view identified by the 2nd `shouldCompute`.

## Item destroyed in a list

This is one case that can cause these MST detached or destroyed object warnings. This will happen under these conditions:
- there is `observer` component
- this component is observing a MST model that is destroyed in some cases
- this component is directly or indirectly depending on another observable that changes when the MST model is destroyed

Because MobX React `observer` components use reactions under-the-hood, they will trigger computed value checks for any computed value they access whenever one of these observed computed values changes. This is done by MobX to see if the reaction should be run again. So let’s say you have a component rendering an item in a MST list and it uses a computed value from the item. This computed value accesses some global observable object to get some extra info about the item.

```js
const descriptions = observable({
  one: "description of one",
  two: "description of two"
});

const Item = types.model("Item", {
  name: types.string
})
.views(self => ({
  get nameWithDescription() {
    return `${self.name}: ${descriptions[self.name]}`;
  }
}));

const ItemComponent = observer(function ItemComponent({item})) {
  return <span>{ item.nameWithDescription }</span>
});
```

A working version of this code can be found in `mobx-react-mst.test.tsx`.

If you remove the item from the list by destroying it using `destroy(item)` and at the same time you modify the `descriptions` to clean up the entry for this item, you will see a confusing warning from MST. The change of `descriptions` triggers a `shouldCompute` test of `nameWithDescription`. But at this point the item has been destroyed so the reading of `self.name` will print the detached or destroyed object warning. This is confusing because the item is destroyed so why is `nameWithDescription` being read? On top of this you might see that the `ItemComponent` for the item is never even re-rendered because its parent component is only rendering the remaining children.

Here is what is going on: even though `ItemComponent` isn't re-rendered, the fact that it was rendered once means there is a MobX reaction monitoring `item.nameWithDescription`. `item.nameWithDescription` is accessing `descriptions`. When `descriptions` changes MobX goes up the dependency tree and finds this reaction. It then goes through the reaction's dependencies to see if any of them have actually changed. To tell if a dependency has changed it needs to "evaluate" or compute it. So it actually evaluates `nameWithDescription`. And because the item has been destroyed MST prints a warning about the reading of `self.name`.

If this was a regular MobX reaction (autorun or reaction), you could solve this by telling MST to call the reaction's disposer when the model was destroyed by calling `addDisposer(item, reactionDisposer)`. However MobX React doesn't give you access to the disposer.

Instead you can use MST's `isAlive` function to remove the warning. This works because of an optimization that MobX has when looking at dependencies. Here is what `ItemComponent` should be:

```
const ItemComponent = observer(function ItemComponent({item})) {
  if (!isAlive(item)) {
    console.warn("rendering destroyed item");
  }
  return <span>{ item.nameWithDescription }</span>;
});
```

It turns out that MST's isAlive is observable itself. So the "aliveness" of item is now another dependency of the `ItemComponent` observer reaction. If MobX evaluated all of the dependencies in parallel for changes, this wouldn't fix the problem because `nameWithDescription` would still be evaluated to see if it changed. In reality, MobX evaluates the dependencies in the order that they are referenced, and it stops going through the list if a dependency has changed. It is implemented this way because as soon as MobX sees a change it knows it is has to run the reaction, so there is no reason to keep looking for changes. Because of this optimization, when the "aliveness" of `item` changes, `nameWithDescription` will not be evaluated/computed. If the component actually gets re-rendered there will be a console warning from us to help find the problem, and then a second warning from MST about accessing `nameWithDescription` on a destroyed object. If this happens it is probably some kind of memory leaking error since the parent component should only be rendering `ItemComponent`s for the active items.

Because this kind of isAlive check is generally useful CODAP has a couple of utility functions to help with it:
- `verifyAlive` does the isAlive check and prints a console warning if it fails.
- `isAliveSave` will first check that the object is defined before checking that it is alive

### Alternative destroy soon solution

It is also possible to avoid this warning by first detaching the item from the tree and then destroying it. The initial detach will still cause the `nameWithDescription` to be re-computed but because the item is not destroyed the reading of `name` will still be valid. This alternative approach is demonstrated in `mobx-react-mst.test.tsx`

The potential problem with this approach is any errors or side effects that might happen when the item is detached before it is destroyed. In the case that triggered this whole investigation, the table tile was looking at the shared model manager to figure out the dataset. Since the table tile is no longer part of the tree, its reference gets automatically removed from the entry in the shared model manager. So when the MST view tries to find the shared model a warning is printed because the shared model manager doesn't expect a lookup for a tile that isn't part of the tree. Additionally when it is just detached and the dataSet view is evaluated it returns the importedDataSet. This seems to be harmless, but if something was being done with that imported data set like automatically adding it as a shared model, that would be bad.

If the whole evaluation of view is short circuited using the first approach of an isAlive check, then this avoids these side effects. It does mean we have to add this check to any components that are using models that might be destroyed and where the component is directly or indirectly depending on an observable that changes when the item is destroyed. This extra work seems worth it to prevent harder to find side effects.

### Other Notes

I think the complexity here stems from the fact that MST introduces this "alive" concept. MobX does not have this concept itself. It might be possible to fix the problem within the frameworks, (MST, MobX, and MobX React). I've come up with two viable solutions and a third that probably wouldn't work.

Viable Solution #1:

We add support to MobX itself for this "alive" property of objects. With this in MobX, MobX's `shouldCompute` can find the object of the computedValue function and see if the object is alive before testing the computedValue. If the object isn't alive then it could just return true.

Viable Solution #2:

MST could add isAlive checks around every view function that MST sets up for the model objects.

Probably not Viable Solution:

Adding hooks to MobX React so we could extend it with an isAlive short circuit on the reactions MobX React creates when `observer(...)` is used. The problem is that the reaction might be reacting to multiple objects and at the time `observer(...)` is called it can't figured out what these objects are automatically. Perhaps there is a way to access the list of objects being monitored by MobX for changes, but this list wouldn't be known until after the first render. So the short circuit wouldn't know to call isAlive on these objects until the second time through the render function. This would be too late to actually short circuit in most cases. Instead I'd guess there'd have to be some helper method called during render that is passed the objects that should be checked. To actually implement that helper function we don't need any changes to MobX React it can just be a function that checks each of the passed in objects. CODAP has such a helper function: `verifyAlive`.

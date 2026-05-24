import { parse, isFunctionNode } from "mathjs/number"
import type { MathNode } from "mathjs"
import { IFormulaDependency, ILocalAttributeDependency, isLocalAttributeDependency } from "../formula-types"
import { typedFnRegistry } from "../functions/math"
import { basicCanonicalNameToDependency } from "./name-mapping-utils"
import { isNonFunctionSymbolNode } from "./mathjs-utils"

export const ifSelfReference = (dependency?: IFormulaDependency, formulaAttributeId?: string) =>
  formulaAttributeId && dependency?.type === "localAttribute" && dependency.attrId === formulaAttributeId

// When formulaAttributeId is provided, dependencies will not include self references for functions that allow that.
// In practice, it's only prev() at the moment. Self-reference is sometimes used in V2 to calculate cumulative value.
// defaultArg should be in a canonical form too.
export const getFormulaDependencies = (formulaCanonical: string, formulaAttributeId?: string, defaultArg?: string) => {
  const formulaTree = parse(formulaCanonical)
  interface IExtendedMathNode extends MathNode {
    isDescendantOfAggregateFunc?: boolean
    isSelfReferenceAllowed?: boolean
  }
  const defaultArgNode = defaultArg ? parse(defaultArg) : undefined
  const result: IFormulaDependency[] = []
  const visitNode = (node: IExtendedMathNode, path: string, parent: IExtendedMathNode) => {
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name]?.isAggregate || parent?.isDescendantOfAggregateFunc) {
      node.isDescendantOfAggregateFunc = true
    }
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name]?.isSemiAggregate) {
      // Current semi-aggregate functions usually have the following signature:
      // fn(expression, defaultValue, filter)
      // Symbols used in `expression` and `filter` arguments should be treated as aggregate symbols.
      // In this case, `isSemiAggregate` would be equal to [true, false, true].
      typedFnRegistry[node.fn.name].isSemiAggregate?.forEach((isAggregateArgument, index) => {
        if (node.args[index] && isAggregateArgument) {
          (node.args[index] as IExtendedMathNode).isDescendantOfAggregateFunc = true
        }
      })
    }
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name]?.selfReferenceAllowed) {
      const semiAggregate = typedFnRegistry[node.fn.name].isSemiAggregate
      if (semiAggregate) {
        // Only the row-shifted args (marked aggregate in isSemiAggregate) are cycle-safe.
        // E.g. prev()'s defaultValue is evaluated in the current-case context and is NOT
        // row-shifted, so deps appearing only there should not be treated as cycle-safe.
        semiAggregate.forEach((isAggregateArgument, index) => {
          if (node.args[index] && isAggregateArgument) {
            (node.args[index] as IExtendedMathNode).isSelfReferenceAllowed = true
          }
        })
      } else {
        (node as IExtendedMathNode).isSelfReferenceAllowed = true
      }
    }
    if (parent?.isSelfReferenceAllowed) {
      node.isSelfReferenceAllowed = true
    }
    const isDescendantOfAggregateFunc = !!node.isDescendantOfAggregateFunc
    const isSelfReferenceAllowed = !!node.isSelfReferenceAllowed
    if (isNonFunctionSymbolNode(node, parent)) {
      const dependency = basicCanonicalNameToDependency(node.name)
      if (isLocalAttributeDependency(dependency) && isDescendantOfAggregateFunc) {
        dependency.aggregate = true
      }
      const isSelfReference = ifSelfReference(dependency, formulaAttributeId)
      // Direct self-reference inside prev() (e.g. CumulativeValue = Value + prev(CumulativeValue, 0))
      // is dropped from the dependency list - prev() breaks the row-level cycle, and adding the
      // attribute would create an observer cycle that recalculates the formula from its own output.
      const skipDirectSelfRef = isSelfReference && isSelfReferenceAllowed
      if (dependency && !skipDirectSelfRef) {
        const existing = isLocalAttributeDependency(dependency)
          ? result.find((dep): dep is ILocalAttributeDependency =>
              isLocalAttributeDependency(dep) && dep.attrId === dependency.attrId)
          : undefined
        if (existing) {
          // Merge aggregate flag - if any reference is in an aggregate context, the dep is aggregate.
          if (isLocalAttributeDependency(dependency) && dependency.aggregate) {
            existing.aggregate = true
          }
          // If the same attribute is referenced outside a selfReferenceAllowed function anywhere
          // in the formula, the dependency cannot be treated as cycle-safe.
          if (!isSelfReferenceAllowed) {
            existing.selfReferenceAllowed = false
          }
        } else {
          if (isLocalAttributeDependency(dependency) && isSelfReferenceAllowed) {
            // Cross-attribute reference inside prev() (e.g. sunny = prev(rainy), rainy = prev(sunny)).
            // Keep the dependency so observers fire when the referenced attribute changes, but mark
            // it so the cycle detector ignores it - prev() breaks the row-level cycle.
            dependency.selfReferenceAllowed = true
          }
          result.push(dependency)
        }
      }
    }

    const functionInfo = isFunctionNode(node) && typedFnRegistry[node.fn.name]
    if (functionInfo) {
      // Some functions have special kind of dependencies that need to be calculated in a custom way
      // (eg. lookupByIndex, lookupByKey).
      if (functionInfo.getDependency) {
        const dependency = functionInfo.getDependency(node.args)
        if (dependency) {
          result.push(dependency)
        }
      }
      // When default argument is provided and the function has fewer arguments than required, we need to visit the
      // the default arg node so it can become a dependency.
      if (defaultArgNode && functionInfo.numOfRequiredArguments > node.args.length) {
        visitNode(defaultArgNode, "", node)
      }
    }
  }
  formulaTree.traverse(visitNode)
  return result
}

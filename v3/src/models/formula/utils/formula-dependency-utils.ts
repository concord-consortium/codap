import { parse, MathNode, isFunctionNode } from "mathjs"
import {
  GLOBAL_VALUE, LOCAL_ATTR, IFormulaDependency, isCanonicalName, isNonFunctionSymbolNode, rmCanonicalPrefix
} from "../formula-types"
import { typedFnRegistry } from "../functions/math"

// Currently, canonical names can be "basic": they can refer to local attributes or global values.
// Or they can be custom, like ones used by lookup functions. This helper parses basic canonical names.
export const basicCanonicalNameToDependency = (canonicalName: string): IFormulaDependency | undefined => {
  if (!isCanonicalName(canonicalName)) {
    return undefined
  }
  canonicalName = rmCanonicalPrefix(canonicalName)
  if (canonicalName.startsWith(LOCAL_ATTR)) {
    const attrId = canonicalName.substring(LOCAL_ATTR.length)
    return { type: "localAttribute", attrId }
  }
  if (canonicalName.startsWith(GLOBAL_VALUE)) {
    const globalId = canonicalName.substring(GLOBAL_VALUE.length)
    return { type: "globalValue", globalId }
  }
  return undefined
}

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
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name]?.selfReferenceAllowed || parent?.isSelfReferenceAllowed) {
      node.isSelfReferenceAllowed = true
    }
    const isDescendantOfAggregateFunc = !!node.isDescendantOfAggregateFunc
    const isSelfReferenceAllowed = !!node.isSelfReferenceAllowed
    if (isNonFunctionSymbolNode(node, parent)) {
      const dependency = basicCanonicalNameToDependency(node.name)
      if (dependency?.type === "localAttribute" && isDescendantOfAggregateFunc) {
        dependency.aggregate = true
      }
      const isSelfReference = ifSelfReference(dependency, formulaAttributeId)
      // Note that when self reference is allowed, we should NOT add the attribute to the dependency list.
      // This would create cycle in observers and trigger an error even earlier, when we check for this scenario.
      if (dependency && (!isSelfReference || !isSelfReferenceAllowed)) {
        result.push(dependency)
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

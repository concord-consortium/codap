/*
 * Since types aren't available for the @nedb/binary-search-tree package, we provide our own types here.
 * This only defines types for the limited parts of the package that we use in our code.
 * We also extended the AVLTree to track the longest node in the tree, and to allow prepending values
 * to the node data when inserting.
 */
declare module "@nedb/binary-search-tree" {
  export interface AVLNode {
    key: number
    data: string[]
    left: AVLNode | null
    right: AVLNode | null
    parent: AVLNode | null
    balanceFactor: number
  }
  interface AVLTreeOptions {
    unique?: boolean
    compareKeys?: (a: number, b: number) => number
  }
  export class AVLTree {
    // root node of tree
    tree: AVLNode
    // [CC] longest node of tree
    longest: AVLNode

    constructor(options?: AVLTreeOptions)
    insert(key: number, value: string, prepend?: boolean): void
    delete(key: number, value: string): void
    getNumberOfKeys(): number
    search(key: number): string[] | null
    searchAfter(key: number): string[] | null
    searchBefore(key: number): string[] | null
    searchNearestLte(key: number): string[] | null
    searchNearestGte(key: number): string[] | null
    searchNearest(key: number): string[] | null
    executeOnEveryNode(fn: (node: AVLNode) => void): void
    prettyPrint(printData?: boolean, spacing?: string): void
  }
}

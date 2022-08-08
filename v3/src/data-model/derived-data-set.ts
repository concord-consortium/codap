//   let inFlightActions = 0

  // function derive(name?: string) {
  //   return { id: uniqueId(), sourceID: self.id, name: name || self.name, attributes: [], cases: [] }
  // }

//   function mapBeforeID(srcDataSet: IDataSet, beforeID?: string) {
//     let id: string | undefined = beforeID
//     // find the corresponding case in the derived DataSet
//     while (id && (caseIDMap[id] == null)) {
//       id = srcDataSet.nextCaseID(id)
//     }
//     return id
//   }

  // function mapBeforeIDArg(beforeID?: string | string[]) {
  //   const context: IEnvContext = getEnv(self),
  //         { srcDataSet } = context
  //   if (Array.isArray(beforeID)) {
  //     return beforeID.map((id) => mapBeforeID(srcDataSet, id))
  //   }
  //   else {
  //     return mapBeforeID(srcDataSet, beforeID)
  //   }
  // }

      // get isSynchronizing() {
      //   return inFlightActions > 0
      // },
      // onSynchronized() {
      //   if (inFlightActions <= 0) {
      //     return Promise.resolve(self)
      //   }
      //   return new Promise((resolve, reject) => {
      //     function waitForSync() {
      //       if (inFlightActions <= 0) {
      //         resolve(self)
      //       }
      //       else {
      //         setTimeout(waitForSync)
      //       }
      //     }
      //     waitForSync()
      //   })
      // }

//   function delayApplyActions(actions: ISerializedActionCall[]) {
//     ++inFlightActions
//     setTimeout(() => {
//       if (--inFlightActions <= 0) {
//         applyAction(self, actions)
//       }
//     })
//   }

      // derive(name?: string, derivationSpec?: IDerivationSpec) {
      //   const context = { srcDataSet: self, derivationSpec }
      //   const derived = DataSet.create(derive(name), context)
      //   const attrIDs = derivationSpec?.attributeIDs ||
      //                     self.attributes.map(attr => attr.id),
      //         filter = derivationSpec?.filter
      //   attrIDs.forEach((attrID) => {
      //     const attribute = attrIDMap[attrID]
      //     if (attribute) {
      //       derived.addAttribute(attribute.derive())
      //     }
      //   })
      //   self.cases.forEach((aCaseID) => {
      //     const inCase = getCase(aCaseID.__id__),
      //           outCase = filter && inCase ? filter(attrIDFromName, inCase) : inCase
      //     if (outCase) {
      //       derived.addCases([outCase])
      //     }
      //   })
      //   return derived
      // }

      // afterCreate() {
      //   const context: IEnvContext = getEnv(self),
      //         { srcDataSet, derivationSpec = {} } = context,
      //         { attributeIDs, filter, synchronize } = derivationSpec

      //   // build attrIDMap
      //   self.attributes.forEach(attr => {
      //     attrIDMap[attr.id] = attr
      //     attrNameMap[attr.name] = attr.id
      //   })

      //   // build caseIDMap
      //   self.cases.forEach((aCase, index) => {
      //     caseIDMap[aCase.__id__] = index
      //   })

      //   // set up middleware to add ids to inserted attributes and cases
      //   // adding the ids in middleware makes them available as action arguments
      //   // to derived DataSets.
      //   if (!srcDataSet) {
      //     disposers.addIdsMiddleware = addMiddleware(self, (call, next) => {
      //       if (call.name === "addAttribute") {
      //         const { id = uniqueId(), ...others } = call.args[0] as IAttributeSnapshot
      //         call.args[0] = { id, ...others }
      //       }
      //       else if (call.name === "addCases") {
      //         call.args[0] = (call.args[0] as ICaseCreation[]).map(iCase => {
      //           const { __id__ = newCaseId(), ...others } = iCase
      //           return { __id__, ...others }
      //         })
      //       }
      //       next(call)
      //     })
      //   }

      //   // set up onAction handler to perform synchronization with source
      //   if (srcDataSet && synchronize) {
      //     disposers.srcDataSetOnAction = onAction(srcDataSet, (action) => {
      //       const actions = []
      //       let newAction
      //       switch (action.name) {
      //         case "addAttribute":
      //           // ignore new attributes if we have a subset of attributes
      //           if (!attributeIDs) {
      //             actions.push(action)
      //           }
      //           break
      //         case "addCases": {
      //           const [srcCasesAdded, srcOptions] = action.args as [ICase[], IAddCaseOptions],
      //                 // only add new cases if they pass the filter
      //                 dstCasesToAdd = srcCasesAdded && filter
      //                                   ? srcCasesAdded.filter(filter.bind(null, attrIDFromName))
      //                                   : srcCasesAdded,
      //                 // map beforeIDs from src to dst
      //                 dstBeforeID = srcOptions && mapBeforeIDArg(srcOptions.before),
      //                 // adjust arguments for the updated action
      //                 dstCasesArgs = [dstCasesToAdd, { before: dstBeforeID }]
      //           // only add the new cases if they pass our filter
      //           if (dstCasesToAdd.length) {
      //             newAction = { name: action.name, path: "", args: dstCasesArgs }
      //             actions.push(newAction)
      //           }
      //           break
      //         }
      //         case "setCaseValues": {
      //           const actionCases = action.args?.[0],
      //                 casesToAdd: ICase[] = [],
      //                 beforeIDs: Array<string | undefined> = [],
      //                 casesToRemove: string[] = [],
      //                 casesToUpdate: ICase[] = []
      //           actionCases.forEach((aCase: ICase) => {
      //             const caseID = aCase.__id__
      //             const srcCase = caseID && srcDataSet.getCase(caseID)
      //             if (caseID && srcCase) {
      //               const filteredCase = filter ? filter(attrIDFromName, srcCase) : srcCase,
      //                     wasIncluded = caseIDMap[caseID] != null
      //               // identify cases that now pass the filter after change
      //               if (filteredCase && !wasIncluded) {
      //                 casesToAdd.push(aCase)
      //                 // determine beforeIDs so that cases end up in correct locations
      //                 const srcBeforeID = srcDataSet.nextCaseID(caseID),
      //                       dstBeforeID = mapBeforeID(srcDataSet, srcBeforeID)
      //                 beforeIDs.push(dstBeforeID)
      //               }
      //               // identify cases that no longer pass the filter after change
      //               else if (!filteredCase && wasIncluded) {
      //                 casesToRemove.push(caseID)
      //               }
      //               else if (wasIncluded) {
      //                 casesToUpdate.push(aCase)
      //               }
      //             }
      //           })
      //           // modify existing cases
      //           if (casesToUpdate.length) {
      //             actions.push({ ...action, args: [casesToUpdate] })
      //           }
      //           // add cases that now pass the filter
      //           if (casesToAdd.length) {
      //             actions.push({ name: "addCases", path: "", args: [casesToAdd, { before: beforeIDs }] })
      //           }
      //           // remove cases that no longer pass the filter
      //           if (casesToRemove.length) {
      //             actions.push({ name: "removeCases", path: "", args: [casesToRemove] })
      //           }
      //           break
      //         }
      //         // other actions can be applied as is
      //         default:
      //           actions.push(action)
      //           break
      //       }
      //       if (actions.length) {
      //         delayApplyActions(actions)
      //       }
      //     // attachAfter: if true, listener is called after action has been applied
      //     }, true)
      //   }
      // },

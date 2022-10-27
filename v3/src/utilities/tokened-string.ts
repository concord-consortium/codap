/* This file is a temporary measure until we implement a more robust localized string assembly system */
import enUs from "./translation/lang/en-us.json"

const allLangs = [{langCode: "en-us", lexicon: enUs }],
      localLangIndex = 0

export function getStringWithSwaps(stringKey: string, token: string, replacements: string[]){
  const corpus = allLangs[localLangIndex].lexicon,
        keyToGet = stringKey as string,
        tokenizedStringTemplate = corpus[keyToGet as keyof typeof corpus] as string,
        wordsArr = tokenizedStringTemplate.split(" ")

  let swapIndex = 0
  for (let i = 0; i < wordsArr.length; i++){
    if (wordsArr[i] === token){
      wordsArr[i] = replacements[swapIndex]
      swapIndex++
    }
  }
  return wordsArr.join(" ")
}

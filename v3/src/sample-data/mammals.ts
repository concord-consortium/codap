import { parse } from "papaparse"

export const mammalsCsv =
  "Mammal,Order,LifeSpan,Height,Mass,Sleep,Speed,Habitat,Diet\n" +
  "African Elephant,Proboscidae,70,4,6400,3,40,land,plants\n" +
  "Asian Elephant,Proboscidae,70,3,5000,4,40,land,plants\n" +
  "Big Brown Bat,Chiroptera,19,0.1,0.02,20,40,land,meat\n" +
  "Bottlenose Dolphin,Cetacea,25,3.5,635,5,37,water,meat\n" +
  "Cheetah,Carnivora,14,1.5,50,12,110,land,meat\n" +
  "Chimpanzee,Primate,40,1.5,68,10,,land,both\n" +
  "Domestic Cat,Carnivora,16,0.8,4.5,12,50,land,meat\n" +
  "Donkey,Perissodactyla,40,1.2,187,3,50,land,plants\n" +
  "Giraffe,Artiodactyla,25,5,1100,2,50,land,plants\n" +
  "Gray Wolf,Carnivora,16,1.6,80,13,64,land,meat\n" +
  "Grey Seal,Pinnipedia,30,2.1,275,6,19,both,meat\n" +
  "Ground Squirrel,Rodentia,9,0.3,0.1,15,19,land,both\n" +
  "Horse,Perissodactyla,25,1.5,521,3,69,land,plants\n" +
  "House Mouse,Rodentia,3,0.1,0.03,12,13,land,both\n" +
  "Human,Primate,80,1.9,80,8,45,land,both\n" +
  "Jaguar,Carnivora,20,1.8,115,11,60,land,meat\n" +
  "Killer Whale,Cetacea,50,6.5,4000,,48,water,meat\n" +
  "Lion,Carnivora,15,2.5,250,20,80,land,meat\n" +
  "N. American Opossum,Didelphimorphia,5,0.5,5,19,,land,both\n" +
  "Nine-Banded Armadillo,Xenarthra,10,0.6,7,17,1,land,meat\n" +
  "Owl Monkey,Primate,12,0.4,1,17,,land,both\n" +
  "Patas Monkey,Primate,20,0.9,13,,55,land,both\n" +
  "Pig,Artiodactyla,10,1,192,8,18,land,both\n" +
  "Pronghorn Antelope,Artiodactyla,10,0.9,70,,98,land,plants\n" +
  "Rabbit,Lagomorpha,5,0.5,3,11,56,land,plants\n" +
  "Red Fox,Carnivora,7,0.8,5,10,48,land,both\n" +
  "Spotted Hyena,Carnivora,25,0.9,70,18,64,land,meat"

export function importMammals() {
  const { data } = parse(mammalsCsv, { header: true })
  return data as Array<Record<string, string>>
}

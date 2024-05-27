// import { XMLBuilder, XMLParser } from "fast-xml-parser"
// import MergeXML from "./mergexml"
//
// const parser = new XMLParser({
//   ignoreAttributes: false,
//   allowBooleanAttributes: true,
//   preserveOrder: true,
//   attributeNamePrefix: "",
// })
//
// const builder = new XMLBuilder({
//   format: true,
//   ignoreAttributes: false,
//   suppressBooleanAttributes: false,
//   preserveOrder: true,
//   attributeNamePrefix: "",
//   suppressEmptyNode: true,
// })
//
// export function fromXml<T = any>(contents: string): T {
//   return parser.parse(contents) as T
// }
//
// export function toXml(data: any): string {
//   return builder.build(data) as string
// }
//
// import fs from "node:fs/promises"

import { Builder, Parser } from "xml2js"

const xmlParser = new Parser()

type XmlObject = ReturnType<typeof JSON.parse>

export async function parseXml(data: string): Promise<XmlObject> {
  try {
    return (await xmlParser.parseStringPromise(data)) as XmlObject
  } catch (err) {
    throw new Error(`Error reading/parsing ${file}: ${err}`)
  }
}

export function mergeConfigs(existing: XmlObject, patch: XmlObject): string {
  const mergedResult = { ...existing }
  deepMergeXML(mergedResult, patch)
  return new Builder()
    .buildObject(mergedResult)
    .replace('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n', "")
}

function deepMergeXML(existing: XmlObject, patch: XmlObject, path = "") {
  for (const key in patch) {
    const newPath = path ? `${path}.${key}` : key
    if (existing[key] && Array.isArray(existing[key]) && Array.isArray(patch[key])) {
      // If both are arrays, merge them
      deepMergeXML(existing[key], patch[key], newPath)
    } else if (existing[key] && typeof existing[key] === "object" && typeof patch[key] === "object") {
      if (patch[key].$?.name) {
        // If we're iterating through an array, merge or insert the object
        const toReplaceIdx = (existing as any[]).findIndex(
          (x) => x.$?.name && patch[key].$?.name && x.$.name === patch[key].$.name,
        )
        if (toReplaceIdx !== -1) {
          deepMergeXML(existing[toReplaceIdx], patch[key], newPath)
        } else {
          existing.push(patch[key])
        }
      } else {
        // If both are objects, recursively merge
        deepMergeXML(existing[key], patch[key], newPath)
      }
    } else {
      // Otherwise, assign values from patch to existing
      existing[key] = patch[key]
    }
  }
}

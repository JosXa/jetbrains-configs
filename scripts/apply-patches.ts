// Name: Apply JetBrains IDE config patches

import "@johnlindquist/kit"
import path, { dirname } from "node:path"

import type { Choice } from "@johnlindquist/kit"
import { chooseIde } from "../lib/product-selector"

import { fileURLToPath } from "node:url"
import { promptConfirm } from "../../kit-utils"
import { mergeConfigs, parseXml } from "../lib/xml"

const __dirname = dirname(fileURLToPath(import.meta.url))

const { configPath, productName } = await chooseIde()
const action = await chooseAction()

switch (action) {
  case "apply-patches": {
    await applyPatches(productName, configPath)
    break
  }
  case "browse": {
    open(configPath)
    break
  }
}

async function chooseAction() {
  const choices: Choice<"apply-patches" | "browse">[] = [
    { name: "Apply patches", value: "apply-patches" },
    { name: "Browse", value: "browse" },
  ]
  return await arg({ placeholder: "What would you like to do?" }, choices)
}

async function applyPatches(productName: string, ideConfigPath: string) {
  const patchesDir = path.join(__dirname, "../", "patches", productName.toLowerCase())

  const patchFiles = (await readdir(patchesDir, { recursive: true, withFileTypes: true })).filter((x) => x.isFile())

  const changedFiles: string[] = []
  for (const patchFile of patchFiles) {
    const patchFileAbs = path.join(patchFile.path, patchFile.name)

    const patchRelativePath = path.relative(patchesDir, patchFileAbs)

    const targetFileAbs = path.join(ideConfigPath, patchRelativePath)

    const changed = await applyPatch(targetFileAbs, patchFileAbs)
    changed && changedFiles.push(patchFileAbs)
  }

  if (changedFiles.length > 0) {
    await div(md(`### Changed files: ${changedFiles.join("<br>")}`))
  } else {
    await div(md("Everything up-to-date."))
  }
}

async function applyPatch(targetFile: string, patchFile: string) {
  const patchContents = await readFile(patchFile, { encoding: "utf-8" })

  if (!(await pathExists(targetFile))) {
    const confirm = await promptConfirm(
      `The config file at '${targetFile}' does not exist. Do you want to create it?`,
      "yesno",
    )

    if (confirm) {
      await writeFile(targetFile, patchContents, { encoding: "utf-8" })

      return true
    }

    return false
  }

  const existingContents = await readFile(targetFile, { encoding: "utf-8" })

  const existingXml = await parseXml(existingContents)
  const patchXml = await parseXml(patchContents)

  const merged = mergeConfigs(existingXml, patchXml)

  if (merged !== existingContents) {
    await writeFile(targetFile, merged, { encoding: "utf-8" })
    return true
  }
  return false
}
